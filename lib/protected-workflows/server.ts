import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createCanonicalTrustTransactionDependencies } from "@/lib/trust-transaction/server";
import { executeCanonicalTrustTransaction, type CanonicalTrustTransactionDependencies, type StoredProviderEvidence } from "@/src/lib/trust-transaction/canonical";
import { hashCanonical } from "@/src/lib/trust-core/hash";
import {
  aiAssistancePolicies,
  assertWorkflowMutable,
  canTransitionWorkflow,
  evaluateAiAssistance,
  interventionForDecision,
  parseWorkflowEvidence,
  protectedWorkflowTypes,
  rejectCallerAuthoritativeClaims,
  statusForIntervention,
  workflowEvidenceResult,
  workflowInterventions,
  type AiAssistancePolicy,
  type ProtectedWorkflowStatus,
  type WorkflowEvidenceInput,
  type WorkflowIntervention,
} from "@/src/lib/protected-workflows/model";

type Row = Record<string, any>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reference = /^[A-Za-z0-9_.:@/+-]{1,180}$/;

export class ProtectedWorkflowError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); this.name = "ProtectedWorkflowError"; }
}

function persistenceFailure(operation: string, error: unknown): never {
  console.error("Protected workflow persistence failed safely.", { operation, code: (error as { code?: string })?.code ?? "UNKNOWN" });
  throw new ProtectedWorkflowError(`${operation} failed safely.`, 503, "PROTECTED_WORKFLOW_PERSISTENCE_FAILED");
}

function bodyObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProtectedWorkflowError("A JSON object is required.", 400, "INPUT_INVALID");
  rejectCallerAuthoritativeClaims(value);
  return value as Record<string, unknown>;
}

function bounded(value: unknown, field: string, maximum = 180) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > maximum || !reference.test(result)) throw new ProtectedWorkflowError(`${field} is invalid.`, 400, "REFERENCE_INVALID");
  return result;
}

function metadata(value: unknown) {
  const result = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  if (JSON.stringify(result).length > 16_000) throw new ProtectedWorkflowError("metadata is too large.", 413, "METADATA_TOO_LARGE");
  return result;
}

function aiPolicy(row: Row): AiAssistancePolicy {
  const value = String((row.metadata as Row | null)?.aiAssistancePolicy ?? "restricted");
  return aiAssistancePolicies.includes(value as AiAssistancePolicy) ? value as AiAssistancePolicy : "restricted";
}

function withoutConfidence(evidence: WorkflowEvidenceInput) {
  const result = { ...evidence };
  delete result.confidence;
  return result;
}

async function consent(db: SupabaseClient, workspaceId: string, consentReference: string) {
  if (!uuid.test(consentReference)) throw new ProtectedWorkflowError("consentReference is invalid.", 400, "CONSENT_REFERENCE_INVALID");
  const result = await db.from("consent_receipts").select("receipt_id,enterprise_id,policy_version,consent_action,occurred_at,expires_at,evidence_object_id").eq("enterprise_id", workspaceId).eq("receipt_id", consentReference).maybeSingle();
  if (result.error) persistenceFailure("Consent resolution", result.error);
  if (!result.data || ["WITHDRAW", "REJECT_OPTIONAL"].includes(String(result.data.consent_action)) || (result.data.expires_at && Date.parse(String(result.data.expires_at)) <= Date.now())) {
    throw new ProtectedWorkflowError("Current monitoring consent was not found in this workspace.", 409, "MONITORING_CONSENT_REQUIRED");
  }
  return result.data as Row;
}

async function workflow(db: SupabaseClient, workspaceId: string, workflowId: string) {
  if (!uuid.test(workflowId)) throw new ProtectedWorkflowError("Workflow reference is invalid.", 400, "WORKFLOW_REFERENCE_INVALID");
  const result = await db.from("protected_workflows").select("*").eq("workspace_id", workspaceId).eq("id", workflowId).maybeSingle();
  if (result.error) persistenceFailure("Protected workflow resolution", result.error);
  if (!result.data) throw new ProtectedWorkflowError("Protected workflow was not found in this workspace.", 404, "PROTECTED_WORKFLOW_NOT_FOUND");
  return result.data as Row;
}

async function appendReplay(db: SupabaseClient, row: Row, actorId: string, eventType: string, correlationId: string, transactionId?: string | null) {
  const result = await db.from("trust_replay_sessions").insert({
    subject_type: "protected_workflow",
    subject_id: row.id,
    replay_summary: JSON.stringify({ eventType, workflowId: row.id, transactionId: transactionId ?? null }),
    generated_by: eventType,
    workspace_id: row.workspace_id,
    owner_user_id: actorId,
    correlation_id: correlationId,
  }).select("id,created_at").single();
  if (result.error) persistenceFailure("Replay append", result.error);
  return result.data as Row;
}

function replayEventForIntervention(intervention: WorkflowIntervention) {
  return ({ CHALLENGE: "CHALLENGE_REQUIRED", STEP_UP_VERIFY: "STEP_UP_STARTED", PAUSE: "PAUSED", BLOCK: "BLOCKED", RESUME: "RESUMED", TERMINATE: "WORKFLOW_COMPLETED" } as Partial<Record<WorkflowIntervention, string>>)[intervention] ?? intervention;
}

async function canonicalSubject(db: SupabaseClient, workspaceId: string, entityId: string) {
  const entity = await db.from("operational_entities").select("entity_id,canonical_trust_object_id,lifecycle_state").eq("enterprise_id", workspaceId).eq("entity_id", entityId).maybeSingle();
  if (entity.error) persistenceFailure("Operational Entity resolution", entity.error);
  if (!entity.data) throw new ProtectedWorkflowError("The subject Operational Entity is unknown in this workspace.", 404, "OPERATIONAL_ENTITY_NOT_FOUND");
  const object = await db.from("enterprise_trust_objects").select("subject_type,subject_id").eq("enterprise_id", workspaceId).eq("subject_id", entity.data.canonical_trust_object_id).maybeSingle();
  if (object.error) persistenceFailure("Canonical Trust Object resolution", object.error);
  if (!object.data) throw new ProtectedWorkflowError("The Operational Entity has no canonical Trust Object.", 409, "CANONICAL_TRUST_OBJECT_REQUIRED");
  return { entity: entity.data as Row, trustObject: object.data as Row };
}

async function canonicalPolicy(db: SupabaseClient, workspaceId: string, subjectType: string, subjectId: string) {
  const contract = await db.from("trust_contracts").select("contract").eq("enterprise_id", workspaceId).eq("subject_type", subjectType).eq("subject_id", subjectId).order("issued_at", { ascending: false }).limit(1).maybeSingle();
  if (contract.error) persistenceFailure("Trust Contract policy resolution", contract.error);
  const value = contract.data?.contract as Row | null;
  if (!value?.policyId || !value?.policyVersion) throw new ProtectedWorkflowError("An active canonical Trust Contract is required.", 409, "AUTHORITY_NOT_FOUND");
  return `${value.policyId}:${value.policyVersion}`;
}

export function protectedWorkflowService(input: { supabase: SupabaseClient; user: User; workspaceId: string }) {
  const db = createServiceRoleClient();
  const actorId = input.user.id;
  return {
    async create(raw: unknown) {
      const body = bodyObject(raw);
      const workflowType = String(body.workflowType ?? body.workflow_type);
      if (!protectedWorkflowTypes.includes(workflowType as any)) throw new ProtectedWorkflowError("workflowType is invalid.", 400, "WORKFLOW_TYPE_INVALID");
      const subjectEntityId = bounded(body.subjectEntityId ?? body.subject_entity_id, "subjectEntityId");
      const subject = await canonicalSubject(db, input.workspaceId, subjectEntityId);
      const policyReference = await canonicalPolicy(db, input.workspaceId, String(subject.trustObject.subject_type), String(subject.trustObject.subject_id));
      if (body.policyReference && body.policyReference !== policyReference) throw new ProtectedWorkflowError("policyReference must match the canonical Trust Contract.", 409, "POLICY_REFERENCE_MISMATCH");
      const details = metadata(body.metadata);
      const configuredAiPolicy = String(details.aiAssistancePolicy ?? "restricted");
      if (!aiAssistancePolicies.includes(configuredAiPolicy as AiAssistancePolicy)) throw new ProtectedWorkflowError("AI-assistance policy is invalid.", 400, "AI_POLICY_INVALID");
      const consentReference = body.consentReference ? String(body.consentReference) : null;
      if (consentReference) await consent(db, input.workspaceId, consentReference);
      const now = new Date().toISOString();
      const created = await db.from("protected_workflows").insert({
        workspace_id: input.workspaceId,
        workflow_type: workflowType,
        subject_entity_id: subjectEntityId,
        policy_reference: policyReference,
        consent_reference: consentReference,
        status: consentReference ? "active" : "created",
        started_at: consentReference ? now : null,
        last_activity_at: now,
        metadata: { ...details, aiAssistancePolicy: configuredAiPolicy },
        created_by: actorId,
      }).select("*").single();
      if (created.error) persistenceFailure("Protected workflow creation", created.error);
      const correlationId = crypto.randomUUID();
      await appendReplay(db, created.data as Row, actorId, "WORKFLOW_STARTED", correlationId);
      if (consentReference) await appendReplay(db, created.data as Row, actorId, "CONSENT_CONFIRMED", correlationId);
      return created.data;
    },

    async addEvidence(workflowId: string, raw: unknown) {
      const row = await workflow(db, input.workspaceId, workflowId);
      assertWorkflowMutable(String(row.status) as ProtectedWorkflowStatus);
      let evidence: WorkflowEvidenceInput;
      try { evidence = parseWorkflowEvidence(raw); } catch (error) { throw new ProtectedWorkflowError(error instanceof Error ? error.message : "Evidence is invalid.", 400, "EVIDENCE_INVALID"); }
      let consentReference = row.consent_reference ? String(row.consent_reference) : null;
      if (evidence.category === "manual_review") {
        const reviewId = String(evidence.metadata?.reviewId ?? "");
        if (!uuid.test(reviewId)) throw new ProtectedWorkflowError("A canonical governance review reference is required.", 400, "MANUAL_REVIEW_REFERENCE_REQUIRED");
        const review = await db.from("trust_manual_reviews").select("id,entity_id,status,assigned_to,decision,decision_reason,completed_at").eq("tenant_id", input.workspaceId).eq("entity_id", row.subject_entity_id).eq("id", reviewId).maybeSingle();
        if (review.error) persistenceFailure("Governance review resolution", review.error);
        if (!review.data || !["APPROVED", "REJECTED"].includes(String(review.data.status)) || !review.data.completed_at) throw new ProtectedWorkflowError("The governance review is not complete for this workflow subject.", 409, "MANUAL_REVIEW_INCOMPLETE");
        const reviewEvidence = withoutConfidence(evidence);
        evidence = { ...reviewEvidence, source: "governance_review", sourceParty: "cyber_sentinels", observedAt: String(review.data.completed_at), classification: String(review.data.decision ?? review.data.status).toLowerCase(), severity: "informational", metadata: { reviewId: review.data.id, reviewer: review.data.assigned_to, decision: review.data.decision, reasonEvidence: review.data.decision_reason } };
      }
      if (evidence.category === "consent") {
        const requested = String(evidence.metadata?.consentReference ?? "");
        const receipt = await consent(db, input.workspaceId, requested);
        consentReference = requested;
        const consentEvidence = withoutConfidence(evidence);
        evidence = { ...consentEvidence, source: "consent_manager", sourceParty: "cyber_sentinels", observedAt: String(receipt.occurred_at), classification: "confirmed", severity: "informational", metadata: { consentReference: receipt.receipt_id, policyVersion: receipt.policy_version, action: receipt.consent_action } };
      } else if (!consentReference) {
        throw new ProtectedWorkflowError("Consent must be confirmed before monitoring evidence is accepted.", 409, "MONITORING_CONSENT_REQUIRED");
      }
      const evidenceId = crypto.randomUUID();
      const correlationId = crypto.randomUUID();
      const facts = { category: evidence.category, evidenceType: evidence.evidenceType ?? null, source: evidence.source, sourceParty: evidence.sourceParty, confidence: evidence.confidence ?? null, classification: evidence.classification, severity: evidence.severity, workflowId, metadata: evidence.metadata };
      const digest = hashCanonical(facts);
      const stored = await db.from("evidence_objects").insert({
        id: evidenceId,
        evidence_id: evidenceId,
        enterprise_id: input.workspaceId,
        provider_key: evidence.source,
        evidence_classification: "observed",
        storage_boundary: "NORMALIZED_LEDGER",
        object_reference: `protected-workflow:${workflowId}:${evidenceId}`,
        normalized_facts: facts,
        occurred_at: evidence.observedAt,
        domain_key: evidence.category === "consent" ? "CONSENT" : "WORKFLOW",
        subject_id: row.subject_entity_id,
        subject_type: "OPERATIONAL_ENTITY",
        evidence_type: evidence.evidenceType ? `TRACK_BLOCK_${evidence.evidenceType.toUpperCase()}` : `TRACK_BLOCK_${evidence.category.toUpperCase()}`,
        source_type: "PROTECTED_WORKFLOW_SIGNAL",
        source_key: evidence.source,
        result: workflowEvidenceResult(evidence),
        assurance_level: evidence.confidence === undefined ? "NONE" : evidence.confidence >= 0.9 ? "HIGH" : evidence.confidence >= 0.7 ? "MEDIUM" : "LOW",
        cryptographically_verified: false,
        server_verified: true,
        observed_at: evidence.observedAt,
        received_at: new Date().toISOString(),
        freshness_policy_seconds: 86_400,
        payload_hash: digest,
        canonicalization: "JCS",
        hash_algorithm: "SHA-256",
        reason_codes: [`TRACK_BLOCK_${evidence.category.toUpperCase()}_OBSERVED`],
      }).select("evidence_id,occurred_at,received_at,payload_hash,result").single();
      if (stored.error) persistenceFailure("Canonical Evidence append", stored.error);
      const workflowNode = await db.from("evidence_graph_nodes").upsert({ enterprise_id: input.workspaceId, node_type: "PROTECTED_WORKFLOW", external_id: workflowId, domain_key: "WORKFLOW", label: `Protected workflow ${workflowId}`, correlation_id: correlationId }, { onConflict: "enterprise_id,node_type,external_id" }).select("node_id").single();
      const evidenceNode = await db.from("evidence_graph_nodes").upsert({ enterprise_id: input.workspaceId, node_type: "EVIDENCE", external_id: evidenceId, domain_key: "WORKFLOW", label: evidence.category, correlation_id: correlationId }, { onConflict: "enterprise_id,node_type,external_id" }).select("node_id").single();
      if (workflowNode.error || evidenceNode.error) persistenceFailure("Evidence Graph node extension", workflowNode.error ?? evidenceNode.error);
      const edge = await db.from("evidence_graph_edges").insert({ enterprise_id: input.workspaceId, from_node_id: evidenceNode.data.node_id, to_node_id: workflowNode.data.node_id, edge_type: "APPLIES_TO", evidence_id: evidenceId, correlation_id: correlationId });
      if (edge.error && edge.error.code !== "23505") persistenceFailure("Evidence Graph edge extension", edge.error);
      const link = await db.from("trust_references").insert({ enterprise_id: input.workspaceId, source_type: "PROTECTED_WORKFLOW_EVIDENCE", source_id: evidenceId, ref_type: "PROTECTED_WORKFLOW", ref_id: workflowId, ref_version: "1.0" });
      if (link.error && link.error.code !== "23505") persistenceFailure("Evidence workflow reference", link.error);
      const nextStatus = consentReference && row.status === "created" ? "active" : row.status;
      const now = new Date().toISOString();
      const updated = await db.from("protected_workflows").update({ consent_reference: consentReference, status: nextStatus, started_at: row.started_at ?? (consentReference ? now : null), last_activity_at: now, updated_at: now }).eq("workspace_id", input.workspaceId).eq("id", workflowId).eq("updated_at", row.updated_at).select("*").maybeSingle();
      if (updated.error || !updated.data) persistenceFailure("Protected workflow evidence projection", updated.error ?? new Error("Concurrent workflow mutation"));
      await appendReplay(db, updated.data as Row, actorId, evidence.category === "consent" ? "CONSENT_CONFIRMED" : evidence.category === "manual_review" ? "HUMAN_REVIEW" : "EVIDENCE_OBSERVED", correlationId);
      if (evidence.category === "manual_review") {
        const memory = await db.from("trust_memory_index").upsert({ enterprise_id: input.workspaceId, subject_id: row.subject_entity_id, domain_key: "WORKFLOW", memory_type: "HUMAN_REVIEW_COMPLETED", source_id: String(evidence.metadata?.reviewId), occurred_at: evidence.observedAt, summary: { workflowId, reviewId: evidence.metadata?.reviewId, decision: evidence.metadata?.decision }, correlation_id: correlationId }, { onConflict: "enterprise_id,memory_type,source_id", ignoreDuplicates: true });
        if (memory.error) persistenceFailure("Human review Trust Memory append", memory.error);
      }
      return { evidence: stored.data, workflow: updated.data };
    },

    async evaluate(workflowId: string, raw: unknown) {
      const body = bodyObject(raw);
      const row = await workflow(db, input.workspaceId, workflowId);
      assertWorkflowMutable(String(row.status) as ProtectedWorkflowStatus);
      if (!row.consent_reference) throw new ProtectedWorkflowError("Consent must be confirmed before canonical evaluation.", 409, "MONITORING_CONSENT_REQUIRED");
      await consent(db, input.workspaceId, String(row.consent_reference));
      const subject = await canonicalSubject(db, input.workspaceId, String(row.subject_entity_id));
      const evidenceResult = await db.from("evidence_objects").select("evidence_id,evidence_type,source_key,result,assurance_level,occurred_at,expires_at,payload_hash,normalized_facts,created_at").eq("enterprise_id", input.workspaceId).eq("source_type", "PROTECTED_WORKFLOW_SIGNAL").contains("normalized_facts", { workflowId }).order("occurred_at", { ascending: true }).limit(100);
      if (evidenceResult.error) persistenceFailure("Protected workflow Evidence collection", evidenceResult.error);
      const evidenceRows = (evidenceResult.data ?? []) as Row[];
      const aiRows = evidenceRows.filter((item) => String((item.normalized_facts as Row)?.category) === "ai_assistance");
      const aiDeclared = aiRows.some((item) => {
        const facts = item.normalized_facts as Row;
        return facts.evidenceType === "ai_assistance_declared" || facts.metadata?.declared === true;
      });
      let aiAuthorization: "REVIEW" | "DENY" | null = null;
      const aiReasonCodes: string[] = [];
      for (const item of aiRows) {
        const facts = item.normalized_facts as Row;
        const result = evaluateAiAssistance({ policy: aiPolicy(row), declared: aiDeclared, observed: true, confidence: typeof facts.confidence === "number" ? facts.confidence : undefined, corroborated: facts.metadata?.corroborated === true, highConsequence: ["privileged_access", "financial_approval"].includes(String(row.workflow_type)) });
        aiReasonCodes.push(...result.reasonCodes);
        if (result.authorization === "DENY" || (result.authorization === "REVIEW" && aiAuthorization !== "DENY")) aiAuthorization = result.authorization;
      }
      const canonicalEvidence: StoredProviderEvidence[] = evidenceRows.map((item) => {
        const facts = item.normalized_facts as Row;
        const ai = String(facts.category) === "ai_assistance" ? evaluateAiAssistance({ policy: aiPolicy(row), declared: aiDeclared, observed: true, confidence: typeof facts.confidence === "number" ? facts.confidence : undefined, corroborated: facts.metadata?.corroborated === true, highConsequence: ["privileged_access", "financial_approval"].includes(String(row.workflow_type)) }) : null;
        const outcome = ai?.authorization ? "INCONCLUSIVE" : item.result === "NEGATIVE" ? "FAILED" : item.result === "POSITIVE" || (ai && !ai.authorization) ? "PASSED" : "INCONCLUSIVE";
        return { reference: String(item.evidence_id), type: String(item.evidence_type), providerId: String(item.source_key), providerEventId: String(item.evidence_id), providerSessionId: workflowId, outcome, observedAt: String(item.occurred_at), expiresAt: item.expires_at ? String(item.expires_at) : null, sourceDigest: String(item.payload_hash), assuranceLevel: ({ NONE: null, LOW: 0.4, MEDIUM: 0.7, HIGH: 0.9, VERY_HIGH: 0.98 } as Row)[String(item.assurance_level)] ?? null, correlationId: String(item.evidence_id), sourcePartyId: String(facts.sourceParty ?? item.source_key), sourceClassification: "provider_asserted", schemaVersion: "track-block-evidence-v1" };
      });
      const dependencies = createCanonicalTrustTransactionDependencies({ supabase: input.supabase, user: input.user });
      const baseLoad = dependencies.loadConfiguredEvidence.bind(dependencies);
      const adapted: CanonicalTrustTransactionDependencies = { ...dependencies, loadConfiguredEvidence: async (parameters) => [...await baseLoad(parameters), ...canonicalEvidence] };
      const actionType = bounded(body.actionType ?? body.action_type ?? "protected_workflow.evaluate", "actionType");
      const purpose = bounded(body.purpose ?? "protected_workflow_governance", "purpose");
      const resourceValue = String(body.resource ?? `protected-workflow:${workflowId}`).trim();
      if (!resourceValue || resourceValue.length > 300) throw new ProtectedWorkflowError("resource is invalid.", 400, "RESOURCE_INVALID");
      const environment = bounded(body.environment ?? "protected-workflow", "environment");
      const snapshotDigest = hashCanonical(evidenceRows.map((item) => item.payload_hash));
      const receipt = await executeCanonicalTrustTransaction({
        trustObject: { subjectType: subject.trustObject.subject_type, subjectId: subject.trustObject.subject_id },
        operationalEntityId: row.subject_entity_id,
        action: { type: actionType, purpose, resource: resourceValue, environment, payloadDigest: hashCanonical({ workflowId, actionType, purpose, resourceValue, environment, snapshotDigest }) },
        idempotencyKey: `track-block:${workflowId}:eval:${snapshotDigest.slice(0, 24)}`,
        previousTransactionId: row.latest_canonical_transaction_id,
        managedControl: { authorization: aiAuthorization ? { decision: aiAuthorization, reasonCodes: [...new Set(aiReasonCodes)] } : undefined, reviewerState: row.metadata?.humanReviewRequired === true ? "required" : undefined },
      }, adapted);
      const now = new Date().toISOString();
      const completionRequested = body.complete === true;
      const projectedStatus = receipt.decision === "REVIEW" ? "challenge_required" : completionRequested && receipt.decision === "ALLOW" ? "completed" : row.status;
      const updated = await db.from("protected_workflows").update({ latest_canonical_transaction_id: receipt.transactionId, status: projectedStatus, last_activity_at: now, ended_at: projectedStatus === "completed" ? now : row.ended_at, updated_at: now }).eq("workspace_id", input.workspaceId).eq("id", workflowId).eq("updated_at", row.updated_at).select("*").maybeSingle();
      if (updated.error || !updated.data) persistenceFailure("Canonical decision workflow projection", updated.error ?? new Error("Concurrent workflow mutation"));
      await appendReplay(db, updated.data as Row, actorId, "CANONICAL_DECISION", receipt.correlationId, receipt.transactionId);
      if (projectedStatus === "completed") await appendReplay(db, updated.data as Row, actorId, "WORKFLOW_COMPLETED", receipt.correlationId, receipt.transactionId);
      return { workflow: updated.data, receipt, suggestedIntervention: interventionForDecision({ decision: receipt.decision, humanReviewRequired: row.metadata?.humanReviewRequired === true, policyPermitsBlock: row.metadata?.policyPermitsBlock === true, policyPermitsTerminate: row.metadata?.policyPermitsTerminate === true }) };
    },

    async intervene(workflowId: string, raw: unknown) {
      const body = bodyObject(raw);
      const row = await workflow(db, input.workspaceId, workflowId);
      assertWorkflowMutable(String(row.status) as ProtectedWorkflowStatus);
      if (!row.latest_canonical_transaction_id) throw new ProtectedWorkflowError("A canonical transaction is required before intervention.", 409, "CANONICAL_TRANSACTION_REQUIRED");
      const requested = String(body.interventionType ?? body.intervention_type) as WorkflowIntervention;
      if (!workflowInterventions.includes(requested)) throw new ProtectedWorkflowError("interventionType is invalid.", 400, "INTERVENTION_INVALID");
      const transaction = await db.from("canonical_trust_transactions").select("transaction_id,decision,reason_codes,evidence_graph_reference,correlation_id").eq("enterprise_id", input.workspaceId).eq("transaction_id", row.latest_canonical_transaction_id).maybeSingle();
      if (transaction.error) persistenceFailure("Canonical intervention transaction", transaction.error);
      if (!transaction.data) throw new ProtectedWorkflowError("The canonical transaction is outside this workflow tenant.", 404, "CANONICAL_TRANSACTION_NOT_FOUND");
      const permitted = interventionForDecision({ decision: transaction.data.decision, preferred: requested, humanReviewRequired: row.metadata?.humanReviewRequired === true, policyPermitsBlock: row.metadata?.policyPermitsBlock === true, policyPermitsTerminate: row.metadata?.policyPermitsTerminate === true });
      if (permitted !== requested) throw new ProtectedWorkflowError(`Intervention ${requested} is not permitted for canonical ${transaction.data.decision}; ${permitted} is the safe response.`, 409, "INTERVENTION_NOT_PERMITTED");
      const nextStatus = statusForIntervention(requested);
      if (nextStatus !== row.status && !canTransitionWorkflow(String(row.status) as ProtectedWorkflowStatus, nextStatus)) throw new ProtectedWorkflowError(`Workflow cannot transition from ${row.status} to ${nextStatus}.`, 409, "WORKFLOW_TRANSITION_DENIED");
      const idempotencyKey = bounded(body.idempotencyKey ?? body.idempotency_key, "idempotencyKey");
      const existing = await db.from("workflow_interventions").select("*").eq("workspace_id", input.workspaceId).eq("workflow_id", workflowId).eq("idempotency_key", idempotencyKey).maybeSingle();
      if (existing.error) persistenceFailure("Intervention idempotency", existing.error);
      if (existing.data) return { workflow: row, intervention: existing.data, idempotentReplay: true };
      const correlationId = crypto.randomUUID();
      const replay = await appendReplay(db, row, actorId, replayEventForIntervention(requested), correlationId, transaction.data.transaction_id);
      const outcome = metadata(body.outcome);
      const intervention = await db.from("workflow_interventions").insert({ workspace_id: input.workspaceId, workflow_id: workflowId, canonical_transaction_id: transaction.data.transaction_id, intervention_type: requested, reason_codes: transaction.data.reason_codes ?? [], performed_by: actorId, status: body.status === "RESOLVED" ? "RESOLVED" : "APPLIED", resolved_at: body.status === "RESOLVED" ? new Date().toISOString() : null, outcome, evidence_graph_reference: transaction.data.evidence_graph_reference, replay_reference: replay.id, receipt_reference: `/api/trust/transactions/${transaction.data.transaction_id}/receipt`, idempotency_key: idempotencyKey, correlation_id: correlationId }).select("*").single();
      if (intervention.error) persistenceFailure("Workflow intervention append", intervention.error);
      const now = new Date().toISOString();
      const updated = await db.from("protected_workflows").update({ status: nextStatus, latest_intervention: requested, last_activity_at: now, ended_at: ["terminated", "completed"].includes(nextStatus) ? now : row.ended_at, updated_at: now }).eq("workspace_id", input.workspaceId).eq("id", workflowId).eq("updated_at", row.updated_at).select("*").maybeSingle();
      if (updated.error || !updated.data) persistenceFailure("Intervention workflow projection", updated.error ?? new Error("Concurrent workflow mutation"));
      const materialMemory = ({ STEP_UP_VERIFY: "STEP_UP_REQUIRED", PAUSE: "WORKFLOW_PAUSED", BLOCK: "WORKFLOW_BLOCKED", RESUME: "TRUST_RECOVERED" } as Partial<Record<WorkflowIntervention, string>>)[requested];
      if (materialMemory) {
        const memory = await db.from("trust_memory_index").upsert({ enterprise_id: input.workspaceId, subject_id: row.subject_entity_id, domain_key: "WORKFLOW", memory_type: materialMemory, source_id: intervention.data.id, occurred_at: now, summary: { workflowId, intervention: requested, canonicalTransactionId: transaction.data.transaction_id }, correlation_id: correlationId }, { onConflict: "enterprise_id,memory_type,source_id", ignoreDuplicates: true });
        if (memory.error) persistenceFailure("Material Trust Memory append", memory.error);
      }
      return { workflow: updated.data, intervention: intervention.data, idempotentReplay: false };
    },

    async get(workflowId: string) {
      const row = await workflow(db, input.workspaceId, workflowId);
      const [evidence, interventions, replay, memory, references] = await Promise.all([
        db.from("evidence_objects").select("evidence_id,evidence_type,source_key,result,assurance_level,occurred_at,received_at,payload_hash,reason_codes,normalized_facts").eq("enterprise_id", input.workspaceId).eq("source_type", "PROTECTED_WORKFLOW_SIGNAL").contains("normalized_facts", { workflowId }).order("occurred_at", { ascending: true }),
        db.from("workflow_interventions").select("*").eq("workspace_id", input.workspaceId).eq("workflow_id", workflowId).order("created_at", { ascending: true }),
        db.from("trust_replay_sessions").select("id,replay_summary,generated_by,created_at,correlation_id").eq("workspace_id", input.workspaceId).eq("subject_type", "protected_workflow").eq("subject_id", workflowId).order("created_at", { ascending: true }),
        db.from("trust_memory_index").select("memory_id,memory_type,source_id,occurred_at,summary").eq("enterprise_id", input.workspaceId).eq("subject_id", row.subject_entity_id).contains("summary", { workflowId }).order("occurred_at", { ascending: true }),
        db.from("trust_references").select("source_type,source_id,ref_type,ref_id,ref_version,created_at").eq("enterprise_id", input.workspaceId).eq("ref_id", workflowId).order("created_at", { ascending: true }),
      ]);
      for (const result of [evidence, interventions, replay, memory, references]) if (result.error) persistenceFailure("Protected workflow read model", result.error);
      const transactionIds = [...new Set([...(interventions.data ?? []).map((item) => String(item.canonical_transaction_id)), ...(row.latest_canonical_transaction_id ? [String(row.latest_canonical_transaction_id)] : [])])];
      const transactions = transactionIds.length ? await db.from("canonical_trust_transactions").select("transaction_id,decision,reason_codes,authority_reference,policy_id,policy_version,evidence_references,evidence_graph_reference,replay_reference,trust_memory_reference,requested_at").eq("enterprise_id", input.workspaceId).in("transaction_id", transactionIds).order("requested_at", { ascending: true }) : { data: [] as Row[], error: null };
      if (transactions.error) persistenceFailure("Protected workflow canonical transactions", transactions.error);
      const transactionRows = (transactions.data ?? []) as Row[];
      return { workflow: row, consent: row.consent_reference ? { receiptReference: row.consent_reference } : null, evidence: evidence.data ?? [], canonicalTransactions: transactionRows, interventions: interventions.data ?? [], replay: replay.data ?? [], trustMemory: memory.data ?? [], references: references.data ?? [], receipts: transactionRows.map((item) => ({ transactionId: item.transaction_id, href: `/api/trust/transactions/${item.transaction_id}/receipt` })) };
    },
  };
}

export async function loadProtectedWorkflowReceiptContext(workspaceId: string, transactionId: string) {
  const db = createServiceRoleClient();
  const intervention = await db.from("workflow_interventions").select("workflow_id").eq("workspace_id", workspaceId).eq("canonical_transaction_id", transactionId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (intervention.error) persistenceFailure("Receipt intervention context", intervention.error);
  const projected = await db.from("protected_workflows").select("id").eq("workspace_id", workspaceId).eq("latest_canonical_transaction_id", transactionId).limit(1).maybeSingle();
  if (projected.error) persistenceFailure("Receipt workflow context", projected.error);
  const workflowId = String(intervention.data?.workflow_id ?? projected.data?.id ?? "");
  if (!uuid.test(workflowId)) return null;
  const [workflowResult, evidence, interventions, replay, memory] = await Promise.all([
    db.from("protected_workflows").select("id,workflow_type,subject_entity_id,policy_reference,consent_reference,status,started_at,ended_at,latest_intervention").eq("workspace_id", workspaceId).eq("id", workflowId).single(),
    db.from("evidence_objects").select("evidence_id,evidence_type,payload_hash,occurred_at,normalized_facts").eq("enterprise_id", workspaceId).eq("source_type", "PROTECTED_WORKFLOW_SIGNAL").contains("normalized_facts", { workflowId }).order("occurred_at", { ascending: true }),
    db.from("workflow_interventions").select("id,canonical_transaction_id,intervention_type,reason_codes,performed_by,status,created_at,resolved_at,outcome,evidence_graph_reference,replay_reference,receipt_reference").eq("workspace_id", workspaceId).eq("workflow_id", workflowId).order("created_at", { ascending: true }),
    db.from("trust_replay_sessions").select("id,generated_by,created_at").eq("workspace_id", workspaceId).eq("subject_type", "protected_workflow").eq("subject_id", workflowId).order("created_at", { ascending: true }),
    db.from("trust_memory_index").select("memory_id,memory_type,source_id,occurred_at").eq("enterprise_id", workspaceId).contains("summary", { workflowId }).order("occurred_at", { ascending: true }),
  ]);
  for (const result of [workflowResult, evidence, interventions, replay, memory]) if (result.error) persistenceFailure("Protected workflow receipt context", result.error);
  return {
    workflow: workflowResult.data,
    evidence: (evidence.data ?? []).map((item) => ({ evidenceId: item.evidence_id, evidenceType: item.evidence_type, category: (item.normalized_facts as Row | null)?.category ?? null, digest: item.payload_hash, observedAt: item.occurred_at })),
    interventions: interventions.data ?? [],
    governanceReviewReferences: (evidence.data ?? []).map((item) => (item.normalized_facts as Row | null)?.metadata?.reviewId).filter(Boolean),
    replay: replay.data ?? [],
    trustMemory: memory.data ?? [],
  };
}
