import { evaluateScopeContinuity } from "./evaluator.ts";
import { buildScopeContinuityArtifacts } from "./integrations.ts";
import { defaultScopeContinuityPolicy, type EnvironmentAttestation, type ExecutionContextDeclaration, type ScopeAuthorizationLease, type ScopeContinuityEvaluationInput } from "./types.ts";

const enterpriseId = "11111111-1111-4111-8111-111111111111";
const contextId = "22222222-2222-4222-8222-222222222222";
const leaseId = "33333333-3333-4333-8333-333333333333";
const now = "2026-07-31T12:00:00.000Z";

const declaration: ExecutionContextDeclaration = {
  id: contextId, enterpriseId, subjectType: "ai_agent", subjectId: "agent:scope-demo", workflowId: "workflow:scope-demo", executionId: "execution:scope-demo", environmentClass: "simulation", internetAccessExpected: false, productionAccessExpected: false,
  permittedNetworkZones: ["simulation-zone"], permittedDomains: ["simulated-target.internal"], permittedTargetIdentifiers: ["simulated-target.internal"], testHarnessProvider: "harness:controlled-demo", declarationSourceType: "operator_assertion", declarationSourceId: "operator:demo-owner", accountableOwnerType: "human", accountableOwnerId: "operator:demo-owner",
  validFrom: "2026-07-31T11:00:00.000Z", validUntil: "2026-07-31T13:00:00.000Z", declaredAt: "2026-07-31T11:00:00.000Z", evidenceReference: "evidence:declaration:scope-demo", integrityMetadata: { status: "verified", algorithm: "SHA-256", digest: "a".repeat(64) }, createdAt: "2026-07-31T11:00:00.000Z",
};

const authorization: ScopeAuthorizationLease = {
  id: leaseId, enterpriseId, subjectType: "ai_agent", subjectId: declaration.subjectId, authorizedObjective: "scope-demo", permittedTools: ["http-client"], permittedActions: ["request-target"], permittedTargets: ["simulated-target.internal"], permittedEnvironments: ["simulation"], maximumDurationSeconds: 7200, maximumActionCount: 5, consumedActionCount: 0, dataClassificationBoundary: ["synthetic"], approverType: "human", approverId: "operator:demo-owner", issuedAt: "2026-07-31T11:00:00.000Z", expiresAt: "2026-07-31T13:00:00.000Z", requiredAttestationTypes: ["independent_attestation"], contradictionResponsePolicy: "deny", authorityReference: "authority:scope-demo", evidenceReferences: ["evidence:authority:scope-demo"],
};

function attestation(overrides: Partial<EnvironmentAttestation> = {}): EnvironmentAttestation {
  return {
    id: "44444444-4444-4444-8444-444444444444", enterpriseId, executionContextId: contextId, subjectType: declaration.subjectType, subjectId: declaration.subjectId, observationType: "environment-isolation", observedEnvironmentClass: "simulation", internetReachable: false, productionReachable: false, observedNetworkZones: ["simulation-zone"], observedDomains: ["simulated-target.internal"], observedTargetIdentifiers: ["simulated-target.internal"], egressPolicyState: "enforced", isolationControlState: "confirmed", monitoringState: "available", attestationSourceType: "independent_attestation", attestationSourceId: "attestor:independent-demo", providerOrThirdPartyIdentity: "attestor:independent-demo", sourceAuthority: "independent-control-plane", observedAt: "2026-07-31T11:59:00.000Z", receivedAt: "2026-07-31T11:59:01.000Z", confidence: 0.95, freshness: "current", evidenceStrength: "independently_attested", evidenceReference: "evidence:attestation:scope-demo", integrityMetadata: { status: "verified" }, createdAt: "2026-07-31T11:59:01.000Z", ...overrides,
  };
}

function evaluate(input: ScopeContinuityEvaluationInput) {
  const decision = evaluateScopeContinuity(input);
  return { input, decision, artifacts: buildScopeContinuityArtifacts(input, decision) };
}

export function criticalContradictionScenario() {
  const input: ScopeContinuityEvaluationInput = {
    declaration,
    authorization,
    attestations: [attestation({ observedEnvironmentClass: "production", internetReachable: true, productionReachable: true, observedDomains: ["external-production.example"], observedTargetIdentifiers: ["external-production.example"], egressPolicyState: "not_enforced", isolationControlState: "absent", evidenceReference: "evidence:attestation:critical" })],
    request: { action: "request-target", objective: "scope-demo", tool: "http-client", targetIdentifier: "external-production.example", targetEnvironmentClass: "production", dataClassification: "synthetic", requestedAt: now },
    policy: defaultScopeContinuityPolicy, evaluatedAt: now, correlationId: "55555555-5555-4555-8555-555555555555",
  };
  return evaluate(input);
}

export function consistentContextScenario() {
  const input: ScopeContinuityEvaluationInput = {
    declaration,
    authorization,
    attestations: [attestation()],
    request: { action: "request-target", objective: "scope-demo", tool: "http-client", targetIdentifier: "simulated-target.internal", targetEnvironmentClass: "simulation", dataClassification: "synthetic", requestedAt: now },
    policy: defaultScopeContinuityPolicy, evaluatedAt: now, correlationId: "66666666-6666-4666-8666-666666666666",
  };
  return evaluate(input);
}
