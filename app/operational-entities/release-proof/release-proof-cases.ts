import { evaluateCapabilityGovernance, type CapabilityGovernancePolicy, type ModelGovernanceProjection } from "../../../lib/operational-entities/capability-governance.ts";
import { buildInterAgentConflictReplay, evaluateInterAgentAuthorityConflict, type AgentAuthorityEnvelope, type AgentRelationshipEvidence, type InterAgentConflictPolicy } from "../../../lib/operational-entities/inter-agent-authority-conflict.ts";
import { appendMaterialTrustMemoryEvent } from "../../../lib/operational-entities/federated-evidence.ts";
import { createOperationalEntity } from "../../../lib/operational-entities/operational-entity.ts";
import { evaluateCanonicalTrustDecision } from "../../../src/lib/trust-transaction/canonical.ts";

const evaluatedAt = "2026-08-15T12:00:00.000Z";
const enterpriseId = "release-proof-enterprise";
const digest = (character: string) => character.repeat(64);

function entity(entityId: string, displayReference: string) {
  return createOperationalEntity({
    entityId,
    enterpriseId,
    entityType: "ai_agent",
    displayReference,
    canonicalTrustObjectId: `trust:${entityId}`,
    lifecycleState: "active",
    accountableOwnerId: `owner:${entityId}`,
    organizationReference: "organization:release-proof",
    providerReferences: [],
    identityProfileReference: `identity:${entityId}`,
    currentAuthorityReferences: [`authority:${entityId}`],
    environmentReferences: ["environment:production-eu-west"],
    workflowReferences: ["workflow:protected-configuration"],
    currentTrustState: "verified",
    currentEvidenceState: "current",
    currentConsequenceClassification: "high",
    canonicalDigest: digest(entityId === "agent-beta" ? "a" : entityId === "agent-gamma" ? "b" : "c"),
  });
}

function modelProjection(overrides: Partial<ModelGovernanceProjection> = {}): ModelGovernanceProjection {
  const base: ModelGovernanceProjection = {
    enterpriseId,
    operationalEntityId: "agent-beta",
    modelId: "model:open-weight-operations-assistant-with-a-deliberately-long-release-proof-name",
    modelVersion: "2026.08.15-enterprise-reviewed",
    modelHash: digest("d"),
    fineTuneReference: null,
    deploymentOrigin: "customer-controlled artifact store",
    hostingOperator: "customer infrastructure operator",
    modelFamily: "operations-assistant",
    openClosedClassification: "open_weight",
    capabilityAssessments: [{
      assessmentId: "assessment:enterprise:operations:v1",
      enterpriseId,
      operationalEntityId: "agent-beta",
      assessmentProvider: "Independent Enterprise Evaluation Lab",
      sourcePartyId: "party:enterprise-evaluator",
      assessmentType: "capability_evaluation",
      capabilityClass: "protected_configuration_assistance",
      capabilityThreshold: "approved-with-human-oversight",
      capabilityDimensions: { autonomy: 2, toolUse: true },
      evaluationReference: "evaluation:protected-configuration:v4",
      environmentReference: "environment:production-eu-west",
      assessedModelId: "model:open-weight-operations-assistant-with-a-deliberately-long-release-proof-name",
      assessedModelVersion: "2026.08.15-enterprise-reviewed",
      assessedModelHash: digest("d"),
      assessmentTimestamp: "2026-08-14T09:00:00.000Z",
      validFrom: "2026-08-14T09:00:00.000Z",
      validUntil: "2026-09-14T09:00:00.000Z",
      evidenceDigest: digest("e"),
      confidence: 0.93,
      attribution: "Independent evaluator claim; not a Cyber Sentinels certification.",
    }],
    applicableOversightRegimes: ["enterprise:high-impact-change"],
    safeguardsActive: ["human approval", "sandboxed tools", "change rollback"],
    environmentAttestation: {
      attestationReference: "environment:production-eu-west",
      enterpriseId,
      environment: "production-eu-west",
      runtimeReference: "runtime:container:v1",
      hostingOperator: "customer infrastructure operator",
      toolSet: ["repository:read", "configuration:propose"],
      observedAt: "2026-08-15T10:00:00.000Z",
      expiresAt: "2026-08-16T10:00:00.000Z",
      evidenceProvider: "enterprise runtime attestor",
      sourcePartyId: "party:runtime-operator",
      evidenceDigest: digest("f"),
    },
    enterpriseRiskClassification: "high-impact",
    evidenceTimestamp: "2026-08-15T10:00:00.000Z",
    evidenceExpiry: "2026-08-16T10:00:00.000Z",
    continuityReference: "continuity:model-beta:v1",
    permissionScope: ["repository:read", "configuration:propose"],
  };
  return { ...base, ...overrides };
}

const capabilityPolicy: CapabilityGovernancePolicy = {
  policyReference: "policy:capability-governance:v1",
  requestedAction: "READ",
  requiredCapabilityClass: "protected_configuration_assistance",
  allowedCapabilityClasses: ["protected_configuration_assistance"],
  requiredSafeguards: ["human approval", "sandboxed tools"],
  requireModelHash: true,
  requireEnvironmentAttestation: true,
  requireHumanReviewForEvidenceConflict: true,
  denyWhenSafeguardMissing: false,
};

function authority(entityId: string, effect: AgentAuthorityEnvelope["objective"]["effect"], actionType: string): AgentAuthorityEnvelope {
  const resource = "production:protected-configuration-with-a-deliberately-long-resource-name";
  return {
    enterpriseId,
    operationalEntityId: entityId,
    authorityReference: `authority:${entityId}:protected-configuration`,
    authorityScope: {
      permittedActions: [actionType],
      permittedTools: ["configuration-control"],
      permittedTargets: [resource],
      environments: ["production"],
      dataBoundary: "RESTRICTED",
      financialLimit: null,
      executionLimit: 1,
    },
    objective: { objectiveReference: `objective:${entityId}`, purpose: `${effect} protected configuration`, effect, resource },
    requestedAction: { type: actionType, tool: "configuration-control", target: resource, resource, environment: "production", dataBoundary: "RESTRICTED", consequenceClassification: "high" },
    validFrom: "2026-08-15T00:00:00.000Z",
    expiresAt: "2026-08-16T00:00:00.000Z",
    revokedAt: null,
  };
}

function relationship(overrides: Partial<AgentRelationshipEvidence> = {}): AgentRelationshipEvidence {
  const resource = "production:protected-configuration-with-a-deliberately-long-resource-name";
  return {
    relationshipEvidenceId: "relationship:beta-gamma:protected-configuration",
    enterpriseId,
    sourceAgent: "agent-beta",
    targetAgent: "agent-gamma",
    sharedWorkflow: "workflow:protected-configuration",
    sourceDelegatedObjective: "objective:agent-beta",
    targetDelegatedObjective: "objective:agent-gamma",
    sourceAuthorityReference: "authority:agent-beta:protected-configuration",
    targetAuthorityReference: "authority:agent-gamma:protected-configuration",
    authorityIntersection: [resource],
    sharedResources: [resource],
    sharedCredentialsOrTools: ["configuration-control"],
    interactionType: "observed_action_pair",
    relationshipType: "cooperation",
    observedConditions: [],
    evidenceSource: "runtime observation",
    evidenceProvider: "enterprise runtime monitor",
    sourcePartyId: "party:runtime-operator",
    observedAt: evaluatedAt,
    evidenceDigest: digest("9"),
    independentlyObserved: true,
    ...overrides,
  };
}

const conflictPolicy: InterAgentConflictPolicy = {
  policyReference: "policy:inter-agent-conflict:v1",
  highImpactThreshold: "high",
  denyConditions: [],
  requireHumanArbitrationForHighImpact: true,
};

function canonicalConflictRecord(
  beta: ReturnType<typeof entity>,
  interAgentAuthorityConflict: ReturnType<typeof evaluateInterAgentAuthorityConflict>,
) {
  const workflowId = "10000000-0000-4000-8000-000000000004";
  const trustObject = {
    enterpriseId,
    subjectType: "ai_agent" as const,
    subjectId: beta.entityId,
    displayIdentity: beta.displayReference,
    subject: { type: "ai_agent" as const, id: beta.entityId, displayName: beta.displayReference },
    identityState: "verified" as const,
    authorityState: "verified" as const,
    environmentState: "verified" as const,
    scopeState: "verified" as const,
    evidenceCompleteness: "complete" as const,
    trustState: "verified" as const,
    providerState: "available" as const,
    activeContradictions: [],
    activeIncidents: [],
    activeReviews: [],
    correctiveActions: [],
    trustDnaReference: null,
    continuousTrustReference: null,
    policyId: "policy:canonical",
    canonicalDigest: beta.canonicalDigest,
    currentTrustState: "verified" as const,
    trustDnaProfileReference: null,
    continuousTrustStateReference: null,
    contradictionSummary: { count: 0, highestState: null, references: [] },
    activeReviewSummary: { count: 0, required: false, references: [] },
    incidentSummary: { count: 0, highestState: null, references: [] },
    replayReference: null,
    trustMemoryReference: null,
    evidenceGraphNodeReference: null,
    lastEvaluatedAt: evaluatedAt,
    policyVersion: "1.0.0",
    correlationId: "10000000-0000-4000-8000-000000000010",
  };
  const authorityContract = {
    contractId: "10000000-0000-4000-8000-000000000006",
    enterpriseId,
    subject: trustObject.subject,
    workflow: { id: workflowId, objective: "WRITE" },
    subjectType: "ai_agent" as const,
    subjectId: beta.entityId,
    workflowId,
    authorizedObjective: "WRITE",
    requiredIdentityState: "verified" as const,
    requiredAuthority: ["WRITE"],
    requiredEnvironmentState: "verified" as const,
    permittedScope: ["WRITE"],
    permittedProviders: ["enterprise-runtime"],
    requiredEvidenceTypes: ["IDENTITY_SESSION"],
    maximumEvidenceAgeSeconds: 3_600,
    monitoringRequirements: [],
    humanReviewThresholds: [],
    contradictionPolicy: "pause" as const,
    incidentThreshold: "critical" as const,
    expiresAt: "2026-08-16T00:00:00.000Z",
    revokedAt: null,
    revocationState: "active" as const,
    issuer: "owner:agent-beta",
    approver: "approver:release-proof",
    policyId: "policy:canonical",
    policyVersion: "1.0.0",
    evidenceReferences: [{ type: "authority" as const, id: "authority:agent-beta:protected-configuration" }],
    issuedAt: "2026-08-15T00:00:00.000Z",
  };
  return evaluateCanonicalTrustDecision({
    tenant: { id: enterpriseId, name: "Synthetic release proof" },
    actor: { id: "10000000-0000-4000-8000-000000000002", type: "human", authority: "release-proof" },
    operationalEntity: beta,
    trustObject,
    authority: authorityContract,
    policy: { id: "policy:canonical", version: "1.0.0", active: true, validFrom: "2026-08-15T00:00:00.000Z", validUntil: null, policyHash: digest("1") },
    evidence: [{ reference: "evidence:identity:beta", type: "IDENTITY_SESSION", providerId: "enterprise-runtime", providerEventId: "event:identity:beta", providerSessionId: "session:identity:beta", outcome: "PASSED", observedAt: evaluatedAt, expiresAt: "2026-08-16T00:00:00.000Z", sourceDigest: digest("2"), assuranceLevel: 0.9, correlationId: "10000000-0000-4000-8000-000000000011", sourcePartyId: "party:runtime-operator", sourceClassification: "independently_corroborated" }],
    evidenceFresh: true,
    authorityScopeValid: true,
    previous: null,
    transactionInput: { trustObject: { subjectType: "ai_agent", subjectId: beta.entityId }, action: { type: "WRITE", purpose: "WRITE", resource: "production:protected-configuration", environment: "production", payloadDigest: digest("3") }, idempotencyKey: "capability-conflict-release-proof", requestedAt: evaluatedAt, managedControl: { interAgentAuthorityConflict } },
    requestedAt: evaluatedAt,
    correlationId: "10000000-0000-4000-8000-000000000012",
  });
}

export function buildReleaseProofCases() {
  const alpha = entity("agent-alpha", "Agent Alpha");
  const beta = entity("agent-beta", "Agent Beta · Production Configuration Preservation Authority — Europe West");
  const gamma = entity("agent-gamma", "Agent Gamma · Independent Configuration Replacement Authority — Europe West");
  const currentProjection = modelProjection();
  const currentCapability = evaluateCapabilityGovernance({ entity: beta, current: currentProjection, policy: capabilityPolicy, evaluatedAt });
  const hostedMissingCapability = evaluateCapabilityGovernance({
    entity: beta,
    current: modelProjection({
      openClosedClassification: "hosted_api",
      deploymentOrigin: "recognized hosted model provider",
      hostingOperator: "recognized hosted model provider",
      capabilityAssessments: [],
      environmentAttestation: { ...currentProjection.environmentAttestation!, hostingOperator: "recognized hosted model provider" },
    }),
    policy: capabilityPolicy,
    evaluatedAt,
  });
  const changedEnvironment = {
    ...currentProjection.environmentAttestation!,
    attestationReference: "environment:production-eu-central-new-runtime",
    environment: "production-eu-central",
    runtimeReference: "runtime:container:v2",
  };
  const changedProjection = modelProjection({ modelHash: digest("8"), environmentAttestation: changedEnvironment, hostingOperator: changedEnvironment.hostingOperator });
  const reauthorizationCapability = evaluateCapabilityGovernance({ entity: beta, previous: currentProjection, current: changedProjection, policy: capabilityPolicy, evaluatedAt });

  const compatibleConflict = evaluateInterAgentAuthorityConflict({
    sourceEntity: beta,
    targetEntity: gamma,
    sourceAuthority: authority("agent-beta", "read", "READ"),
    targetAuthority: authority("agent-gamma", "read", "READ"),
    relationshipEvidence: [relationship()],
    policy: conflictPolicy,
    evaluatedAt,
  });
  const reviewInput = {
    sourceEntity: beta,
    targetEntity: gamma,
    sourceAuthority: authority("agent-beta", "preserve", "WRITE"),
    targetAuthority: authority("agent-gamma", "replace", "WRITE"),
    relationshipEvidence: [relationship({ relationshipType: "conflict" as const })],
    evaluatedAt,
  };
  const reviewConflict = evaluateInterAgentAuthorityConflict({ ...reviewInput, policy: conflictPolicy });
  const denyConflict = evaluateInterAgentAuthorityConflict({ ...reviewInput, policy: { ...conflictPolicy, denyConditions: ["COMPETING_RESOURCE_MUTATION"] } });
  const unknownConflict = evaluateInterAgentAuthorityConflict({ ...reviewInput, relationshipEvidence: [relationship({ evidenceDigest: "invalid" })], policy: conflictPolicy });
  const replay = buildInterAgentConflictReplay({ evaluation: reviewConflict, enterpriseId, occurredAt: evaluatedAt });
  const trustMemory = appendMaterialTrustMemoryEvent([], { eventId: `memory:conflict:${reviewConflict.snapshot.digest}`, eventType: "INTER_AGENT_CONFLICT_FIRST_OBSERVED" as const, enterpriseId, occurredAt: evaluatedAt });
  const canonicalTransaction = canonicalConflictRecord(beta, reviewConflict);

  return { alpha, beta, gamma, currentCapability, hostedMissingCapability, reauthorizationCapability, compatibleConflict, reviewConflict, denyConflict, unknownConflict, replay, trustMemory, canonicalTransaction };
}
