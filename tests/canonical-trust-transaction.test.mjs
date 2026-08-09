import assert from "node:assert/strict";
import test from "node:test";

import { executeCanonicalTrustTransaction } from "../src/lib/trust-transaction/canonical.ts";

const requestedAt = "2026-08-06T10:00:00.000Z";
const tenantId = "10000000-0000-4000-8000-000000000001";
const actorId = "10000000-0000-4000-8000-000000000002";
const subjectId = "10000000-0000-4000-8000-000000000003";
const workflowId = "10000000-0000-4000-8000-000000000004";

function trustObject() {
  return {
    enterpriseId: tenantId,
    subjectType: "ai_agent",
    subjectId,
    displayIdentity: "Settlement Agent",
    subject: { type: "ai_agent", id: subjectId, displayName: "Settlement Agent" },
    identityState: "verified",
    authorityState: "verified",
    environmentState: "verified",
    scopeState: "verified",
    evidenceCompleteness: "complete",
    trustState: "verified",
    providerState: "available",
    activeContradictions: [], activeIncidents: [], activeReviews: [], correctiveActions: [],
    trustDnaReference: null, continuousTrustReference: null, policyId: "policy-settlement",
    canonicalDigest: "stored", currentTrustState: "verified", trustDnaProfileReference: null,
    continuousTrustStateReference: null,
    contradictionSummary: { count: 0, highestState: null, references: [] },
    activeReviewSummary: { count: 0, required: false, references: [] },
    incidentSummary: { count: 0, highestState: null, references: [] },
    replayReference: null, trustMemoryReference: null, evidenceGraphNodeReference: { type: "node", id: "node-subject" },
    lastEvaluatedAt: "2026-08-06T09:00:00.000Z", policyVersion: "1.0.0",
    correlationId: "10000000-0000-4000-8000-000000000005",
  };
}

function authority(overrides = {}) {
  return {
    contractId: "10000000-0000-4000-8000-000000000006",
    enterpriseId: tenantId,
    subject: { type: "ai_agent", id: subjectId, displayName: "Settlement Agent" },
    workflow: { id: workflowId, objective: "settle_invoice" },
    subjectType: "ai_agent", subjectId, workflowId,
    authorizedObjective: "settle_invoice",
    requiredIdentityState: "verified", requiredAuthority: ["settle_invoice"],
    requiredEnvironmentState: "verified", permittedScope: ["settle_invoice"],
    permittedProviders: ["hopae_connect"], requiredEvidenceTypes: ["IDENTITY_SESSION"],
    maximumEvidenceAgeSeconds: 3600, monitoringRequirements: ["runtime"], humanReviewThresholds: [],
    contradictionPolicy: "pause", incidentThreshold: "critical",
    expiresAt: "2026-08-07T10:00:00.000Z", revokedAt: null, revocationState: "active",
    issuer: "risk-owner", approver: "governance-owner", policyId: "policy-settlement", policyVersion: "1.0.0",
    evidenceReferences: [{ type: "authority_grant", id: "authority-evidence-1" }], issuedAt: "2026-08-05T10:00:00.000Z",
    ...overrides,
  };
}

function evidence(overrides = {}) {
  return {
    reference: "10000000-0000-4000-8000-000000000007",
    type: "IDENTITY_SESSION", providerId: "hopae_connect", providerEventId: "hopae-event-77",
    providerSessionId: "hopae-session-77", outcome: "PASSED",
    observedAt: "2026-08-06T09:30:00.000Z", expiresAt: "2026-08-06T11:30:00.000Z",
    sourceDigest: "a".repeat(64), assuranceLevel: 0.9,
    correlationId: "10000000-0000-4000-8000-000000000008",
    ...overrides,
  };
}

function transactionInput(overrides = {}) {
  return {
    trustObject: { subjectType: "ai_agent", subjectId },
    action: { type: "settle_invoice", purpose: "settle_invoice", resource: "invoice:4488", environment: "sandbox", payloadDigest: "b".repeat(64) },
    idempotencyKey: "settlement-4488-attempt-1",
    requestedAt,
    ...overrides,
  };
}

function operationalEntity(overrides = {}) {
  return {
    entityId: subjectId,
    enterpriseId: tenantId,
    entityType: "ai_agent",
    displayReference: "Settlement Agent",
    canonicalTrustObjectId: subjectId,
    lifecycleState: "active",
    accountableOwnerId: "owner:settlement",
    organizationReference: "organization:acme",
    providerReferences: ["hopae_connect"],
    externalIdentityReferences: [],
    identityProfileReference: subjectId,
    currentAuthorityReferences: [authority().contractId],
    environmentReferences: ["sandbox"],
    workflowReferences: ["settle_invoice"],
    currentTrustState: "verified",
    currentEvidenceState: "current",
    currentConsequenceClassification: "low",
    createdAt: requestedAt,
    updatedAt: requestedAt,
    suspendedAt: null,
    revokedAt: null,
    supersedesEntityVersionId: null,
    canonicalDigest: "e".repeat(64),
    ...overrides,
  };
}

function dependencies(options = {}) {
  const calls = [];
  const refs = { graph: "graph-1", replay: "replay-1", memory: "memory-1", ack: "ack-1", outcome: "outcome-1" };
  const deps = {
    async authenticateActor() { calls.push("authenticateActor"); return { id: actorId, type: "human", authority: `session:${actorId}` }; },
    async resolveTenantFromSession() { calls.push("resolveTenantFromSession"); return { id: tenantId, name: "Acme" }; },
    async findByIdempotency() { calls.push("findByIdempotency"); return options.previousReceipt ?? null; },
    async loadTrustObject() { calls.push("resolveTrustObject"); return trustObject(); },
    async loadConfiguredEvidence() { calls.push("collectConfiguredEvidence"); return options.evidence ?? [evidence()]; },
    async loadAuthority() { calls.push("resolveAuthority"); return options.authority ?? authority(); },
    async loadPolicy() { calls.push("resolvePolicyVersion"); return { id: "policy-settlement", version: "1.0.0", active: true, validFrom: "2026-08-01T00:00:00.000Z", validUntil: null, policyHash: "c".repeat(64) }; },
    async loadPreviousTransaction() { calls.push("loadPreviousTransaction"); return options.previousTransaction ?? null; },
    async persistDecision(record) { calls.push("persistDecision"); return { ...record, persistenceStatus: "CREATED" }; },
    async extendEvidenceGraph() { calls.push("extendEvidenceGraph"); return refs.graph; },
    async appendReplay() { calls.push("appendReplay"); return refs.replay; },
    async emitTrustMemory() { calls.push("emitMaterialTrustMemory"); return refs.memory; },
    async requestExternalExecution() { calls.push("requestExternalExecutionIfAllowed"); return options.external ?? { configured: true, requestReference: "request-1", acknowledgement: { externalReference: "relay-ack-1", acknowledgedAt: requestedAt }, outcome: { state: "SUCCEEDED", externalReference: "relay-result-1", occurredAt: requestedAt, reason: "Sandbox completed." } }; },
    async recordExternalAcknowledgement() { calls.push("recordExternalAcknowledgement"); return refs.ack; },
    async recordExternalOutcome(_record, result) { calls.push(`recordExternalOutcome:${result.state}`); return refs.outcome; },
  };
  if (options.operationalEntity) {
    deps.resolveOperationalEntity = async () => {
      calls.push("resolveOperationalEntity");
      return options.operationalEntity;
    };
  }
  return { deps, calls };
}

test("runs one ALLOW transaction in canonical order and keeps acknowledgement separate from outcome", async () => {
  const { deps, calls } = dependencies();
  const receipt = await executeCanonicalTrustTransaction(transactionInput(), deps);
  assert.equal(receipt.decision, "ALLOW");
  assert.equal(receipt.trustState, "verified");
  assert.equal(receipt.evidence[0].providerEventId, "hopae-event-77");
  assert.equal(receipt.evidence[0].sourceDigest, "a".repeat(64));
  assert.equal(receipt.externalExecution.acknowledgementReference, "ack-1");
  assert.equal(receipt.externalExecution.outcomeReference, "outcome-1");
  assert.notEqual(receipt.externalExecution.acknowledgementReference, receipt.externalExecution.outcomeReference);
  assert.equal(receipt.consequence, "low");
  assert.ok(["LOW", "MODERATE", "HIGH"].includes(receipt.confidenceInConclusion));
  assert.equal(receipt.timestamp, requestedAt);
  assert.match(receipt.digest, /^[a-f0-9]{64}$/);
  assert.ok(receipt.evidenceReferences.some((reference) => reference.id === "10000000-0000-4000-8000-000000000007"));
  assert.deepEqual(calls, [
    "authenticateActor", "resolveTenantFromSession", "findByIdempotency", "resolveTrustObject",
    "collectConfiguredEvidence", "resolveAuthority", "resolvePolicyVersion", "loadPreviousTransaction",
    "persistDecision", "extendEvidenceGraph", "appendReplay", "emitMaterialTrustMemory",
    "requestExternalExecutionIfAllowed", "recordExternalAcknowledgement", "recordExternalOutcome:SUCCEEDED",
  ]);
});

test("REVIEW for missing provider evidence never requests external execution", async () => {
  const { deps, calls } = dependencies({ evidence: [] });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "settlement-review-1" }), deps);
  assert.equal(receipt.decision, "REVIEW");
  assert.equal(receipt.trustState, "degraded");
  assert.equal(receipt.externalExecution.outcome, "NOT_REQUESTED");
  assert.equal(calls.includes("requestExternalExecutionIfAllowed"), false);
  assert.equal(calls.includes("recordExternalAcknowledgement"), false);
  assert.equal(calls.some((item) => item.startsWith("recordExternalOutcome")), false);
});

test("DENY for invalid authority scope suspends trust and never executes", async () => {
  const { deps, calls } = dependencies();
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "settlement-deny-1", action: { ...transactionInput().action, type: "transfer_funds" } }), deps);
  assert.equal(receipt.decision, "DENY");
  assert.equal(receipt.trustState, "suspended");
  assert.equal(receipt.externalExecution.requested, false);
  assert.equal(calls.includes("requestExternalExecutionIfAllowed"), false);
});

test("an idempotent retry returns the stored receipt before evaluation or relay", async () => {
  const first = dependencies();
  const stored = await executeCanonicalTrustTransaction(transactionInput(), first.deps);
  const retry = dependencies({ previousReceipt: stored });
  const receipt = await executeCanonicalTrustTransaction(transactionInput(), retry.deps);
  assert.equal(receipt.idempotentReplay, true);
  assert.deepEqual(retry.calls, ["authenticateActor", "resolveTenantFromSession", "findByIdempotency"]);
});

test("an idempotency key cannot be reused for a different request", async () => {
  const first = dependencies();
  const stored = await executeCanonicalTrustTransaction(transactionInput(), first.deps);
  const retry = dependencies({ previousReceipt: stored });
  await assert.rejects(
    executeCanonicalTrustTransaction(transactionInput({ action: { ...transactionInput().action, resource: "invoice:other" } }), retry.deps),
    /already bound to a different canonical request/,
  );
  assert.deepEqual(retry.calls, ["authenticateActor", "resolveTenantFromSession", "findByIdempotency"]);
});

test("a concurrent duplicate detected at persistence never reaches the external relay", async () => {
  const baseline = dependencies();
  const stored = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "concurrent-baseline" }), baseline.deps);
  const concurrent = dependencies();
  let lookups = 0;
  concurrent.deps.findByIdempotency = async () => { concurrent.calls.push("findByIdempotency"); lookups += 1; return lookups === 1 ? null : stored; };
  concurrent.deps.persistDecision = async (record) => { concurrent.calls.push("persistDecision:DUPLICATE"); return { ...record, persistenceStatus: "DUPLICATE" }; };
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "concurrent-baseline" }), concurrent.deps);
  assert.equal(receipt.idempotentReplay, true);
  assert.equal(concurrent.calls.includes("extendEvidenceGraph"), false);
  assert.equal(concurrent.calls.includes("requestExternalExecutionIfAllowed"), false);
});

test("an acknowledgement without a terminal result persists UNKNOWN separately", async () => {
  const { deps, calls } = dependencies({ external: { configured: true, requestReference: "request-unknown", acknowledgement: { externalReference: "relay-ack-unknown", acknowledgedAt: requestedAt }, outcome: null } });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "settlement-unknown-1" }), deps);
  assert.equal(receipt.externalExecution.outcome, "UNKNOWN");
  assert.equal(calls.includes("recordExternalAcknowledgement"), true);
  assert.equal(calls.includes("recordExternalOutcome:UNKNOWN"), true);
});

test("an ALLOW decision with no configured relay stays NOT_CONFIGURED and records no outcome", async () => {
  const { deps, calls } = dependencies({ external: { configured: false, requestReference: "request-not-configured", acknowledgement: null, outcome: null } });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "settlement-no-relay-1" }), deps);
  assert.equal(receipt.decision, "ALLOW");
  assert.equal(receipt.externalExecution.requested, false);
  assert.equal(receipt.externalExecution.outcome, "NOT_CONFIGURED");
  assert.equal(receipt.externalExecution.outcomeReference, null);
  assert.equal(calls.some((item) => item.startsWith("recordExternalOutcome")), false);
});

test("a changed condition records material Trust Memory and can recover to verified", async () => {
  const previousTransaction = { transactionId: "10000000-0000-4000-8000-000000000009", enterpriseId: tenantId, trustState: "degraded", decision: "REVIEW", evidenceDigest: "d".repeat(64), authorityReference: authority().contractId, policyVersion: "1.0.0" };
  const { deps, calls } = dependencies({ previousTransaction });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "settlement-recovery-1", previousTransactionId: previousTransaction.transactionId }), deps);
  assert.equal(receipt.trustState, "verified");
  assert.equal(receipt.materialChange, true);
  assert.ok(receipt.changedConditions.includes("EVIDENCE_CHANGED"));
  assert.equal(calls.includes("emitMaterialTrustMemory"), true);
});

test("non-material re-evaluation does not write Trust Memory", async () => {
  // Capture the exact evidence digest from the record presented to persistence.
  let digest = "";
  const current = dependencies();
  const originalPersist = current.deps.persistDecision;
  current.deps.persistDecision = async (record) => { digest = record.evidenceDigest; return originalPersist(record); };
  await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "capture-digest" }), current.deps);
  const previousTransaction = { transactionId: "10000000-0000-4000-8000-000000000010", enterpriseId: tenantId, trustState: "verified", decision: "ALLOW", evidenceDigest: digest, authorityReference: authority().contractId, policyVersion: "1.0.0" };
  const repeat = dependencies({ previousTransaction });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "non-material-reevaluation", previousTransactionId: previousTransaction.transactionId }), repeat.deps);
  assert.equal(receipt.materialChange, false);
  assert.equal(receipt.trustMemoryReference, null);
  assert.equal(repeat.calls.includes("emitMaterialTrustMemory"), false);
});

test("missing a contract-required evidence type is persisted as incomplete", async () => {
  const required = authority({ requiredEvidenceTypes: ["IDENTITY_SESSION", "LIVENESS_CHECK"] });
  const { deps } = dependencies({ authority: required });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "missing-required-evidence" }), deps);
  assert.equal(receipt.decision, "REVIEW");
  assert.equal(receipt.evidenceComplete, false);
});

test("a revoked Operational Entity fails closed before external execution", async () => {
  const { deps, calls } = dependencies({ operationalEntity: operationalEntity({ lifecycleState: "revoked", revokedAt: requestedAt }) });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "revoked-entity" }), deps);
  assert.equal(receipt.decision, "DENY");
  assert.ok(receipt.reasonCodes.includes("ENTITY_REVOKED"));
  assert.equal(calls.includes("collectConfiguredEvidence"), false);
  assert.equal(calls.includes("requestExternalExecutionIfAllowed"), false);
});

test("missing accountable ownership fails closed", async () => {
  const { deps, calls } = dependencies({ operationalEntity: operationalEntity({ accountableOwnerId: "" }) });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "missing-owner" }), deps);
  assert.equal(receipt.decision, "DENY");
  assert.ok(receipt.reasonCodes.includes("ACCOUNTABLE_OWNER_MISSING"));
  assert.equal(calls.includes("collectConfiguredEvidence"), false);
  assert.equal(calls.includes("requestExternalExecutionIfAllowed"), false);
});

test("high-consequence actions require independent evidence and route to REVIEW", async () => {
  const highConsequence = operationalEntity({ currentConsequenceClassification: "high" });
  const { deps, calls } = dependencies({ operationalEntity: highConsequence });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "high-consequence-single-source" }), deps);
  assert.equal(receipt.consequence, "high");
  assert.equal(receipt.decision, "REVIEW");
  assert.ok(receipt.reasonCodes.includes("INDEPENDENT_EVIDENCE_REQUIRED_FOR_CONSEQUENCE"));
  assert.equal(calls.includes("requestExternalExecutionIfAllowed"), false);
});

test("an explicit runtime continuity contradiction routes to REVIEW without execution", async () => {
  const { deps, calls } = dependencies();
  const input = transactionInput({
    idempotencyKey: "runtime-continuity-conflict",
    managedControl: { enforcementState: { runtimeObservation: "not_enforced", destinationObservation: "unknown" } },
  });
  const receipt = await executeCanonicalTrustTransaction(input, deps);
  assert.equal(receipt.decision, "REVIEW");
  assert.ok(receipt.reasonCodes.includes("RUNTIME_OR_DESTINATION_CONTINUITY_CONFLICT"));
  assert.equal(calls.includes("requestExternalExecutionIfAllowed"), false);
});
