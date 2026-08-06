import { deterministicUuid, hashCanonical } from "../trust-core/hash.ts";
import { normalizeUtcTimestamp } from "../trust-core/time.ts";
import { TRUST_CANONICALIZATION, TRUST_HASH_ALGORITHM } from "../trust-core/types.ts";
import { trustDecisionTypes, type CanonicalReference, type CanonicalSnapshotReference, type CanonicalTrustDecision, type CitedStatement, type DecisionEvolutionEntry, type TrustDecisionInput } from "./types.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const AI_ACTIONS = new Set(["SUMMARIZE", "CLUSTER", "EXPLAIN", "RECOMMEND", "RETRIEVE", "TRANSLATE"]);

function requireText(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 2_000) throw new TypeError(`${field} must be non-empty and at most 2000 characters.`);
  return value.trim();
}

function requireReference(reference: CanonicalReference, field: string, expectedSystem?: CanonicalReference["system"]): void {
  if (!reference || typeof reference !== "object") throw new TypeError(`${field} must reference a canonical system.`);
  if (expectedSystem && reference.system !== expectedSystem) throw new TypeError(`${field} must reference ${expectedSystem}.`);
  requireText(reference.id, `${field}.id`);
  if (reference.version !== undefined) requireText(reference.version, `${field}.version`);
}

function requireSnapshot(snapshot: CanonicalSnapshotReference, field: string, expectedSystem: CanonicalReference["system"]): void {
  requireReference(snapshot, field, expectedSystem);
  normalizeUtcTimestamp(snapshot.capturedAt, `${field}.capturedAt`);
  if (!HASH.test(snapshot.contentHash)) throw new TypeError(`${field}.contentHash must be SHA-256.`);
}

function citedStatements(decision: CanonicalTrustDecision): CitedStatement[] {
  return [
    ...decision.businessContext.impact,
    ...decision.operationalContext.impact,
    ...decision.confidenceClassification.rationale,
    ...decision.explanation.why,
    ...decision.explanation.assumptions,
    ...decision.explanation.whatChangedAfterwards,
    ...decision.decisionNarrative,
    ...decision.decisionOutcome.effect,
    ...(decision.decisionOutcome.finalEnterpriseOutcome ?? []),
    ...(decision.humanReviewer?.rationale ?? []),
    ...decision.evolution.map((entry) => entry.summary),
  ];
}

export function validateCanonicalTrustDecision(decision: CanonicalTrustDecision): CanonicalTrustDecision {
  if (!decision || typeof decision !== "object") throw new TypeError("Canonical Trust Decision must be an object.");
  if (decision.schemaVersion !== "1.0") throw new TypeError("Unsupported Trust Decision schema version.");
  if (!UUID.test(decision.decisionId) || !UUID.test(decision.enterpriseId)) throw new TypeError("Decision and enterprise IDs must be UUIDs.");
  if (!trustDecisionTypes.includes(decision.decisionType)) throw new TypeError("Unsupported decision type.");
  normalizeUtcTimestamp(decision.decisionTime, "decisionTime");
  requireText(decision.decisionOwner.id, "decisionOwner.id");
  requireSnapshot(decision.authoritySnapshot, "authoritySnapshot", "AUTHORITY_LINEAGE");
  requireSnapshot(decision.policySnapshot, "policySnapshot", "TRUST_POLICY");
  requireSnapshot(decision.evidenceSnapshot, "evidenceSnapshot", "EVIDENCE_GRAPH");
  requireReference(decision.trustObjectReference, "trustObjectReference", "TRUST_OBJECT");
  requireReference(decision.decisionHistoryReference, "decisionHistoryReference", "ENTERPRISE_DECISION_HISTORY");
  requireReference(decision.journeyReference, "journeyReference", "TRUST_JOURNEY");
  requireReference(decision.replayReference, "replayReference", "REPLAY");
  requireReference(decision.trustMemoryReference, "trustMemoryReference", "TRUST_MEMORY");
  requireReference(decision.evidenceGraphReference, "evidenceGraphReference", "EVIDENCE_GRAPH");
  requireReference(decision.authorityLineageReference, "authorityLineageReference", "AUTHORITY_LINEAGE");
  if (decision.recoveryReference) requireReference(decision.recoveryReference, "recoveryReference");
  if (decision.supersededDecision) requireReference(decision.supersededDecision, "supersededDecision");
  if (!Number.isFinite(decision.trustState.confidence) || decision.trustState.confidence < 0 || decision.trustState.confidence > 1) throw new TypeError("trustState.confidence must be between 0 and 1.");
  if (!Number.isFinite(decision.confidenceClassification.score) || decision.confidenceClassification.score < 0 || decision.confidenceClassification.score > 1) throw new TypeError("confidenceClassification.score must be between 0 and 1.");
  if (decision.supportingEvidence.length === 0) throw new TypeError("At least one supporting evidence item is required.");
  if (!decision.explanation.why.length || !decision.decisionNarrative.length || !decision.decisionOutcome.effect.length) throw new TypeError("Why, decision narrative and decision outcome must each preserve at least one cited statement.");
  requireText(decision.businessContext.process, "businessContext.process");
  requireText(decision.businessContext.objective, "businessContext.objective");
  requireText(decision.operationalContext.workflowId, "operationalContext.workflowId");
  requireText(decision.operationalContext.environment, "operationalContext.environment");
  requireText(decision.operationalContext.correlationId, "operationalContext.correlationId");

  const evidenceIds = new Set<string>();
  for (const evidence of decision.supportingEvidence) {
    if (evidenceIds.has(evidence.evidenceId)) throw new TypeError(`Duplicate evidence ID: ${evidence.evidenceId}.`);
    evidenceIds.add(requireText(evidence.evidenceId, "supportingEvidence.evidenceId"));
    normalizeUtcTimestamp(evidence.observedAt, "supportingEvidence.observedAt");
    requireText(evidence.source, "supportingEvidence.source");
    requireText(evidence.summary, "supportingEvidence.summary");
    requireReference(evidence.canonicalReference, "supportingEvidence.canonicalReference");
  }
  for (const statement of citedStatements(decision)) {
    requireText(statement.text, "citedStatement.text");
    if (!statement.evidenceIds.length) throw new TypeError(`Every explanatory sentence must cite evidence: ${statement.text}`);
    for (const id of statement.evidenceIds) if (!evidenceIds.has(id)) throw new TypeError(`Unresolved evidence citation: ${id}.`);
  }
  for (const unknown of decision.knownUnknowns) {
    requireText(unknown.description, "knownUnknown.description");
    for (const id of unknown.evidenceIds) if (!evidenceIds.has(id)) throw new TypeError(`Unresolved known-unknown citation: ${id}.`);
  }
  const evidenceAnswer = new Set(decision.explanation.whichEvidence);
  if (!decision.supportingEvidence.every((item) => evidenceAnswer.has(item.evidenceId))) throw new TypeError("explanation.whichEvidence must enumerate every supporting evidence item.");
  if (decision.explanation.whichAuthority.id !== decision.authoritySnapshot.id || decision.explanation.whichPolicy.id !== decision.policySnapshot.id) throw new TypeError("Explanation snapshot answers must match the preserved snapshots.");
  for (const ai of decision.aiParticipation) {
    if (ai.authoritative !== false || ai.actions.some((action) => !AI_ACTIONS.has(action))) throw new TypeError("AI participation exceeds the provider-neutral, non-authoritative boundary.");
    requireReference(ai.outputReference, "aiParticipation.outputReference");
  }
  for (const provider of decision.providerParticipation) {
    if (provider.authoritative !== false) throw new TypeError("Provider participation cannot be authoritative.");
    requireReference(provider.resultReference, "providerParticipation.resultReference");
  }
  const providers = new Set(decision.providerParticipation.map((item) => item.providerId));
  const aiParticipants = new Set(decision.aiParticipation.map((item) => item.participant.id));
  if (decision.explanation.whichProviders.some((id) => !providers.has(id)) || decision.providerParticipation.some((item) => !decision.explanation.whichProviders.includes(item.providerId))) throw new TypeError("Explanation provider answers must match provider participation.");
  if (decision.explanation.whichAI.some((id) => !aiParticipants.has(id)) || decision.aiParticipation.some((item) => !decision.explanation.whichAI.includes(item.participant.id))) throw new TypeError("Explanation AI answers must match AI participation.");
  if (decision.humanReviewer) {
    normalizeUtcTimestamp(decision.humanReviewer.reviewedAt, "humanReviewer.reviewedAt");
    if (decision.explanation.whichHuman !== decision.humanReviewer.reviewer.id) throw new TypeError("Explanation human answer must match the recorded reviewer.");
    requireReference(decision.humanReviewer.reviewReference, "humanReviewer.reviewReference");
  } else if (decision.explanation.whichHuman !== null) throw new TypeError("Explanation cannot name a human reviewer when no review is preserved.");
  normalizeUtcTimestamp(decision.decisionOutcome.effectiveAt, "decisionOutcome.effectiveAt");
  if (decision.decisionOutcome.expiresAt) normalizeUtcTimestamp(decision.decisionOutcome.expiresAt, "decisionOutcome.expiresAt");
  let previous = Date.parse(decision.decisionTime);
  for (const entry of decision.evolution) {
    const at = Date.parse(normalizeUtcTimestamp(entry.occurredAt, "evolution.occurredAt"));
    if (at < previous) throw new TypeError("Decision evolution must be chronological.");
    previous = at;
  }
  if (decision.evolution[0]?.stage !== "ORIGINAL_DECISION") throw new TypeError("Decision evolution must start with ORIGINAL_DECISION.");
  if (decision.canonicalization !== TRUST_CANONICALIZATION || decision.hashAlgorithm !== TRUST_HASH_ALGORITHM || !HASH.test(decision.contentHash)) throw new TypeError("Decision integrity metadata is invalid.");
  const { contentHash, ...content } = decision;
  if (hashCanonical(content) !== contentHash) throw new TypeError("Decision content hash does not match the canonical content.");
  return decision;
}

export function createCanonicalTrustDecision(input: TrustDecisionInput): CanonicalTrustDecision {
  const decisionTime = normalizeUtcTimestamp(input.decisionTime, "decisionTime");
  if (!input.explanation.why.length) throw new TypeError("At least one cited decision reason is required.");
  const decisionId = input.decisionId ?? deterministicUuid({
    enterpriseId: input.enterpriseId,
    decisionTime,
    decisionType: input.decisionType,
    ownerId: input.decisionOwner.id,
    workflowId: input.operationalContext.workflowId,
    evidenceSnapshotHash: input.evidenceSnapshot.contentHash,
  });
  const original: DecisionEvolutionEntry = {
    evolutionId: deterministicUuid({ decisionId, stage: "ORIGINAL_DECISION", decisionTime }),
    stage: "ORIGINAL_DECISION",
    occurredAt: decisionTime,
    summary: input.explanation.why[0],
    resultingDecisionType: input.decisionType,
    resultingTrustState: input.trustState.atDecision,
    reference: { system: "TRUST_FABRIC", id: decisionId },
  };
  const evolution = input.evolution?.[0]?.stage === "ORIGINAL_DECISION" ? input.evolution : [original, ...(input.evolution ?? [])];
  const content = {
    ...input,
    schemaVersion: "1.0" as const,
    decisionId,
    decisionTime,
    evolution,
    canonicalization: TRUST_CANONICALIZATION,
    hashAlgorithm: TRUST_HASH_ALGORITHM,
  };
  const decision = { ...content, contentHash: hashCanonical(content) } as CanonicalTrustDecision;
  return validateCanonicalTrustDecision(decision);
}
