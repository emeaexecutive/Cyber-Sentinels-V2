import assert from "node:assert/strict";
const at = "2026-09-24T10:00:00.000Z";
const issuedAt = "2026-09-24T09:00:00.000Z";
const expiresAt = "2026-09-25T10:00:00.000Z";
const tenantId = "10000000-0000-4000-8000-000000000001";
const operatorId = "10000000-0000-4000-8000-000000000002";
const subjectId = "10000000-0000-4000-8000-000000000003";
const entityId = "10000000-0000-4000-8000-000000000004";
const workflowId = "10000000-0000-4000-8000-000000000005";
const contractId = "10000000-0000-4000-8000-000000000006";

export function harness(input, options = {}) {
  const calls = [];
  const records = [];
  const object = {
    enterpriseId: tenantId, ...input.trustObject, displayIdentity: "Synthetic governed actor",
    subject: { type: input.trustObject.subjectType, id: subjectId, displayName: "Synthetic governed actor" },
    identityState: "verified", authorityState: "verified", environmentState: "verified", scopeState: "verified",
    evidenceCompleteness: "complete", trustState: "verified", providerState: "available",
    activeContradictions: [], activeIncidents: [], activeReviews: [], correctiveActions: [],
    trustDnaReference: null, continuousTrustReference: null, policyId: "synthetic-policy",
    canonicalDigest: "stored", currentTrustState: "verified", trustDnaProfileReference: null,
    continuousTrustStateReference: null,
    contradictionSummary: { count: 0, highestState: null, references: [] },
    activeReviewSummary: { count: 0, required: false, references: [] },
    incidentSummary: { count: 0, highestState: null, references: [] },
    replayReference: null, trustMemoryReference: null, evidenceGraphNodeReference: { type: "node", id: "synthetic:subject" },
    lastEvaluatedAt: issuedAt, policyVersion: "1.0.0", correlationId: workflowId,
  };
  const authority = {
    contractId, enterpriseId: tenantId, subject: object.subject, workflow: { id: workflowId, objective: input.action.purpose },
    ...input.trustObject, workflowId, authorizedObjective: input.action.purpose,
    requiredIdentityState: "verified", requiredAuthority: [input.action.type, `external_effect:${input.managedControl.externalEffectBoundary.externalEffect}`],
    requiredEnvironmentState: "verified", permittedScope: [input.action.type],
    authorityScope: { permittedActions: [input.action.type], permittedTools: [input.action.type], permittedTargets: [input.action.resource], environments: [input.action.environment], dataBoundary: "INTERNAL", financialLimit: 0, executionLimit: 1 },
    permittedProviders: ["synthetic_identity"], requiredEvidenceTypes: ["IDENTITY_SESSION"],
    maximumEvidenceAgeSeconds: 3600, monitoringRequirements: ["runtime"], humanReviewThresholds: [],
    contradictionPolicy: "pause", incidentThreshold: "critical", expiresAt, revokedAt: null, revocationState: "active",
    issuer: "synthetic:issuer", approver: "synthetic:approver", policyId: "synthetic-policy", policyVersion: "1.0.0",
    authorityVersion: "synthetic:authority:v1", evidenceReferences: [{ type: "authority_grant", id: "synthetic:authority" }], issuedAt,
    ...options.authority,
  };
  const entity = {
    entityId, enterpriseId: tenantId,
    entityType: input.trustObject.subjectType === "machine_identity" ? "service" : input.trustObject.subjectType,
    displayReference: "Synthetic governed actor", canonicalTrustObjectId: subjectId, lifecycleState: "active",
    accountableOwnerId: operatorId, organizationReference: "synthetic:organization",
    providerReferences: ["synthetic_identity"], externalIdentityReferences: [], identityProfileReference: subjectId,
    currentAuthorityReferences: [contractId], environmentReferences: [input.action.environment], workflowReferences: [workflowId],
    currentTrustState: "verified", currentEvidenceState: "current", currentConsequenceClassification: "low",
    createdAt: issuedAt, updatedAt: at, suspendedAt: null, revokedAt: null, supersedesEntityVersionId: null,
    canonicalDigest: "e".repeat(64), ...options.entity,
  };
  const deps = {
    async authenticateActor() { calls.push("authenticateActor"); return { id: operatorId, type: "human", authority: "synthetic:operator-session" }; },
    async resolveTenantFromSession() { return { id: tenantId, name: "Synthetic tenant" }; },
    async findByIdempotency() { return options.previousReceipt ?? null; },
    async resolveOperationalEntity(tenant, resolution) {
      calls.push("resolveOperationalEntity");
      assert.equal(tenant, tenantId);
      assert.equal(resolution.requestedEntityId, entityId);
      assert.equal(resolution.trustObjectReference, subjectId);
      return entity;
    },
    async loadTrustObject() { return object; },
    async loadConfiguredEvidence() {
      return [{
        reference: "10000000-0000-4000-8000-000000000007", type: "IDENTITY_SESSION", providerId: "synthetic_identity",
        providerEventId: "synthetic:identity:event", providerSessionId: "synthetic:identity:session", outcome: "PASSED",
        observedAt: issuedAt, expiresAt, sourceDigest: "b".repeat(64), assuranceLevel: 0.9,
        correlationId: workflowId, serverVerified: true, sourceClassification: "identity_provider_asserted",
      }];
    },
    async loadAuthority() { if (options.missingAuthority) throw new Error("AUTHORITY_NOT_FOUND"); return authority; },
    async loadPolicy() { return { id: "synthetic-policy", version: "1.0.0", active: true, validFrom: issuedAt, validUntil: null, policyHash: "c".repeat(64), ...options.policy }; },
    async loadPreviousTransaction() { return null; },
    async persistDecision(record) { calls.push("persistDecision"); records.push(record); return { ...record, persistenceStatus: "CREATED" }; },
    async extendEvidenceGraph(record) { calls.push("extendEvidenceGraph"); assert.equal(record.digest, records[0].digest); return "synthetic:graph"; },
    async appendReplay(record) { calls.push("appendReplay"); assert.equal(record.digest, records[0].digest); return "synthetic:replay"; },
    async emitTrustMemory(record) { calls.push("emitTrustMemory"); assert.equal(record.digest, records[0].digest); return "synthetic:memory"; },
    async requestExternalExecution() { calls.push("requestExternalExecution"); return { configured: false, requestReference: null, acknowledgement: null, outcome: null }; },
    async recordExternalAcknowledgement() { throw new Error("No provider acknowledgement exists in this synthetic fixture"); },
    async recordExternalOutcome() { throw new Error("No provider outcome exists in this synthetic fixture"); },
  };
  return { deps, calls, records };
}
