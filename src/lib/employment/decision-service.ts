import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  employmentReviewerAuthorityIsCurrent,
  validateEmploymentDisclosure,
  validateEmploymentFinding,
  validateHumanEmploymentDetermination,
  validateIndependentEmploymentReview,
  validateSupportedEmploymentOverride,
  type EmploymentDecisionPolicy,
} from "@/lib/employment/decision-governance";
import { continuousTrustRepository } from "@/src/lib/continuous-trust/repository";
import { signTrustEvent } from "@/src/lib/trust-events/hash";
import {
  TRUST_EVENT_CANONICALIZATION,
  TRUST_EVENT_HASH_ALGORITHM,
  TRUST_EVENT_SCHEMA_VERSION,
  type CanonicalTrustEvent,
} from "@/src/lib/trust-events/types";

type Database = ReturnType<typeof createServiceRoleClient>;
type Row = Record<string, unknown>;

export class EmploymentDecisionError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}

function fail(operation: string, error: unknown): never {
  console.error("Employment decision governance failed safely.", {
    operation,
    code: (error as { code?: string })?.code ?? "UNKNOWN",
  });
  throw new EmploymentDecisionError("Employment governance operation failed safely.", 500, "EMPLOYMENT_GOVERNANCE_UNAVAILABLE");
}

function object(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requireUuid(value: unknown, field: string) {
  const result = text(value);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new EmploymentDecisionError(`${field} must be a UUID.`, 400, "EMPLOYMENT_REFERENCE_INVALID");
  }
  return result;
}

function policyContract(row: Row | null, now: string): EmploymentDecisionPolicy {
  if (!row || row.active !== true || Date.parse(String(row.valid_from)) > Date.parse(now) || (row.valid_until && Date.parse(String(row.valid_until)) <= Date.parse(now))) {
    throw new EmploymentDecisionError("The bound employment policy is not currently valid.", 409, "EMPLOYMENT_POLICY_NOT_CURRENT");
  }
  const employment = object(object(row.rules).employmentDecisionGovernance);
  if (employment.humanReviewRequired !== true || typeof employment.disclosureRequired !== "boolean") {
    throw new EmploymentDecisionError("The active policy lacks explicit employment oversight and disclosure settings.", 409, "EMPLOYMENT_POLICY_INCOMPLETE");
  }
  return {
    policyId: String(row.policy_id),
    policyVersion: String(row.version),
    humanReviewRequired: true,
    disclosureRequired: employment.disclosureRequired,
  };
}

async function loadPolicy(db: Database, enterpriseId: string, policyVersionId: string, now: string) {
  const result = await db.from("trust_policy_versions")
    .select("policy_version_id,policy_id,version,active,valid_from,valid_until,rules,policy_hash")
    .eq("enterprise_id", enterpriseId)
    .eq("policy_version_id", policyVersionId)
    .maybeSingle();
  if (result.error) fail("Policy lookup", result.error);
  const policy = policyContract(result.data as Row | null, now);
  return { policy, row: result.data as Row };
}

async function currentReviewerAuthority(db: Database, enterpriseId: string, reviewerId: string, authorityReference?: string) {
  const result = await db.from("trust_contracts")
    .select("contract_id,contract,subject_id,subject_type,issued_at,expires_at,revocation_state")
    .eq("enterprise_id", enterpriseId)
    .eq("subject_type", "human")
    .eq("subject_id", reviewerId)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) fail("Reviewer authority lookup", result.error);
  const authority = result.data as Row | null;
  const current = employmentReviewerAuthorityIsCurrent(authority, reviewerId, Date.now(), authorityReference);
  if (!current) throw new EmploymentDecisionError("Current, unexpired employment reviewer authority is required.", 403, "EMPLOYMENT_REVIEWER_AUTHORITY_INVALID");
  return { reference: String(authority?.contract_id), row: authority as Row };
}

async function loadCanonicalSource(db: Database, enterpriseId: string, transactionId: string, candidateReference: string) {
  const result = await db.from("canonical_trust_transactions")
    .select("transaction_id,subject_type,subject_id,workflow_id,decision,decision_id,external_state,policy_id,policy_version,evidence_references,evidence_graph_reference,replay_reference,trust_memory_reference")
    .eq("enterprise_id", enterpriseId)
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (result.error) fail("Canonical source lookup", result.error);
  const transaction = result.data as Row | null;
  if (!transaction || String(transaction.subject_id) !== candidateReference.slice("candidate:".length)) {
    throw new EmploymentDecisionError("Canonical source transaction is unavailable for this candidate.", 404, "EMPLOYMENT_SOURCE_NOT_FOUND");
  }
  const references = Array.isArray(transaction.evidence_references)
    ? transaction.evidence_references.map((item) => typeof item === "string" ? item : text(object(item).reference ?? object(item).refId)).filter(Boolean)
    : [];
  const graphId = text(transaction.evidence_graph_reference);
  const replayId = text(transaction.replay_reference);
  const memoryId = text(transaction.trust_memory_reference);
  if (!graphId || !replayId || !memoryId || !references.length) {
    throw new EmploymentDecisionError("Canonical transaction must contain Evidence Graph, Replay, Trust Memory and evidence references.", 409, "EMPLOYMENT_SOURCE_INCOMPLETE");
  }
  const [graph, replay, memory] = await Promise.all([
    db.from("evidence_graph_nodes").select("node_id").eq("enterprise_id", enterpriseId).eq("node_id", graphId).maybeSingle(),
    db.from("trust_replay_sessions").select("id").eq("workspace_id", enterpriseId).eq("canonical_transaction_id", transactionId).eq("id", replayId).maybeSingle(),
    db.from("trust_memory_index").select("memory_id").eq("enterprise_id", enterpriseId).eq("memory_id", memoryId).maybeSingle(),
  ]);
  if (graph.error || replay.error || memory.error) fail("Canonical reference reconciliation", graph.error ?? replay.error ?? memory.error);
  if (!graph.data || !replay.data || !memory.data) {
    throw new EmploymentDecisionError("Canonical Evidence Graph, Replay or Trust Memory reference could not be reconciled.", 409, "EMPLOYMENT_SOURCE_REFERENCE_MISMATCH");
  }
  return {
    transaction,
    evidenceReferences: references,
    receiptReference: `/api/trust/transactions/${transactionId}/receipt`,
    replayReference: replayId,
    trustMemoryReference: memoryId,
    evidenceGraphReference: graphId,
  };
}

async function appendEvent(input: {
  enterpriseId: string;
  actorId: string;
  caseId: string;
  candidateReference: string;
  eventType: string;
  facts: Record<string, unknown>;
  evidenceReferences: string[];
  correlationId: string;
  authorityReference?: string | null;
}) {
  const db = createServiceRoleClient();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const head = await continuousTrustRepository().chainHead(input.enterpriseId);
    const occurredAt = new Date().toISOString();
    const event = signTrustEvent({
      eventId: crypto.randomUUID(),
      enterpriseId: input.enterpriseId,
      schemaVersion: TRUST_EVENT_SCHEMA_VERSION,
      eventType: input.eventType,
      subject: { type: "HUMAN", id: input.candidateReference },
      actor: { type: "USER", id: input.actorId },
      workflow: { type: "WORKFLOW", id: input.caseId },
      session: null,
      authority: input.authorityReference ? { type: "AUTHORITY", id: input.authorityReference } : null,
      provider: {
        key: "cyber_sentinels_employment_governance",
        protocol: "UNSIGNED",
        serverVerified: true,
        eventId: null,
        transactionId: input.correlationId,
        deliveryId: null,
      },
      normalizedFacts: input.facts as CanonicalTrustEvent["normalizedFacts"],
      reasonCodes: [input.eventType.toUpperCase().replaceAll(".", "_")],
      evidenceReferences: [...new Set(input.evidenceReferences)],
      occurredAt,
      receivedAt: occurredAt,
      sequence: head.sequence + 1,
      previousHash: head.eventHash,
      canonicalization: TRUST_EVENT_CANONICALIZATION,
      hashAlgorithm: TRUST_EVENT_HASH_ALGORITHM,
      ordering: { late: false, supersedesEventId: null, providerSequence: null },
    });
    const appended = await db.rpc("append_trust_event_v1", {
      p_event: event,
      p_envelope_id: null,
      p_correlation_id: input.correlationId,
    });
    if (appended.error) fail("Canonical employment event append", appended.error);
    if (appended.data === "APPENDED") return event;
    if (appended.data !== "CHAIN_CONFLICT" || attempt === 4) {
      throw new EmploymentDecisionError("Canonical employment event could not be appended.", 409, "EMPLOYMENT_EVENT_APPEND_CONFLICT");
    }
  }
  throw new EmploymentDecisionError("Employment event contention exceeded the retry limit.", 503, "EMPLOYMENT_EVENT_CONTENTION");
}

async function caseEvents(db: Database, enterpriseId: string, caseId: string) {
  const result = await db.from("trust_events")
    .select("event_id,event_type,normalized_facts,evidence_references,occurred_at,event_hash,sequence")
    .eq("enterprise_id", enterpriseId)
    .eq("workflow_id", caseId)
    .like("event_type", "governance.employment_decision.%")
    .order("sequence", { ascending: true })
    .limit(200);
  if (result.error) fail("Employment case history lookup", result.error);
  const events = (result.data ?? []) as Row[];
  const opened = events.find((event) => event.event_type === "governance.employment_decision.opened");
  if (!opened) throw new EmploymentDecisionError("Employment case was not found.", 404, "EMPLOYMENT_CASE_NOT_FOUND");
  return { events, opened, facts: object(opened.normalized_facts) };
}

export async function recordEmploymentDecision(input: {
  enterpriseId: string;
  actorId: string;
  actorRole: string;
  correlationId: string;
  body: Record<string, unknown>;
}) {
  const db = createServiceRoleClient();
  const action = text(input.body.action).toUpperCase();
  const now = new Date().toISOString();
  if (action === "OPEN") {
    if (!["owner", "admin"].includes(input.actorRole)) throw new EmploymentDecisionError("Only workspace owners or administrators may open an employment case.", 403, "EMPLOYMENT_CASE_OPEN_FORBIDDEN");
    const candidateReference = text(input.body.candidateReference);
    if (!/^candidate:[a-z0-9][a-z0-9._:-]{1,120}$/i.test(candidateReference)) {
      throw new EmploymentDecisionError("Use an opaque candidate reference; personal identifiers are not accepted.", 400, "EMPLOYMENT_CANDIDATE_REFERENCE_INVALID");
    }
    const transactionId = requireUuid(input.body.canonicalTransactionId, "canonicalTransactionId");
    const policyVersionId = requireUuid(input.body.policyVersionId, "policyVersionId");
    const [source, policy] = await Promise.all([
      loadCanonicalSource(db, input.enterpriseId, transactionId, candidateReference),
      loadPolicy(db, input.enterpriseId, policyVersionId, now),
    ]);
    const finding = validateEmploymentFinding(object(input.body.finding));
    if (finding.evidenceReferences.some((reference) => !source.evidenceReferences.includes(reference))) {
      throw new EmploymentDecisionError("Original finding evidence must be present in the canonical transaction.", 409, "EMPLOYMENT_FINDING_EVIDENCE_UNLINKED");
    }
    if (!source.evidenceReferences.includes(finding.provenanceReference)) {
      throw new EmploymentDecisionError("Model provenance must be linked to the canonical source evidence.", 409, "EMPLOYMENT_MODEL_PROVENANCE_UNLINKED");
    }
    const caseId = crypto.randomUUID();
    const evidenceReferences = [
      ...finding.evidenceReferences,
      `transaction:${transactionId}`,
      `receipt:${source.receiptReference}`,
      `replay:${source.replayReference}`,
      `trust-memory:${source.trustMemoryReference}`,
      `evidence-graph:${source.evidenceGraphReference}`,
      `policy:${String(policy.row.policy_id)}:${String(policy.row.version)}`,
      `model-provenance:${finding.provenanceReference}`,
    ];
    const event = await appendEvent({
      enterpriseId: input.enterpriseId,
      actorId: input.actorId,
      caseId,
      candidateReference,
      eventType: "governance.employment_decision.opened",
      facts: {
        caseId,
        candidateReference,
        caseCreatorId: input.actorId,
        sourceTransactionId: transactionId,
        sourceSystemDecision: String(source.transaction.decision),
        sourceExternalState: String(source.transaction.external_state),
        policyVersionId,
        policyId: policy.policy.policyId,
        policyVersion: policy.policy.policyVersion,
        policyHash: String(policy.row.policy_hash),
        humanReviewRequired: policy.policy.humanReviewRequired,
        disclosureRequired: policy.policy.disclosureRequired,
        finding,
        sourceReferences: {
          receipt: source.receiptReference,
          replay: source.replayReference,
          trustMemory: source.trustMemoryReference,
          evidenceGraph: source.evidenceGraphReference,
        },
      },
      evidenceReferences,
      correlationId: input.correlationId,
    });
    return { caseId, eventId: event.eventId, state: "AI_FINDING_RECORDED_HUMAN_DETERMINATION_PENDING" };
  }

  const caseId = requireUuid(input.body.caseId, "caseId");
  const { events, facts: opened } = await caseEvents(db, input.enterpriseId, caseId);
  const candidateReference = String(opened.candidateReference);
  const caseCreatorId = String(opened.caseCreatorId);
  const sourceReferences = object(opened.sourceReferences);
  const originalEvidence = Array.isArray(object(opened.finding).evidenceReferences) ? object(opened.finding).evidenceReferences as string[] : [];
  const policyVersionId = requireUuid(opened.policyVersionId, "stored policyVersionId");
  const { policy } = await loadPolicy(db, input.enterpriseId, policyVersionId, now);
  const eventReferences = [
    ...originalEvidence,
    `transaction:${String(opened.sourceTransactionId)}`,
    `receipt:${String(sourceReferences.receipt)}`,
    `replay:${String(sourceReferences.replay)}`,
    `trust-memory:${String(sourceReferences.trustMemory)}`,
    `evidence-graph:${String(sourceReferences.evidenceGraph)}`,
    `policy:${policy.policyId}:${policy.policyVersion}`,
  ];

  if (action === "ASSIGN_REVIEWER") {
    if (!["owner", "admin"].includes(input.actorRole)) throw new EmploymentDecisionError("Only workspace owners or administrators may assign an employment reviewer.", 403, "EMPLOYMENT_REVIEW_ASSIGNMENT_FORBIDDEN");
    const reviewerId = requireUuid(input.body.reviewerId, "reviewerId");
    if (reviewerId === caseCreatorId) throw new EmploymentDecisionError("The case creator cannot be assigned as its independent reviewer.", 409, "EMPLOYMENT_REVIEW_SELF_ASSIGNMENT");
    const authority = await currentReviewerAuthority(db, input.enterpriseId, reviewerId);
    const event = await appendEvent({ enterpriseId: input.enterpriseId, actorId: input.actorId, caseId, candidateReference, eventType: "governance.employment_decision.reviewer_assigned", facts: { caseId, assignedReviewerId: reviewerId, assignedBy: input.actorId, authorityReference: authority.reference }, evidenceReferences: [...eventReferences, `authority:${authority.reference}`], correlationId: input.correlationId, authorityReference: authority.reference });
    return { caseId, eventId: event.eventId, state: "AUTHORIZED_REVIEWER_ASSIGNED" };
  }

  if (["REVIEW", "OVERRIDE", "DETERMINE"].includes(action) && !["owner", "admin", "reviewer"].includes(input.actorRole)) {
    throw new EmploymentDecisionError("An authorized workspace reviewer is required.", 403, "EMPLOYMENT_REVIEW_ROLE_REQUIRED");
  }

  if (action === "REVIEW") {
    const assignment = [...events].reverse().find((event) => event.event_type === "governance.employment_decision.reviewer_assigned");
    const assignmentFacts = object(assignment?.normalized_facts);
    if (!assignment || String(assignmentFacts.assignedReviewerId) !== input.actorId) {
      throw new EmploymentDecisionError("Only the explicitly assigned reviewer may complete this review.", 403, "EMPLOYMENT_REVIEWER_NOT_ASSIGNED");
    }
    const authority = await currentReviewerAuthority(db, input.enterpriseId, input.actorId, String(assignmentFacts.authorityReference));
    const review = validateIndependentEmploymentReview(input.body, {
      reviewerId: input.actorId,
      caseCreatorId,
      authorityCurrent: true,
      policy,
    });
    if (review.reviewedEvidenceReferences.some((reference) => !originalEvidence.includes(reference))) {
      throw new EmploymentDecisionError("Reviewed evidence must be linked to the original finding.", 409, "EMPLOYMENT_REVIEW_EVIDENCE_UNLINKED");
    }
    const event = await appendEvent({ enterpriseId: input.enterpriseId, actorId: input.actorId, caseId, candidateReference, eventType: "governance.employment_decision.human_reviewed", facts: { caseId, reviewerId: input.actorId, authorityReference: authority.reference, rationale: review.rationale, actions: review.actions, reviewedEvidenceReferences: review.reviewedEvidenceReferences, independenceLimitations: ["The record captures reviewer actions and rationale; it cannot conclusively prove independence of judgment."] }, evidenceReferences: [...eventReferences, ...review.reviewedEvidenceReferences, `authority:${authority.reference}`], correlationId: input.correlationId, authorityReference: authority.reference });
    return { caseId, eventId: event.eventId, state: "HUMAN_REVIEW_RECORDED" };
  }

  if (action === "CHALLENGE") {
    const challenge = validateSupportedEmploymentOverride(input.body, originalEvidence);
    const event = await appendEvent({ enterpriseId: input.enterpriseId, actorId: input.actorId, caseId, candidateReference, eventType: "governance.employment_decision.challenged", facts: { caseId, challenge: challenge.rationale, challengedBy: input.actorId, newEvidenceReferences: challenge.evidenceReferences }, evidenceReferences: [...eventReferences, ...challenge.evidenceReferences], correlationId: input.correlationId });
    return { caseId, eventId: event.eventId, state: "CHALLENGE_RECORDED" };
  }

  if (action === "OVERRIDE") {
    const previousReview = [...events].reverse().find((event) => event.event_type === "governance.employment_decision.human_reviewed");
    const previousReviewFacts = object(previousReview?.normalized_facts);
    if (!previousReview || String(previousReviewFacts.reviewerId) !== input.actorId) {
      throw new EmploymentDecisionError("Only the assigned reviewer may record a supported override after review.", 403, "EMPLOYMENT_OVERRIDE_REVIEW_REQUIRED");
    }
    const authority = await currentReviewerAuthority(db, input.enterpriseId, input.actorId, String(previousReviewFacts.authorityReference));
    const override = validateSupportedEmploymentOverride(input.body, originalEvidence);
    const event = await appendEvent({ enterpriseId: input.enterpriseId, actorId: input.actorId, caseId, candidateReference, eventType: "governance.employment_decision.overridden", facts: { caseId, override: override.rationale, overriddenBy: input.actorId, authorityReference: authority.reference, newEvidenceReferences: override.evidenceReferences }, evidenceReferences: [...eventReferences, ...override.evidenceReferences, `authority:${authority.reference}`], correlationId: input.correlationId, authorityReference: authority.reference });
    return { caseId, eventId: event.eventId, state: "OVERRIDE_RECORDED" };
  }

  if (action === "REQUEST_POLICY_EXCEPTION") {
    if (!["owner", "admin"].includes(input.actorRole)) throw new EmploymentDecisionError("Only workspace owners or administrators may request a policy exception.", 403, "EMPLOYMENT_POLICY_EXCEPTION_FORBIDDEN");
    const reason = text(input.body.reason);
    if (reason.length < 40 || reason.length > 4000) throw new EmploymentDecisionError("A substantive policy-exception rationale is required.", 400, "EMPLOYMENT_POLICY_EXCEPTION_REASON_REQUIRED");
    const references = Array.isArray(input.body.evidenceReferences) ? input.body.evidenceReferences.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean) : [];
    if (!references.length || references.length > 100) throw new EmploymentDecisionError("Policy exceptions require linked evidence references.", 400, "EMPLOYMENT_POLICY_EXCEPTION_EVIDENCE_REQUIRED");
    const event = await appendEvent({ enterpriseId: input.enterpriseId, actorId: input.actorId, caseId, candidateReference, eventType: "governance.employment_decision.policy_exception_requested", facts: { caseId, status: "PENDING_NOT_EFFECTIVE", reason, requestedBy: input.actorId, exceptionScope: text(input.body.exceptionScope) }, evidenceReferences: [...eventReferences, ...references], correlationId: input.correlationId });
    return { caseId, eventId: event.eventId, state: "POLICY_EXCEPTION_PENDING_NOT_EFFECTIVE" };
  }

  if (action === "DETERMINE") {
    const latestReview = [...events].reverse().find((event) => event.event_type === "governance.employment_decision.human_reviewed");
    if (!latestReview) throw new EmploymentDecisionError("A completed independent human review is required before determination.", 409, "EMPLOYMENT_REVIEW_REQUIRED");
    const authority = await currentReviewerAuthority(db, input.enterpriseId, input.actorId);
    const reviewFacts = object(latestReview.normalized_facts);
    const review = {
      reviewerId: String(reviewFacts.reviewerId),
      authorityReference: String(reviewFacts.authorityReference),
      rationale: String(reviewFacts.rationale),
      actions: Array.isArray(reviewFacts.actions) ? reviewFacts.actions.map(String) : [],
      reviewedEvidenceReferences: Array.isArray(reviewFacts.reviewedEvidenceReferences) ? reviewFacts.reviewedEvidenceReferences.map(String) : [],
    };
    await currentReviewerAuthority(db, input.enterpriseId, review.reviewerId, review.authorityReference);
    const determination = validateHumanEmploymentDetermination(input.body, { actorId: input.actorId, caseCreatorId, review, policy });
    const event = await appendEvent({ enterpriseId: input.enterpriseId, actorId: input.actorId, caseId, candidateReference, eventType: "governance.employment_decision.determined", facts: { caseId, ...determination, reviewerId: review.reviewerId, reviewerAuthorityReference: review.authorityReference, finalAuthorityReference: authority.reference }, evidenceReferences: [...eventReferences, ...determination.evidenceReferences, `authority:${authority.reference}`, `authority:${review.authorityReference}`], correlationId: input.correlationId, authorityReference: authority.reference });
    return { caseId, eventId: event.eventId, state: "HUMAN_DETERMINATION_RECORDED" };
  }

  if (action === "DISCLOSE") {
    const determined = events.some((event) => event.event_type === "governance.employment_decision.determined");
    if (!determined) throw new EmploymentDecisionError("Disclosure evidence must follow a recorded human determination.", 409, "EMPLOYMENT_DETERMINATION_REQUIRED");
    const disclosure = validateEmploymentDisclosure(input.body, policy);
    const receiptId = requireUuid(disclosure.deliveryEvidenceReference, "deliveryEvidenceReference");
    const delivery = await db.from("verification_receipts")
      .select("id,workspace_id,receipt_type,verification_status,evidence_snapshot")
      .eq("workspace_id", input.enterpriseId)
      .eq("id", receiptId)
      .maybeSingle();
    if (delivery.error) fail("Disclosure delivery evidence lookup", delivery.error);
    const deliveryRow = delivery.data as Row | null;
    const deliveryFacts = object(deliveryRow?.evidence_snapshot);
    const recordedAt = Date.parse(String(deliveryFacts.transmittedAt ?? deliveryFacts.transmitted_at ?? ""));
    const status = String(deliveryRow?.verification_status ?? "").toLowerCase();
    if (!deliveryRow
      || disclosure.recipientReference !== candidateReference
      || deliveryRow.receipt_type !== "employment_disclosure_delivery"
      || !["delivered", "acknowledged", "verified"].includes(status)
      || String(deliveryFacts.contentVersion ?? deliveryFacts.content_version ?? "") !== disclosure.contentVersion
      || String(deliveryFacts.contentHash ?? deliveryFacts.content_hash ?? "") !== disclosure.contentHash
      || String(deliveryFacts.recipientReference ?? deliveryFacts.recipient_reference ?? "") !== disclosure.recipientReference
      || !Number.isFinite(recordedAt)
      || recordedAt !== Date.parse(disclosure.transmittedAt)) {
      throw new EmploymentDecisionError("Disclosure delivery receipt does not match the recorded notice.", 409, "EMPLOYMENT_DISCLOSURE_RECEIPT_INVALID");
    }
    const event = await appendEvent({ enterpriseId: input.enterpriseId, actorId: input.actorId, caseId, candidateReference, eventType: "governance.employment_decision.disclosed", facts: { caseId, disclosure, deliveredBy: input.actorId }, evidenceReferences: [...eventReferences, `disclosure:${disclosure.contentVersion}:${disclosure.contentHash}`, `delivery:${disclosure.deliveryEvidenceReference}`], correlationId: input.correlationId });
    return { caseId, eventId: event.eventId, state: "DISCLOSURE_EVIDENCE_RECORDED" };
  }

  throw new EmploymentDecisionError("action is not supported.", 400, "EMPLOYMENT_ACTION_INVALID");
}

export async function listEmploymentDecisionEvents(enterpriseId?: string) {
  const db = createServiceRoleClient();
  let query = db.from("trust_events")
    .select("enterprise_id,event_id,event_type,workflow_id,subject_id,normalized_facts,evidence_references,occurred_at,sequence,event_hash,previous_hash,canonical_event")
    .like("event_type", "governance.employment_decision.%")
    .order("received_at", { ascending: false })
    .limit(500);
  if (enterpriseId) query = query.eq("enterprise_id", enterpriseId);
  const result = await query;
  if (result.error) fail("Employment governance listing", result.error);
  return result.data ?? [];
}