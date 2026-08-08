import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyOperationalConsequence,
  createOperationalActionEnvelope,
  createOperationalEntity,
  evaluateOperationalEntityContinuity,
  evaluateOperationalEntityTrust,
  resolveOperationalEntity,
} from "../lib/operational-entities/operational-entity.ts";
import { executeCanonicalTrustTransaction } from "../src/lib/trust-transaction/canonical.ts";

test("operational entities support canonical lifecycle and accountability fields", () => {
  const entity = createOperationalEntity({
    entityId: "entity:alpha",
    enterpriseId: "enterprise:acme",
    entityType: "ai_agent",
    displayReference: "Agent Alpha",
    lifecycleState: "active",
    accountableOwnerId: "owner:alice",
    organizationReference: "org:acme",
    providerReferences: ["provider:hopae"],
    identityProfileReference: "profile:alpha",
    currentAuthorityReferences: ["authority:alpha"],
    environmentReferences: ["env:prod"],
    workflowReferences: ["workflow:deploy"],
    currentTrustState: "verified",
    currentEvidenceState: "current",
    currentConsequenceClassification: "low",
    canonicalTrustObjectId: "trust:alpha",
    canonicalDigest: "digest:alpha",
  });

  assert.equal(entity.entityType, "ai_agent");
  assert.equal(entity.lifecycleState, "active");
  assert.equal(entity.accountableOwnerId, "owner:alice");
  assert.ok(entity.canonicalDigest);
});

test("consequence classification is deterministic and reasoned", () => {
  const entity = createOperationalEntity({
    entityId: "entity:beta",
    enterpriseId: "enterprise:acme",
    entityType: "service_account",
    displayReference: "Service Beta",
    lifecycleState: "active",
    accountableOwnerId: "owner:alice",
    organizationReference: "org:acme",
    providerReferences: [],
    identityProfileReference: "profile:beta",
    currentAuthorityReferences: ["authority:beta"],
    environmentReferences: ["env:prod"],
    workflowReferences: ["workflow:repo"],
    currentTrustState: "verified",
    currentEvidenceState: "current",
    currentConsequenceClassification: "low",
    canonicalTrustObjectId: "trust:beta",
    canonicalDigest: "digest:beta",
  });

  const result = classifyOperationalConsequence({
    entity,
    requestedAction: "deploy",
    target: "service:payments",
    tool: "deploy-cli",
    resource: "repo:payments",
    environment: "production",
    dataBoundary: "restricted",
    authority: { scope: ["deploy"] },
    policy: { requiresHumanApproval: true },
    businessContext: "release",
    incidentContext: null,
  });

  assert.equal(result.classification, "high");
  assert.ok(result.reasons.some((reason) => reason.includes("restricted")));
  assert.ok(result.reasons.some((reason) => reason.includes("human approval")));
});

test("trust evaluation reviews high-consequence actions without sufficient evidence", () => {
  const entity = createOperationalEntity({
    entityId: "entity:gamma",
    enterpriseId: "enterprise:acme",
    entityType: "device",
    displayReference: "Device Gamma",
    lifecycleState: "active",
    accountableOwnerId: "owner:alice",
    organizationReference: "org:acme",
    providerReferences: ["provider:attestation"],
    identityProfileReference: "profile:gamma",
    currentAuthorityReferences: ["authority:gamma"],
    environmentReferences: ["env:prod"],
    workflowReferences: ["workflow:attestation"],
    currentTrustState: "verified",
    currentEvidenceState: "current",
    currentConsequenceClassification: "high",
    canonicalTrustObjectId: "trust:gamma",
    canonicalDigest: "digest:gamma",
  });

  const envelope = createOperationalActionEnvelope({
    entityId: entity.entityId,
    actionType: "deploy",
    objective: "release",
    tool: "deploy-cli",
    target: "service:payments",
    resource: "repo:payments",
    environment: "production",
    dataBoundary: "restricted",
    consequenceClassification: "high",
    authorityReference: "authority:gamma",
    policyReference: "policy:release",
    evidenceReferences: ["evidence:attestation"],
    requestContext: {
      enterpriseId: "enterprise:acme",
      actorId: "actor:owner",
      accountableOwnerId: "owner:alice",
    },
  });

  const result = evaluateOperationalEntityTrust({
    entity,
    actionEnvelope: envelope,
    authority: { isCurrent: true, isExpired: false, isRevoked: false, scope: ["deploy"] },
    evidence: { isCurrent: false, isStale: true, hasProviderConflict: false },
    policy: { requiresHumanApproval: true },
    incidentState: null,
  });

  assert.equal(result.decision, "REVIEW");
  assert.ok(result.reasons.some((reason) => reason.includes("evidence")));
});

test("entity continuity detects approved changes and unexplained changes", () => {
  const base = createOperationalEntity({
    entityId: "entity:delta",
    enterpriseId: "enterprise:acme",
    entityType: "workload",
    displayReference: "Workload Delta",
    lifecycleState: "active",
    accountableOwnerId: "owner:alice",
    organizationReference: "org:acme",
    providerReferences: ["provider:workload"],
    identityProfileReference: "profile:delta",
    currentAuthorityReferences: ["authority:delta"],
    environmentReferences: ["env:prod"],
    workflowReferences: ["workflow:batch"],
    currentTrustState: "verified",
    currentEvidenceState: "current",
    currentConsequenceClassification: "moderate",
    canonicalTrustObjectId: "trust:delta",
    canonicalDigest: "digest:delta",
  });

  const approved = evaluateOperationalEntityContinuity({
    entity: base,
    previousEntity: { ...base, environmentReferences: ["env:prod", "env:staging"] },
    providerEvidenceChanged: false,
    authorityChanged: false,
    ownerChanged: false,
    runtimeChanged: true,
    evidenceStale: false,
  });

  assert.equal(approved.state, "approved_change");

  const unexplained = evaluateOperationalEntityContinuity({
    entity: base,
    previousEntity: { ...base, environmentReferences: ["env:prod"] },
    providerEvidenceChanged: true,
    authorityChanged: true,
    ownerChanged: false,
    runtimeChanged: true,
    evidenceStale: true,
  });

  assert.equal(unexplained.state, "unexplained_change");
});

test("operational entity resolution preserves canonical ownership and links transaction execution", async () => {
  const entity = createOperationalEntity({
    entityId: "entity:epsilon",
    enterpriseId: "enterprise:acme",
    entityType: "ai_agent",
    displayReference: "Agent Epsilon",
    lifecycleState: "active",
    accountableOwnerId: "owner:alice",
    organizationReference: "org:acme",
    providerReferences: ["provider:hopae"],
    identityProfileReference: "profile:epsilon",
    currentAuthorityReferences: ["authority:epsilon"],
    environmentReferences: ["env:prod"],
    workflowReferences: ["workflow:deploy"],
    currentTrustState: "verified",
    currentEvidenceState: "current",
    currentConsequenceClassification: "low",
    canonicalTrustObjectId: "trust:epsilon",
    canonicalDigest: "digest:epsilon",
  });

  const resolved = resolveOperationalEntity({
    requestedEntityId: "entity:epsilon",
    legacyHumanId: null,
    agentId: null,
    serviceIdentity: null,
    deviceIdentity: null,
    trustObjectReference: "trust:epsilon",
    tenantId: "enterprise:acme",
    knownEntities: [entity],
  });

  assert.equal(resolved.entityId, entity.entityId);
  assert.equal(resolved.accountableOwnerId, entity.accountableOwnerId);
  assert.equal(resolved.canonicalTrustObjectId, entity.canonicalTrustObjectId);

  const receipt = await executeCanonicalTrustTransaction({
    trustObject: { subjectType: "ai_agent", subjectId: "entity:epsilon" },
    action: { type: "read_repo", purpose: "repository_read", resource: "repo:payments", environment: "production", payloadDigest: "a".repeat(64) },
    idempotencyKey: "op-runtime-001",
    previousTransactionId: null,
  }, {
    async authenticateActor() { return { id: "actor:alice", type: "human", authority: "session:alice" }; },
    async resolveTenantFromSession() { return { id: "11111111-1111-4111-8111-111111111111", name: "Acme" }; },
    async findByIdempotency() { return null; },
    async loadTrustObject() {
      return {
        enterpriseId: "11111111-1111-4111-8111-111111111111",
        subjectType: "ai_agent",
        subjectId: "entity:epsilon",
        displayIdentity: "Agent Epsilon",
        subject: { type: "ai_agent", id: "entity:epsilon", displayName: "Agent Epsilon" },
        identityState: "verified",
        authorityState: "verified",
        environmentState: "verified",
        scopeState: "verified",
        evidenceCompleteness: "complete",
        trustState: "verified",
        providerState: "available",
        activeContradictions: [],
        activeIncidents: [],
        activeReviews: [],
        correctiveActions: [],
        trustDnaReference: null,
        continuousTrustReference: null,
        policyId: "policy:release",
        canonicalDigest: "digest:epsilon",
        currentTrustState: "verified",
        trustDnaProfileReference: null,
        continuousTrustStateReference: null,
        contradictionSummary: { count: 0, highestState: null, references: [] },
        activeReviewSummary: { count: 0, required: false, references: [] },
        incidentSummary: { count: 0, highestState: null, references: [] },
        replayReference: null,
        trustMemoryReference: null,
        evidenceGraphNodeReference: null,
        lastEvaluatedAt: new Date().toISOString(),
        policyVersion: "1",
        correlationId: "corr-001",
      };
    },
    async loadConfiguredEvidence() { return []; },
    async loadAuthority() {
      return {
        contractId: "contract:epsilon",
        enterpriseId: "11111111-1111-4111-8111-111111111111",
        subject: { type: "ai_agent", id: "entity:epsilon", displayName: "Agent Epsilon" },
        workflow: { id: "workflow:deploy", objective: "deploy" },
        subjectType: "ai_agent",
        subjectId: "entity:epsilon",
        workflowId: "workflow:deploy",
        authorizedObjective: "deploy",
        requiredIdentityState: "verified",
        requiredAuthority: ["read_repo"],
        requiredEnvironmentState: "verified",
        permittedScope: ["read_repo"],
        permittedProviders: ["hopae"],
        requiredEvidenceTypes: [],
        maximumEvidenceAgeSeconds: 86_400,
        monitoringRequirements: [],
        humanReviewThresholds: [],
        contradictionPolicy: "review",
        incidentThreshold: "material",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revokedAt: null,
        revocationState: "active",
        issuer: "owner:alice",
        approver: "owner:alice",
        policyId: "policy:release",
        policyVersion: "1",
        evidenceReferences: [],
        issuedAt: new Date().toISOString(),
        supersedesContractId: null,
      };
    },
    async loadPolicy() { return { id: "policy:release", version: "1", active: true, validFrom: new Date().toISOString(), validUntil: null, policyHash: "hash", tenantId: "11111111-1111-4111-8111-111111111111" }; },
    async loadPreviousTransaction() { return null; },
    async persistDecision(record) { return { ...record, persistenceStatus: "CREATED" }; },
    async extendEvidenceGraph() { return "graph-ref"; },
    async appendReplay() { return "replay-ref"; },
    async emitTrustMemory() { return "memory-ref"; },
    async requestExternalExecution() { return { configured: false, requestReference: null, acknowledgement: null, outcome: null }; },
    async recordExternalAcknowledgement() { return "ack-ref"; },
    async recordExternalOutcome() { return "outcome-ref"; },
    async resolveOperationalEntity() {
      return { entityId: "entity:epsilon", accountableOwnerId: "owner:alice", canonicalTrustObjectId: "trust:epsilon", lifecycleState: "active", currentAuthorityReferences: ["authority:epsilon"], currentEvidenceState: "current", currentTrustState: "verified", currentConsequenceClassification: "low", providerReferences: ["provider:hopae"], environmentReferences: ["env:prod"], workflowReferences: ["workflow:deploy"], entityType: "ai_agent", enterpriseId: "enterprise:acme", organizationReference: "org:acme", identityProfileReference: "profile:epsilon", canonicalDigest: "digest:epsilon", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), suspendedAt: null, revokedAt: null, supersedesEntityVersionId: null, displayReference: "Agent Epsilon" };
    },
  });

  assert.equal(receipt.operationalEntityId, "entity:epsilon");
  assert.equal(receipt.accountableOwnerId, "owner:alice");
});
