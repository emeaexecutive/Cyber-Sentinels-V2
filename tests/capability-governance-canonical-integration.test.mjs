import assert from "node:assert/strict";
import test from "node:test";

import { evaluateCapabilityGovernance } from "../lib/operational-entities/capability-governance.ts";
import { evaluateInterAgentAuthorityConflict } from "../lib/operational-entities/inter-agent-authority-conflict.ts";
import { createOperationalEntity } from "../lib/operational-entities/operational-entity.ts";
import { evaluateCanonicalTrustDecision } from "../src/lib/trust-transaction/canonical.ts";

const at = "2026-08-14T12:00:00.000Z";
const tenantId = "10000000-0000-4000-8000-000000000001";
const entityId = "10000000-0000-4000-8000-000000000003";

function operationalEntity(id = entityId) {
  return createOperationalEntity({
    entityId: id,
    enterpriseId: tenantId,
    entityType: "ai_agent",
    displayReference: id === entityId ? "Agent Beta" : "Agent Gamma",
    canonicalTrustObjectId: `trust:${id}`,
    lifecycleState: "active",
    accountableOwnerId: `owner:${id}`,
    organizationReference: "org:acme",
    providerReferences: [],
    identityProfileReference: `profile:${id}`,
    currentAuthorityReferences: [`authority:${id}`],
    environmentReferences: ["environment:approved"],
    workflowReferences: ["workflow:repository"],
    currentTrustState: "verified",
    currentEvidenceState: "current",
    currentConsequenceClassification: "low",
    canonicalDigest: id === entityId ? "a".repeat(64) : "b".repeat(64),
  });
}

function capabilityEvaluation(overrides = {}) {
  const assessment = {
    assessmentId: "assessment:capability:1",
    enterpriseId: tenantId,
    operationalEntityId: entityId,
    assessmentProvider: "Enterprise Evaluator",
    sourcePartyId: "party:evaluator",
    assessmentType: "capability_evaluation",
    capabilityClass: "repository_assistance",
    capabilityThreshold: "approved",
    capabilityDimensions: { autonomy: 1 },
    evaluationReference: "evaluation:1",
    environmentReference: "environment:approved",
    assessedModelId: "model:one",
    assessedModelVersion: "1.0.0",
    assessedModelHash: "c".repeat(64),
    assessmentTimestamp: at,
    validFrom: "2026-08-14T00:00:00.000Z",
    validUntil: "2026-08-15T00:00:00.000Z",
    evidenceDigest: "d".repeat(64),
    confidence: 0.9,
    attribution: "Enterprise evaluator claim",
  };
  return evaluateCapabilityGovernance({
    entity: operationalEntity(),
    current: {
      enterpriseId: tenantId,
      operationalEntityId: entityId,
      modelId: "model:one",
      modelVersion: "1.0.0",
      modelHash: "c".repeat(64),
      fineTuneReference: null,
      deploymentOrigin: "enterprise artifact store",
      hostingOperator: "operator:enterprise",
      modelFamily: "family:one",
      openClosedClassification: "open_weight",
      capabilityAssessments: overrides.capabilityAssessments ?? [assessment],
      applicableOversightRegimes: [],
      safeguardsActive: ["sandbox"],
      environmentAttestation: {
        attestationReference: "environment:approved",
        enterpriseId: tenantId,
        environment: "staging",
        runtimeReference: "runtime:v1",
        hostingOperator: "operator:enterprise",
        toolSet: ["repository-tool"],
        observedAt: at,
        expiresAt: "2026-08-15T00:00:00.000Z",
        evidenceProvider: "runtime:attestor",
        sourcePartyId: "party:runtime",
        evidenceDigest: "e".repeat(64),
      },
      enterpriseRiskClassification: "low",
      evidenceTimestamp: at,
      evidenceExpiry: "2026-08-15T00:00:00.000Z",
      continuityReference: "continuity:1",
      permissionScope: ["READ"],
    },
    policy: {
      policyReference: "policy:capability:1",
      requestedAction: "READ",
      requiredCapabilityClass: "repository_assistance",
      allowedCapabilityClasses: ["repository_assistance"],
      requiredSafeguards: ["sandbox"],
      requireModelHash: true,
      requireEnvironmentAttestation: true,
      requireHumanReviewForEvidenceConflict: true,
      denyWhenSafeguardMissing: false,
    },
    evaluatedAt: at,
  });
}

function authorityEnvelope(id, effect) {
  return {
    enterpriseId: tenantId,
    operationalEntityId: id,
    authorityReference: `authority:${id}`,
    authorityScope: {
      permittedActions: ["WRITE"],
      permittedTools: ["repository-tool"],
      permittedTargets: ["production:configuration"],
      environments: ["production"],
      dataBoundary: "RESTRICTED",
      financialLimit: null,
      executionLimit: 1,
      notBefore: "2026-08-14T00:00:00.000Z",
      expiresAt: "2026-08-15T00:00:00.000Z",
    },
    objective: { objectiveReference: `objective:${id}`, purpose: `${effect} configuration`, effect, resource: "production:configuration" },
    requestedAction: { type: "WRITE", tool: "repository-tool", target: "production:configuration", resource: "production:configuration", environment: "production", dataBoundary: "RESTRICTED", consequenceClassification: "high" },
    validFrom: "2026-08-14T00:00:00.000Z",
    expiresAt: "2026-08-15T00:00:00.000Z",
    revokedAt: null,
  };
}

function interAgentEvaluation() {
  const gammaId = "10000000-0000-4000-8000-000000000009";
  return evaluateInterAgentAuthorityConflict({
    sourceEntity: operationalEntity(),
    targetEntity: operationalEntity(gammaId),
    sourceAuthority: authorityEnvelope(entityId, "preserve"),
    targetAuthority: authorityEnvelope(gammaId, "replace"),
    relationshipEvidence: [{
      relationshipEvidenceId: "relationship:beta:gamma:1",
      enterpriseId: tenantId,
      sourceAgent: entityId,
      targetAgent: gammaId,
      sharedWorkflow: "workflow:configuration",
      sourceDelegatedObjective: `objective:${entityId}`,
      targetDelegatedObjective: `objective:${gammaId}`,
      sourceAuthorityReference: `authority:${entityId}`,
      targetAuthorityReference: `authority:${gammaId}`,
      authorityIntersection: ["WRITE:production:configuration"],
      sharedResources: ["production:configuration"],
      sharedCredentialsOrTools: ["repository-tool"],
      interactionType: "concurrent_mutation_request",
      relationshipType: "conflict",
      observedConditions: [],
      evidenceSource: "runtime",
      evidenceProvider: "enterprise-runtime",
      sourcePartyId: "party:runtime",
      observedAt: at,
      evidenceDigest: "f".repeat(64),
      independentlyObserved: true,
    }],
    policy: { policyReference: "policy:conflict:1", highImpactThreshold: "high", denyConditions: [], requireHumanArbitrationForHighImpact: true },
    evaluatedAt: at,
  });
}

function canonical(managedControl) {
  const entity = operationalEntity();
  const trustObject = {
    enterpriseId: tenantId,
    subjectType: "ai_agent",
    subjectId: entityId,
    displayIdentity: "Agent Beta",
    subject: { type: "ai_agent", id: entityId, displayName: "Agent Beta" },
    identityState: "verified", authorityState: "verified", environmentState: "verified", scopeState: "verified",
    evidenceCompleteness: "complete", trustState: "verified", providerState: "available",
    activeContradictions: [], activeIncidents: [], activeReviews: [], correctiveActions: [],
    trustDnaReference: null, continuousTrustReference: null, policyId: "policy:canonical",
    canonicalDigest: "stored", currentTrustState: "verified", trustDnaProfileReference: null, continuousTrustStateReference: null,
    contradictionSummary: { count: 0, highestState: null, references: [] },
    activeReviewSummary: { count: 0, required: false, references: [] },
    incidentSummary: { count: 0, highestState: null, references: [] },
    replayReference: null, trustMemoryReference: null, evidenceGraphNodeReference: null,
    lastEvaluatedAt: at, policyVersion: "1.0.0", correlationId: "10000000-0000-4000-8000-000000000010",
  };
  const contract = {
    contractId: "10000000-0000-4000-8000-000000000006",
    enterpriseId: tenantId,
    subject: trustObject.subject,
    workflow: { id: "10000000-0000-4000-8000-000000000004", objective: "READ" },
    subjectType: "ai_agent", subjectId: entityId, workflowId: "10000000-0000-4000-8000-000000000004",
    authorizedObjective: "READ", requiredIdentityState: "verified", requiredAuthority: ["READ"], requiredEnvironmentState: "verified",
    permittedScope: ["READ"], permittedProviders: ["enterprise-evaluator"], requiredEvidenceTypes: ["IDENTITY_SESSION"],
    maximumEvidenceAgeSeconds: 3600, monitoringRequirements: [], humanReviewThresholds: [], contradictionPolicy: "pause", incidentThreshold: "critical",
    expiresAt: "2026-08-15T00:00:00.000Z", revokedAt: null, revocationState: "active", issuer: "owner", approver: "approver",
    policyId: "policy:canonical", policyVersion: "1.0.0", evidenceReferences: [{ type: "authority", id: "authority:evidence" }], issuedAt: "2026-08-14T00:00:00.000Z",
  };
  return evaluateCanonicalTrustDecision({
    tenant: { id: tenantId, name: "Acme" },
    actor: { id: "10000000-0000-4000-8000-000000000002", type: "human", authority: "session" },
    operationalEntity: entity,
    trustObject,
    authority: contract,
    policy: { id: "policy:canonical", version: "1.0.0", active: true, validFrom: "2026-08-14T00:00:00.000Z", validUntil: null, policyHash: "1".repeat(64) },
    evidence: [{ reference: "evidence:identity", type: "IDENTITY_SESSION", providerId: "enterprise-evaluator", providerEventId: "event:1", providerSessionId: "session:1", outcome: "PASSED", observedAt: at, expiresAt: "2026-08-15T00:00:00.000Z", sourceDigest: "2".repeat(64), assuranceLevel: 0.9, correlationId: "10000000-0000-4000-8000-000000000011", sourcePartyId: "party:evaluator", sourceClassification: "independently_corroborated" }],
    evidenceFresh: true,
    authorityScopeValid: true,
    previous: null,
    transactionInput: { trustObject: { subjectType: "ai_agent", subjectId: entityId }, action: { type: "READ", purpose: "READ", resource: "repository:a", environment: "sandbox", payloadDigest: "3".repeat(64) }, idempotencyKey: "governance-integration-1", requestedAt: at, managedControl },
    requestedAt: at,
    correlationId: "10000000-0000-4000-8000-000000000012",
  });
}

test("capability PASS remains eligible for the existing canonical ALLOW", () => {
  const capabilityGovernance = capabilityEvaluation();
  const record = canonical({ capabilityGovernance });
  assert.equal(capabilityGovernance.decision, "ALLOW");
  assert.equal(record.decision, "ALLOW");
  assert.equal(record.decisionTimeSnapshot.capabilityGovernance.digest, capabilityGovernance.snapshot.digest);
  assert.ok(record.evidenceReferences.some((reference) => reference.id === "assessment:capability:1"));
});

test("capability UNKNOWN maps to canonical REVIEW and prevents a separate decision vocabulary", () => {
  const capabilityGovernance = capabilityEvaluation({ capabilityAssessments: [] });
  const record = canonical({ capabilityGovernance });
  assert.equal(capabilityGovernance.status, "UNKNOWN");
  assert.equal(record.decision, "REVIEW");
  assert.ok(record.reasonCodes.includes("CAPABILITY_ASSESSMENT_MISSING"));
});

test("confirmed high-consequence conflict maps to canonical REVIEW with frozen evidence", () => {
  const interAgentAuthorityConflict = interAgentEvaluation();
  const record = canonical({ interAgentAuthorityConflict });
  assert.equal(record.decision, "REVIEW");
  assert.ok(record.reasonCodes.includes("INTER_AGENT_CONFLICT"));
  assert.equal(record.decisionTimeSnapshot.interAgentAuthorityConflict.digest, interAgentAuthorityConflict.snapshot.digest);
  assert.ok(record.evidenceReferences.some((reference) => reference.id === "relationship:beta:gamma:1"));
  assert.ok(Object.isFrozen(record.decisionTimeSnapshot));
  assert.throws(() => { record.decisionTimeSnapshot.interAgentAuthorityConflict.decision = "ALLOW"; }, TypeError);
});

test("managed-control snapshot bound to another entity is denied", () => {
  const capabilityGovernance = capabilityEvaluation();
  const forged = { ...capabilityGovernance, snapshot: { ...capabilityGovernance.snapshot, operationalEntityId: "entity:other" } };
  const record = canonical({ capabilityGovernance: forged });
  assert.equal(record.decision, "DENY");
  assert.ok(record.reasonCodes.includes("MANAGED_CONTROL_ENTITY_BINDING_INVALID"));
});
