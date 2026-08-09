import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { projectOperationalEntityIntelligence } from "../lib/operational-entities/intelligence.ts";
import { executeCanonicalTrustTransaction } from "../src/lib/trust-transaction/canonical.ts";

const enterpriseId = "20000000-0000-4000-8000-000000000001";
const actorId = "20000000-0000-4000-8000-000000000002";
const subjectId = "20000000-0000-4000-8000-000000000003";
const workflowId = "20000000-0000-4000-8000-000000000004";
const policyId = "policy:controlled-release";

function entity(overrides = {}) {
  return {
    entityId: "entity:alpha",
    enterpriseId,
    entityType: "ai_agent",
    displayReference: "Operational Entity Alpha",
    canonicalTrustObjectId: subjectId,
    lifecycleState: "active",
    accountableOwnerId: "owner:alpha",
    organizationReference: "organization:customer",
    providerReferences: ["provider:a", "provider:b"],
    externalIdentityReferences: [{
      referenceId: "identity:alpha:v1",
      provider: "provider:a",
      providerEntityId: "provider-native-alpha",
      builderPlatform: "agent-platform",
      providerNativeLifecycle: "active",
      providerOwner: "owner:alpha",
      providerBusinessPurpose: "controlled release",
      certificationState: "observed",
      permissionsSummary: ["deployment:request"],
      observedAt: "2026-08-08T09:00:00.000Z",
      sourceTimestamp: "2026-08-08T09:00:00.000Z",
      evidenceDigest: "1".repeat(64),
      correctedByReferenceId: null,
      supersedesReferenceId: null,
    }],
    identityProfileReference: "identity-profile:alpha",
    currentAuthorityReferences: ["authority:alpha:v1"],
    environmentReferences: ["staging"],
    workflowReferences: ["deployment:request"],
    currentTrustState: "verified",
    currentEvidenceState: "current",
    currentConsequenceClassification: "high",
    createdAt: "2026-08-08T09:00:00.000Z",
    updatedAt: "2026-08-08T09:00:00.000Z",
    suspendedAt: null,
    revokedAt: null,
    supersedesEntityVersionId: null,
    canonicalDigest: "2".repeat(64),
    ...overrides,
  };
}

function trustObject({ incidents = [], contradictions = [] } = {}) {
  return {
    enterpriseId,
    subjectType: "ai_agent",
    subjectId,
    displayIdentity: "Operational Entity Alpha",
    subject: { type: "ai_agent", id: subjectId, displayName: "Operational Entity Alpha" },
    identityState: "verified",
    authorityState: "verified",
    environmentState: "verified",
    scopeState: "verified",
    evidenceCompleteness: "complete",
    trustState: "verified",
    providerState: "available",
    activeContradictions: contradictions.map((id) => ({ id })),
    activeIncidents: incidents.map((id) => ({ id })),
    activeReviews: [],
    correctiveActions: [],
    trustDnaReference: null,
    continuousTrustReference: null,
    policyId,
    canonicalDigest: "3".repeat(64),
    currentTrustState: "verified",
    trustDnaProfileReference: null,
    continuousTrustStateReference: null,
    contradictionSummary: { count: contradictions.length, highestState: contradictions.length ? "material" : null, references: contradictions },
    activeReviewSummary: { count: 0, required: false, references: [] },
    incidentSummary: { count: incidents.length, highestState: incidents.length ? "material" : null, references: incidents },
    replayReference: null,
    trustMemoryReference: null,
    evidenceGraphNodeReference: { type: "node", id: "node:alpha" },
    lastEvaluatedAt: "2026-08-08T09:00:00.000Z",
    policyVersion: "1.0.0",
    correlationId: "20000000-0000-4000-8000-000000000005",
  };
}

function authority({ id = "authority:alpha:v1", revoked = false } = {}) {
  return {
    contractId: id,
    enterpriseId,
    subject: { type: "ai_agent", id: subjectId, displayName: "Operational Entity Alpha" },
    workflow: { id: workflowId, objective: "deployment:request" },
    subjectType: "ai_agent",
    subjectId,
    workflowId,
    authorizedObjective: "deployment:request",
    requiredIdentityState: "verified",
    requiredAuthority: ["deployment:request"],
    requiredEnvironmentState: "verified",
    permittedScope: ["deployment:request"],
    permittedProviders: ["provider:a", "provider:b", "runtime:attestor", "reviewer:human"],
    requiredEvidenceTypes: ["IDENTITY_SESSION"],
    maximumEvidenceAgeSeconds: 3600,
    monitoringRequirements: ["runtime", "destination"],
    humanReviewThresholds: [],
    contradictionPolicy: "pause",
    incidentThreshold: "critical",
    expiresAt: "2026-08-09T10:00:00.000Z",
    revokedAt: revoked ? "2026-08-08T10:55:00.000Z" : null,
    revocationState: revoked ? "revoked" : "active",
    issuer: "risk-owner",
    approver: "governance-owner",
    policyId,
    policyVersion: "1.0.0",
    evidenceReferences: [{ type: "authority_grant", id: `${id}:evidence` }],
    issuedAt: "2026-08-08T08:00:00.000Z",
  };
}

function evidence({ reference, providerId, at, digest, sourcePartyId, sourceClassification = "provider_asserted" }) {
  return {
    reference,
    type: "IDENTITY_SESSION",
    providerId,
    providerEventId: `event:${reference}`,
    providerSessionId: `session:${reference}`,
    outcome: "PASSED",
    observedAt: at,
    expiresAt: "2026-08-09T10:00:00.000Z",
    sourceDigest: digest,
    assuranceLevel: 0.9,
    correlationId: "20000000-0000-4000-8000-000000000006",
    sourcePartyId,
    sourceClassification,
  };
}

function transactionInput({ id, at, previousTransactionId = null, runtime = "enforced", destination = "enforced", reviewerState = "not_required" }) {
  return {
    trustObject: { subjectType: "ai_agent", subjectId },
    operationalEntityId: "entity:alpha",
    action: { type: "deployment:request", purpose: "deployment:request", resource: "repository:alpha", environment: "staging", payloadDigest: createHash("sha256").update(id).digest("hex") },
    idempotencyKey: id,
    previousTransactionId,
    requestedAt: at,
    managedControl: {
      responsibilityLineage: {
        businessOwner: "owner:alpha",
        controlOwner: "owner:alpha",
        policyApprover: "governance-owner",
        controlOperator: "owner:alpha",
        technologyProvider: "provider:a",
        identityAuthorizationProvider: "provider:a",
        operationalEntity: "entity:alpha",
        runtimeProvider: "runtime:attestor",
        destinationSystem: "repository:alpha",
        evidenceProvider: "provider:a",
        independentConfirmationSource: null,
        reviewer: reviewerState === "approved" ? "reviewer:human" : null,
      },
      enforcementState: { runtimeObservation: runtime, destinationObservation: destination },
      reviewerState,
    },
  };
}

function previousRecord(record) {
  return {
    transactionId: record.transactionId,
    enterpriseId: record.enterpriseId,
    trustState: record.trustState,
    decision: record.decision,
    evidenceDigest: record.evidenceDigest,
    authorityReference: record.authorityReference,
    policyVersion: record.policy.version,
  };
}

function row(record, receipt) {
  return {
    transaction_id: record.transactionId,
    enterprise_id: record.enterpriseId,
    operational_entity_id: record.operationalEntityId,
    requested_at: record.requestedAt,
    decision: record.decision,
    trust_state: record.trustState,
    authority_reference: record.authorityReference,
    authority_lineage_references: record.authorityEvidenceReferences,
    policy_version: record.policy.version,
    action_type: record.action.type,
    action_resource: record.action.resource,
    action_environment: record.action.environment,
    evidence_references: record.evidence,
    evidence_digest: record.evidenceDigest,
    evidence_complete: record.evidenceComplete,
    evidence_fresh: record.evidenceFresh,
    evidence_independence: record.evidenceIndependence,
    reason_codes: record.reasonCodes,
    changed_conditions: record.changedConditions,
    previous_transaction_id: record.previousTransactionId,
    material_change: record.materialChange,
    external_state: receipt.externalExecution.outcome,
    decision_time_snapshot: record.decisionTimeSnapshot,
  };
}

function detail(transactions, currentEntity = entity()) {
  return {
    entity: { ...currentEntity, currentTrustState: transactions.at(-1)?.trust_state ?? "unknown", updatedAt: transactions.at(-1)?.requested_at ?? currentEntity.updatedAt },
    externalIdentities: currentEntity.externalIdentityReferences,
    providerRelationships: [],
    providerTransitions: [],
    providerChangeEvents: [],
    transactions,
    enforcementEvents: [],
    replay: transactions.map((item) => ({ id: `replay:${item.transaction_id}`, canonical_transaction_id: item.transaction_id })),
    trustMemory: transactions.filter((item) => item.material_change).map((item) => ({ memory_id: `memory:${item.transaction_id}`, source_id: item.transaction_id })),
  };
}

async function runStep({ input, currentEntity, currentTrustObject, currentAuthority, currentEvidence, priorRecord, external = true }) {
  let persisted = null;
  let externalRequests = 0;
  const dependencies = {
    async authenticateActor() { return { id: actorId, type: "human", authority: `session:${actorId}` }; },
    async resolveTenantFromSession() { return { id: enterpriseId, name: "Customer" }; },
    async findByIdempotency() { return null; },
    async resolveOperationalEntity() { return currentEntity; },
    async loadTrustObject() { return currentTrustObject; },
    async loadConfiguredEvidence() { return currentEvidence; },
    async loadAuthority() { return currentAuthority; },
    async loadPolicy() { return { id: policyId, version: "1.0.0", active: true, validFrom: "2026-08-08T08:00:00.000Z", validUntil: null, policyHash: "4".repeat(64) }; },
    async loadPreviousTransaction() { return priorRecord ? previousRecord(priorRecord) : null; },
    async persistDecision(record) { persisted = record; return { ...record, persistenceStatus: "CREATED" }; },
    async extendEvidenceGraph(record) { return `graph:${record.transactionId}`; },
    async appendReplay(record) { return `replay:${record.transactionId}`; },
    async emitTrustMemory(record) { return `memory:${record.transactionId}`; },
    async requestExternalExecution(record) {
      externalRequests += 1;
      return external
        ? { configured: true, requestReference: `request:${record.transactionId}`, acknowledgement: { externalReference: `ack:${record.transactionId}`, acknowledgedAt: record.requestedAt }, outcome: { state: "SUCCEEDED", externalReference: `outcome:${record.transactionId}`, occurredAt: record.requestedAt, reason: "Destination observation confirmed." } }
        : { configured: false, requestReference: null, acknowledgement: null, outcome: null };
    },
    async recordExternalAcknowledgement(record) { return `ack-record:${record.transactionId}`; },
    async recordExternalOutcome(record) { return `outcome-record:${record.transactionId}`; },
  };
  const receipt = await executeCanonicalTrustTransaction(input, dependencies);
  assert.ok(persisted, "The canonical decision must be persisted.");
  return { record: persisted, receipt, externalRequests };
}

test("Operational Entity Alpha completes the real canonical decision, drift, recovery and conflict flow", async () => {
  const records = [];
  const rows = [];
  const evidenceAt = (suffix, at, providerId, sourcePartyId, sourceClassification) => evidence({ reference: `evidence:${suffix}`, providerId, at, digest: createHash("sha256").update(suffix).digest("hex"), sourcePartyId, sourceClassification });

  const initial = await runStep({
    input: transactionInput({ id: "alpha-initial", at: "2026-08-08T10:00:00.000Z" }),
    currentEntity: entity(),
    currentTrustObject: trustObject(),
    currentAuthority: authority(),
    currentEvidence: [
      evidenceAt("alpha-a1", "2026-08-08T09:55:00.000Z", "provider:a", "party:a"),
      evidenceAt("alpha-b1", "2026-08-08T09:56:00.000Z", "provider:b", "party:b"),
    ],
    priorRecord: null,
  });
  records.push(initial.record); rows.push(row(initial.record, initial.receipt));
  assert.equal(initial.receipt.decision, "ALLOW");
  assert.equal(initial.externalRequests, 1);
  assert.equal(initial.receipt.externalExecution.outcome, "SUCCEEDED");
  assert.ok(initial.receipt.replayReference);
  assert.ok(initial.receipt.trustMemoryReference);
  const initialProjection = projectOperationalEntityIntelligence(detail(rows), "2026-08-08T10:05:00.000Z");
  assert.equal(initialProjection.health.overallState, "HEALTHY");

  const runtime = await runStep({
    input: transactionInput({ id: "alpha-runtime-change", at: "2026-08-08T10:30:00.000Z", previousTransactionId: initial.record.transactionId, runtime: "not_enforced", destination: "unknown" }),
    currentEntity: entity(),
    currentTrustObject: trustObject({ incidents: ["incident:runtime-change"] }),
    currentAuthority: authority(),
    currentEvidence: [evidenceAt("alpha-a2", "2026-08-08T10:25:00.000Z", "provider:a", "party:a")],
    priorRecord: initial.record,
  });
  records.push(runtime.record); rows.push(row(runtime.record, runtime.receipt));
  assert.equal(runtime.receipt.decision, "REVIEW");
  assert.equal(runtime.externalRequests, 0);
  assert.ok(runtime.receipt.reasonCodes.includes("RUNTIME_OR_DESTINATION_CONTINUITY_CONFLICT"));
  assert.ok(runtime.receipt.reasonCodes.includes("ACTIVE_INCIDENT_REQUIRES_REVIEW"));
  const runtimeProjection = projectOperationalEntityIntelligence(detail(rows), "2026-08-08T10:35:00.000Z");
  assert.equal(runtimeProjection.drift.state, "MATERIAL_DRIFT");
  assert.ok(runtimeProjection.drift.findings.some((finding) => finding.condition === "runtime"));
  assert.equal(runtimeProjection.recommendation.recommendation, "REQUEST_RUNTIME_ATTESTATION");
  assert.equal(runtimeProjection.prediction.autonomousEnforcementAllowed, false);
  const confidenceRank = { INSUFFICIENT: 0, LOW: 1, MODERATE: 2, HIGH: 3 };
  assert.ok(confidenceRank[runtimeProjection.confidence.level] < confidenceRank[initialProjection.confidence.level]);

  const revoked = await runStep({
    input: transactionInput({ id: "alpha-authority-revoked", at: "2026-08-08T11:00:00.000Z", previousTransactionId: runtime.record.transactionId }),
    currentEntity: entity(),
    currentTrustObject: trustObject(),
    currentAuthority: authority({ revoked: true }),
    currentEvidence: [evidenceAt("alpha-a3", "2026-08-08T10:58:00.000Z", "provider:a", "party:a")],
    priorRecord: runtime.record,
  });
  records.push(revoked.record); rows.push(row(revoked.record, revoked.receipt));
  assert.equal(revoked.receipt.decision, "DENY");
  assert.equal(revoked.externalRequests, 0);
  assert.ok(revoked.receipt.reasonCodes.some((reason) => /REVOKED/.test(reason)));

  const restored = await runStep({
    input: transactionInput({ id: "alpha-replacement-authority", at: "2026-08-08T11:30:00.000Z", previousTransactionId: revoked.record.transactionId }),
    currentEntity: entity({ currentAuthorityReferences: ["authority:alpha:v2"] }),
    currentTrustObject: trustObject(),
    currentAuthority: authority({ id: "authority:alpha:v2" }),
    currentEvidence: [
      evidenceAt("alpha-a4", "2026-08-08T11:25:00.000Z", "provider:a", "party:a"),
      evidenceAt("runtime-attestation", "2026-08-08T11:26:00.000Z", "runtime:attestor", "party:runtime", "runtime_observed"),
    ],
    priorRecord: revoked.record,
  });
  records.push(restored.record); rows.push(row(restored.record, restored.receipt));
  assert.equal(restored.receipt.decision, "ALLOW");
  assert.equal(restored.externalRequests, 1);
  const restoredProjection = projectOperationalEntityIntelligence(detail(rows, entity({ currentAuthorityReferences: ["authority:alpha:v2"] })), "2026-08-08T11:35:00.000Z");
  assert.equal(restoredProjection.recovery?.state, "RESTORED");
  assert.equal(restoredProjection.health.overallState, "HEALTHY");

  const conflict = await runStep({
    input: transactionInput({ id: "alpha-provider-conflict", at: "2026-08-08T12:00:00.000Z", previousTransactionId: restored.record.transactionId }),
    currentEntity: entity({ currentAuthorityReferences: ["authority:alpha:v2"] }),
    currentTrustObject: trustObject(),
    currentAuthority: authority({ id: "authority:alpha:v2" }),
    currentEvidence: [
      evidenceAt("alpha-a5", "2026-08-08T11:55:00.000Z", "provider:a", "party:a"),
      evidenceAt("alpha-b-disputed", "2026-08-08T11:56:00.000Z", "provider:b", "party:b", "disputed"),
    ],
    priorRecord: restored.record,
  });
  records.push(conflict.record); rows.push(row(conflict.record, conflict.receipt));
  assert.equal(conflict.receipt.decision, "REVIEW");
  assert.equal(conflict.externalRequests, 0);
  const conflictProjection = projectOperationalEntityIntelligence(detail(rows), "2026-08-08T12:05:00.000Z");
  assert.ok(["DEGRADED", "REVIEW_REQUIRED"].includes(conflictProjection.health.overallState));
  assert.equal(conflictProjection.recommendation.recommendation, "RESOLVE_PROVIDER_CONFLICT");

  const resolved = await runStep({
    input: transactionInput({ id: "alpha-human-resolution", at: "2026-08-08T12:30:00.000Z", previousTransactionId: conflict.record.transactionId, reviewerState: "approved" }),
    currentEntity: entity({ currentAuthorityReferences: ["authority:alpha:v2"] }),
    currentTrustObject: trustObject(),
    currentAuthority: authority({ id: "authority:alpha:v2" }),
    currentEvidence: [
      evidenceAt("alpha-a6", "2026-08-08T12:25:00.000Z", "provider:a", "party:a"),
      evidenceAt("human-review", "2026-08-08T12:26:00.000Z", "reviewer:human", "party:reviewer", "human_reviewed"),
    ],
    priorRecord: conflict.record,
  });
  records.push(resolved.record); rows.push(row(resolved.record, resolved.receipt));
  assert.equal(resolved.receipt.decision, "ALLOW");
  assert.equal(resolved.receipt.evidenceIndependence, "independently_confirmed");
  const finalProjection = projectOperationalEntityIntelligence(detail(rows), "2026-08-08T12:35:00.000Z");
  assert.equal(finalProjection.health.overallState, "HEALTHY");
  assert.equal(finalProjection.recovery?.state, "RESTORED");
  assert.equal(finalProjection.recommendation.recommendation, "NO_ACTION_REQUIRED");
  assert.equal(rows.length, 6);
  assert.equal(new Set(rows.map((item) => item.transaction_id)).size, 6);
});
