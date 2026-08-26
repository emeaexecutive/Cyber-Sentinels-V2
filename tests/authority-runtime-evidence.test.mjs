import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateAuthorityIntegrity,
  mapAimsCompatibleEvidence,
} from "../lib/trust-fabric/authority-integrity.ts";
import { createPreActionTrustForecastInput } from "../lib/trust-fabric/trust-forecast.ts";
import { createTrustTwin, simulateCounterfactualTrust } from "../lib/trust-fabric/trust-twin.ts";
import { createSentinelTrustBrief } from "../lib/trust-fabric/sentinel-agents.ts";
import { hashCanonical } from "../src/lib/trust-core/hash.ts";

const enterpriseId = "10000000-0000-4000-8000-000000000001";
const evaluatedAt = "2026-08-26T12:00:00.000Z";

function toolSchema() {
  const parameterSchema = [{
    parameterName: "repository",
    parameterCategory: "destination_boundary",
    allowedProvenanceClasses: ["authority_bound", "runtime_derived"],
    materiality: "critical",
    required: true,
    modelVisible: false,
    mutableAfterApproval: false,
    defaultState: "server_resolved",
  }];
  const securityCriticalFields = ["repository"];
  return {
    toolId: "tool:repository",
    toolVersion: "3.0.0",
    parameterSchema,
    securityCriticalFields,
    schemaDigest: hashCanonical({ parameterSchema, securityCriticalFields }),
    sourceProvider: "capability_registry",
    reviewedAt: evaluatedAt,
  };
}

function parameterContract(overrides = {}) {
  return {
    parameterName: "repository",
    parameterClass: "destination_boundary",
    expectedProvenance: ["AUTHORITY_BOUND", "RUNTIME_DERIVED"],
    authorityReference: "authority:alpha:8",
    allowedValues: ["sha256:" + "a".repeat(64)],
    allowedScope: ["repository:approved"],
    runtimeBinding: "runtime:eu-1",
    humanBinding: null,
    destinationBinding: "github:approved/repository",
    validationRequirement: "REQUIRED",
    securityCritical: true,
    ...overrides,
  };
}

function parameterObservation(overrides = {}) {
  return {
    parameterName: "repository",
    observedProvenance: "AUTHORITY_BOUND",
    valueDigestOrMaskedValue: "sha256:" + "a".repeat(64),
    scopeReference: "repository:approved",
    runtimeBinding: "runtime:eu-1",
    humanBinding: null,
    destinationBinding: "github:approved/repository",
    evidenceProvider: "authority_service",
    evidenceReference: "evidence:parameter:repository",
    observedAt: evaluatedAt,
    confidence: 0.95,
    limitations: [],
    ...overrides,
  };
}

function runtimeEvidence(overrides = {}) {
  return {
    runtimeProvider: "runtime_provider",
    runtimeInstance: "runtime:eu-1",
    runtimeSession: "runtime-session:001",
    policyReference: "runtime-policy:9",
    authorityCeiling: ["read_repository"],
    delegatedChildRuntime: null,
    credentialReference: "credential:repo-read:v4",
    enforcementDecision: "ALLOW",
    enforcementResult: "ENFORCED",
    observedExecution: "read_repository",
    destinationOutcome: "ACCEPTED",
    overriddenParameterNames: [],
    runtimeId: "runtime:eu-1",
    runtimeType: "MCP_RUNTIME",
    workloadId: "workload:repository-agent",
    agentId: "agent:alpha",
    sessionId: "runtime-session:001",
    authorityReference: "authority:alpha:8",
    authorityVersion: "8",
    effectivePermissions: ["read_repository"],
    effectiveScope: ["repository:approved"],
    credentialReferenceDigest: "sha256:" + "b".repeat(64),
    credentialVersion: "4",
    credentialExpiry: "2026-08-26T13:00:00.000Z",
    delegatedPrincipal: "human:alice",
    destinationScope: ["github:approved/repository"],
    measurementTime: evaluatedAt,
    provider: "runtime_provider",
    confidence: 0.95,
    limitations: [],
    declaredAuthority: ["read_repository"],
    controlPlaneAuthority: ["read_repository"],
    destinationEffectiveAuthority: ["read_repository"],
    ...overrides,
  };
}

function authorizationChange(overrides = {}) {
  return {
    changeId: "change:revocation:8",
    changeType: "authority_reduced",
    subjectReference: "agent:alpha",
    effectiveAt: "2026-08-26T11:00:00.000Z",
    receivingProvider: "iam_provider",
    policyReevaluation: "reevaluation:8",
    privilegeAttenuation: "attenuation:8",
    credentialRefreshOrRevocation: "credential-rotation:4",
    runtimeObservation: "old_authority_rejected",
    destinationObservation: "old_authority_rejected",
    providerReportedApplied: true,
    independentlyConfirmed: true,
    postChangeUseObservedAt: "2026-08-26T11:04:00.000Z",
    evidenceReferences: ["evidence:control-plane", "evidence:runtime", "evidence:destination"],
    authorityVersionBefore: "7",
    authorityVersionAfter: "8",
    requestedAt: "2026-08-26T11:00:00.000Z",
    controlPlaneAcknowledgedAt: "2026-08-26T11:00:05.000Z",
    runtimeUpdatedAt: "2026-08-26T11:01:00.000Z",
    credentialUpdatedAt: "2026-08-26T11:02:00.000Z",
    downstreamUpdatedAt: "2026-08-26T11:03:00.000Z",
    destinationConfirmedAt: "2026-08-26T11:04:00.000Z",
    ...overrides,
  };
}

function aimsEvidence(overrides = {}) {
  return {
    enterpriseId,
    provider: "internal_test_provider",
    source: "AIMS_COMPATIBLE_FIXTURE",
    evidenceReference: "evidence:aims:001",
    observedAt: evaluatedAt,
    correlationId: "correlation:aims:001",
    agentIdentity: "agent:alpha",
    principal: "human:alice",
    delegator: "role:repository-reader",
    authorityGrant: "authority:alpha:8",
    authorityScope: ["read_repository"],
    authorizationVersion: "8",
    delegationChain: ["human:alice", "role:repository-reader", "delegation:alpha", "agent:alpha"],
    tool: "tool:repository",
    action: "read_repository",
    resource: "repository:approved",
    executionContext: "runtime-session:001",
    credentialReferenceDigest: "sha256:" + "b".repeat(64),
    policy: "policy:repository:8",
    authorizationChange: "DOWNGRADE",
    destination: "github:approved/repository",
    executionResult: "SUCCEEDED",
    parameterBindings: [{ parameterName: "repository", provenance: "AUTHORITY_BOUND", valueDigestOrMaskedValue: "sha256:" + "a".repeat(64) }],
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    enterpriseId,
    actionId: "action:repository:001",
    actionTimestamp: evaluatedAt,
    principalReference: "human:alice",
    agentPassportReference: "agent-passport:alpha",
    authorityLineageReference: "authority:alpha:8",
    capabilityProvenanceReference: "capability:repository:3",
    toolSchema: toolSchema(),
    parameters: [{
      tool: "tool:repository",
      toolVersion: "3.0.0",
      parameterName: "repository",
      parameterCategory: "destination_boundary",
      parameterProvenance: "authority_bound",
      valueDigestOrMaskedValue: "sha256:" + "a".repeat(64),
      materiality: "critical",
      timestamp: evaluatedAt,
      evidenceProvider: "authority_service",
      policyReference: "policy:repository:8",
      configurationPinning: "identity_context_derived",
    }],
    parameterAuthorityContracts: [parameterContract()],
    parameterAuthorityObservations: [parameterObservation()],
    modelProposalDigest: "c".repeat(64),
    finalParametersDigest: "d".repeat(64),
    runtimeParametersDigest: "e".repeat(64),
    trustedContextDigest: "f".repeat(64),
    tenant: { authoritativeTenant: enterpriseId, authoritativeWorkspace: enterpriseId, sourceIdentity: "session:alice", runtimeTenant: enterpriseId, requestedTenant: enterpriseId, modelSuppliedTenant: null, destinationTenant: enterpriseId },
    credentialDestination: { credentialReference: "credential:repo-read:v4", credentialOwnerTenant: enterpriseId, approvedDestinations: ["github:approved/repository"], requestedDestination: "github:approved/repository", actualDestination: "github:approved/repository", proxyOrIntermediary: null, proxyProvenance: null, redirectChain: [] },
    runtime: runtimeEvidence(),
    authorizationChanges: [authorizationChange()],
    delegatedSubject: { originatingHuman: "human:alice", originatingSystem: null, organization: "organization:acme", agent: "agent:alpha", delegatedSubject: "human:alice", actingSubject: "agent:alpha", delegationEvidence: "delegation:alpha", task: "read_repository", purpose: "repository_support", authorizationDecision: "ALLOW" },
    aimsEvidence: [aimsEvidence()],
    policyReference: "policy:repository:8",
    trustInvariantReferences: ["SECURITY_BOUNDARY_PARAMETERS_ARE_NOT_MODEL_CONTROLLED", "AUTHORIZATION_CHANGE_PROPAGATES_TO_DESTINATION"],
    outcomeEvidenceReferences: ["outcome:repository:001"],
    remediationEvidenceReferences: [],
    ...overrides,
  };
}

function codes(assessment) { return assessment.findings.map((item) => item.code); }

test("authority-bound parameter and exact runtime/destination authority match", () => {
  const assessment = evaluateAuthorityIntegrity(input());
  assert.equal(assessment.parameterAuthority[0].state, "MATCH");
  assert.equal(assessment.runtimeAuthority.runtimeState, "MATCH");
  assert.equal(assessment.runtimeAuthority.destinationState, "MATCH");
  assert.equal(assessment.authorizationPropagation.state, "PROPAGATION_CONFIRMED");
  assert.deepEqual(assessment.minimumPreventativeControls, []);
});

test("model-controlled prohibited parameter is a non-malicious integrity finding", () => {
  const assessment = evaluateAuthorityIntegrity(input({ parameterAuthorityObservations: [parameterObservation({ observedProvenance: "MODEL_PROPOSED" })] }));
  assert.equal(assessment.parameterAuthority[0].state, "PROVENANCE_MISMATCH");
  assert.ok(codes(assessment).includes("MODEL_CONTROLLED_SECURITY_BOUNDARY"));
  assert.equal(assessment.findings.find((item) => item.code === "MODEL_CONTROLLED_SECURITY_BOUNDARY").malicious, false);
  assert.ok(assessment.minimumPreventativeControls.includes("PIN_PARAMETER_TO_AUTHORITY"));
});

test("policy can explicitly permit a model-proposed parameter without blanket rejection", () => {
  const assessment = evaluateAuthorityIntegrity(input({
    parameterAuthorityContracts: [parameterContract({ expectedProvenance: ["MODEL_PROPOSED"], allowedValues: [], allowedScope: [], runtimeBinding: null, destinationBinding: null })],
    parameterAuthorityObservations: [parameterObservation({ observedProvenance: "MODEL_PROPOSED", scopeReference: null, runtimeBinding: null, destinationBinding: null })],
  }));
  assert.equal(assessment.parameterAuthority[0].state, "SUPPORTED");
  assert.equal(codes(assessment).includes("MODEL_CONTROLLED_SECURITY_BOUNDARY"), false);
});

test("missing parameter provenance and destination drift stay explainable", () => {
  const missing = evaluateAuthorityIntegrity(input({ parameterAuthorityObservations: [] }));
  assert.equal(missing.parameterAuthority[0].state, "INSUFFICIENT_EVIDENCE");
  assert.ok(codes(missing).includes("UNRESOLVED_PARAMETER_PROVENANCE"));
  const drift = evaluateAuthorityIntegrity(input({ parameterAuthorityObservations: [parameterObservation({ destinationBinding: "github:other/repository" })] }));
  assert.equal(drift.parameterAuthority[0].state, "OUT_OF_SCOPE");
  assert.ok(codes(drift).includes("DESTINATION_BINDING_LOST"));
});

test("provider disagreement remains conflicting parameter evidence", () => {
  const assessment = evaluateAuthorityIntegrity(input({ parameterAuthorityObservations: [parameterObservation({ providerAssertions: [
    { providerId: "policy_provider", provenance: "AUTHORITY_BOUND", valueDigestOrMaskedValue: "sha256:" + "a".repeat(64), evidenceReference: "evidence:policy" },
    { providerId: "runtime_provider", provenance: "MODEL_PROPOSED", valueDigestOrMaskedValue: "sha256:" + "9".repeat(64), evidenceReference: "evidence:runtime-conflict" },
  ] })] }));
  assert.equal(assessment.parameterAuthority[0].state, "CONFLICTING");
  assert.ok(codes(assessment).includes("PROVIDER_CONFLICT"));
});

test("runtime and destination authority mismatches are represented separately", () => {
  const assessment = evaluateAuthorityIntegrity(input({ runtime: runtimeEvidence({ effectivePermissions: ["write_repository"], destinationEffectiveAuthority: ["admin_repository"] }) }));
  assert.equal(assessment.runtimeAuthority.runtimeState, "MISMATCH");
  assert.equal(assessment.runtimeAuthority.destinationState, "MISMATCH");
  assert.ok(codes(assessment).includes("RUNTIME_AUTHORITY_MISMATCH"));
  assert.ok(codes(assessment).includes("DESTINATION_AUTHORITY_MISMATCH"));
});

test("propagation distinguishes confirmed, partial, pending, possible stale, and confirmed stale", () => {
  assert.equal(evaluateAuthorityIntegrity(input()).authorizationPropagation.state, "PROPAGATION_CONFIRMED");
  assert.equal(evaluateAuthorityIntegrity(input({ authorizationChanges: [authorizationChange({ destinationObservation: "not_observed", destinationConfirmedAt: null })] })).authorizationPropagation.state, "PARTIAL_PROPAGATION");
  assert.equal(evaluateAuthorityIntegrity(input({ authorizationChanges: [authorizationChange({ runtimeObservation: "not_observed", destinationObservation: "not_observed", independentlyConfirmed: false, postChangeUseObservedAt: null, runtimeUpdatedAt: null, destinationConfirmedAt: null })] })).authorizationPropagation.state, "PROPAGATION_PENDING");
  assert.equal(evaluateAuthorityIntegrity(input({ authorizationChanges: [authorizationChange({ runtimeObservation: "old_authority_accepted", destinationObservation: "not_observed", postChangeUseObservedAt: null, independentlyConfirmed: false })] })).authorizationPropagation.state, "STALE_AUTHORITY_POSSIBLE");
  const confirmed = evaluateAuthorityIntegrity(input({ authorizationChanges: [authorizationChange({ runtimeObservation: "old_authority_accepted", destinationObservation: "old_authority_accepted", independentlyConfirmed: false })] }));
  assert.equal(confirmed.authorizationPropagation.state, "STALE_AUTHORITY_CONFIRMED");
  assert.ok(codes(confirmed).includes("STALE_AUTHORITY_STILL_ACTIVE"));
});

test("authority version and credential rotation timestamps remain replayable", () => {
  const assessment = evaluateAuthorityIntegrity(input());
  const timeline = assessment.authorizationPropagation.timeline[0];
  assert.equal(timeline.authorityVersionBefore, "7");
  assert.equal(timeline.authorityVersionAfter, "8");
  assert.equal(timeline.credentialUpdatedAt, "2026-08-26T11:02:00.000Z");
  assert.ok(assessment.replayEvents.some((item) => item.eventType === "AUTHORIZATION_PROPAGATION_TIMELINE_RECORDED"));
});

test("AIMS-compatible evidence maps identity, delegation, authorization, and execution without becoming canonical", () => {
  const mapped = mapAimsCompatibleEvidence(aimsEvidence());
  assert.equal(mapped.canonicalMappings.principal, "human:alice");
  assert.equal(mapped.canonicalMappings.authorizationVersion, "8");
  assert.deepEqual(mapped.canonicalMappings.delegationChain, ["human:alice", "role:repository-reader", "delegation:alpha", "agent:alpha"]);
  assert.equal(mapped.canonicalMappings.executionResult, "SUCCEEDED");
  assert.equal(mapped.providerIsCanonical, false);
  assert.equal(mapped.aimsDependency, false);
  assert.equal(mapped.missingHopsInvented, false);
});

test("AIMS evidence and authority assessments reject cross-tenant input", () => {
  const otherTenant = "10000000-0000-4000-8000-000000000099";
  assert.throws(() => evaluateAuthorityIntegrity(input({ aimsEvidence: [aimsEvidence({ enterpriseId: otherTenant })] })), /AIMS_EVIDENCE_TENANT_SCOPE_MISMATCH/);
});

test("existing Graph, Replay, Trust Memory, and receipt summary carry the extended chain", () => {
  const assessment = evaluateAuthorityIntegrity(input());
  for (const nodeType of ["PRINCIPAL", "DELEGATION", "AGENT", "AUTHORITY_VERSION", "TOOL", "PARAMETER_BINDING", "RUNTIME_AUTHORITY", "ACTION", "DESTINATION_AUTHORITY", "OUTCOME"]) assert.ok(assessment.graphProjection.nodes.some((item) => item.nodeType === nodeType), nodeType);
  assert.ok(assessment.replayEvents.some((item) => item.eventType === "AIMS_COMPATIBLE_EVIDENCE_MAPPED"));
  assert.ok(assessment.trustMemoryEvents.some((item) => item.eventType === "PROPAGATION_CONFIRMED"));
  assert.equal(assessment.receiptSummary.authorityVersion, "8");
  assert.equal(assessment.receiptSummary.runtimeAuthorityEvidenceReference.includes("runtime_provider"), true);
  assert.equal(assessment.receiptSummary.destinationAuthorityEvidenceReference, assessment.receiptSummary.runtimeAuthorityEvidenceReference);
  assert.equal(assessment.receiptSummary.propagationState, "PROPAGATION_CONFIRMED");
});

test("Forecast, Twin, Sentinel, and verification consume authority evidence without taking decision authority", () => {
  const assessment = evaluateAuthorityIntegrity(input({ runtime: runtimeEvidence({ effectivePermissions: ["write_repository"] }) }));
  const forecastInput = createPreActionTrustForecastInput({
    enterpriseId,
    subject: { type: "AI_AGENT", id: "agent:alpha" },
    evaluatedAt,
    policyReference: "policy:repository:8",
    actorReference: "actor:alice",
    authorityReference: "authority:alpha:8",
    authorityScopeValid: true,
    actionReference: "read_repository:repository:approved",
    toolReference: "tool:repository",
    parameterProvenanceReference: "evidence:parameter:repository",
    runtimeReference: assessment.runtimeAuthority.runtimeEvidenceReference,
    monitoringCoverage: "covered",
    destinationReference: "github:approved/repository",
    humanApproval: "not_required",
    consequence: "moderate",
    evidenceReferences: ["evidence:parameter:repository", "evidence:runtime"],
    evidenceFresh: true,
    evidenceComplete: true,
    recentChanges: [],
    authorityIntegrityFindings: codes(assessment),
    canonicalTransactionReference: "transaction:pending",
  });
  const twin = createTrustTwin({
    enterpriseId,
    entity: { id: "agent:alpha", type: "AI_AGENT" },
    owner: "human:alice",
    purpose: "read_repository",
    evaluatedAt,
    forecastInput,
    consequenceReach: { systems: ["github"], credentials: ["credential:repo-read:v4"], tools: ["tool:repository"], dataClasses: ["source-code"], destinations: ["github:approved/repository"], downstreamAgents: [], productionResources: [], financialExposure: [], humanImpactingSystems: [] },
    actionContext: { type: "read_repository", purpose: "repository_support", environment: "staging" },
    authorityContext: { reference: "authority:alpha:8", scopeValid: true },
    authorityIntegrity: assessment,
  });
  const sentinel = createSentinelTrustBrief({ enterpriseId, currentTwin: twin, evaluatedAt });
  assert.deepEqual(twin.declaredAuthority, ["read_repository"]);
  assert.deepEqual(twin.runtimeEffectiveAuthority, ["write_repository"]);
  assert.equal(twin.trustForecast.canonicalDecisionBoundary.forecastCanDeny, false);
  assert.equal(twin.adaptiveVerification.canonicalAuthorityBoundary.verificationCanGrantAuthority, false);
  assert.equal(sentinel.canonicalDecision, null);
  assert.equal(sentinel.canonicalBoundary.decisionAuthority, "CANONICAL_TRUST_FABRIC_ONLY");
  assert.equal(sentinel.sentinelRole, "AUTHORITY");
  assert.ok(twin.adaptiveVerification.missingEvidence.includes("VERIFY_RUNTIME_AUTHORITY"));
});

test("authority counterfactuals remain isolated, non-executing, and non-canonical", () => {
  const assessment = evaluateAuthorityIntegrity(input());
  const forecastInput = createPreActionTrustForecastInput({ enterpriseId, subject: { type: "AI_AGENT", id: "agent:alpha" }, evaluatedAt, policyReference: "policy:repository:8", actorReference: "actor:alice", authorityReference: "authority:alpha:8", authorityScopeValid: true, actionReference: "read_repository:repository:approved", toolReference: "tool:repository", parameterProvenanceReference: "evidence:parameter:repository", runtimeReference: "runtime:eu-1", monitoringCoverage: "covered", destinationReference: "github:approved/repository", humanApproval: "not_required", consequence: "moderate", evidenceReferences: ["evidence:baseline"], evidenceFresh: true, evidenceComplete: true, recentChanges: [], authorityIntegrityFindings: [], canonicalTransactionReference: "transaction:pending" });
  const twin = createTrustTwin({ enterpriseId, entity: { id: "agent:alpha", type: "AI_AGENT" }, owner: "human:alice", purpose: "read_repository", evaluatedAt, forecastInput, consequenceReach: { systems: ["github"], credentials: [], tools: ["tool:repository"], dataClasses: ["source-code"], destinations: ["github:approved/repository"], downstreamAgents: [], productionResources: [], financialExposure: [], humanImpactingSystems: [] }, authorityIntegrity: assessment });
  const simulation = simulateCounterfactualTrust({ enterpriseId, currentTwin: twin, evaluatedAt: "2026-08-26T12:10:00.000Z", changes: [{ changeType: "MODEL_CONTROL_DESTINATION" }, { changeType: "DELAY_RUNTIME_AUTHORITY_REFRESH" }, { changeType: "DELAY_CREDENTIAL_ROTATION" }] });
  assert.equal(simulation.simulated, true);
  assert.equal(simulation.executionPerformed, false);
  assert.equal(simulation.persistedAsCanonicalExecution, false);
  assert.ok(simulation.projectedTwin.trustForecast.forecastSignals.includes("MODEL_CONTROLLED_SECURITY_BOUNDARY"));
});

test("raw credentials, tokens, and secret-like values are never accepted or persisted", () => {
  assert.throws(() => evaluateAuthorityIntegrity({ ...input(), accessToken: "forbidden" }), /Raw secrets are forbidden/);
  assert.throws(() => evaluateAuthorityIntegrity(input({ runtime: runtimeEvidence({ credentialReferenceDigest: "Bearer abcdefghijklmnopqrstuvwxyz" }) })), /Secret-like values are forbidden/);
  const serialized = JSON.stringify(evaluateAuthorityIntegrity(input()));
  assert.equal(serialized.includes("Bearer "), false);
  assert.equal(serialized.includes("rawCredential"), false);
});
