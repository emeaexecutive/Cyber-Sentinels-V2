import assert from "node:assert/strict";
import test from "node:test";

import {
  MODEL_STATE_TRUST_INVARIANTS,
  createApprovedModelStateBaseline,
  createCurrentObservedModelState,
  evaluateModelStateIntegrity,
} from "../lib/trust-fabric/model-state-integrity.ts";
import { createAgentAlphaTrustTwinDemo, createTrustTwin } from "../lib/trust-fabric/trust-twin.ts";
import { createSentinelTrustBrief } from "../lib/trust-fabric/sentinel-agents.ts";

const enterpriseId = "7c60bb54-a74c-4ea4-b137-50cb1bc92f4b";
const otherEnterpriseId = "8c60bb54-a74c-4ea4-b137-50cb1bc92f4b";
const measuredAt = "2026-08-24T09:00:00.000Z";
const evaluatedAt = "2026-08-24T09:05:00.000Z";

function common(overrides = {}) {
  return {
    enterpriseId,
    agentId: "agent-alpha",
    modelProvider: "provider:model-registry",
    modelId: "model-approved",
    modelVersion: "1.0.0",
    modelArtifactReference: "artifact:model-approved:1.0.0",
    modelArtifactDigest: "sha256:artifact-approved",
    runtimeProvider: "provider:container-runtime",
    runtimeImageReference: "image:agent-runtime:4",
    runtimeImageDigest: "sha256:runtime-approved",
    inferenceServer: "server:inference-a",
    inferenceServerVersion: "4.2.0",
    configurationDigest: "sha256:configuration-approved",
    adapterConfigurationDigest: "sha256:adapter-approved",
    inferenceConfigurationDigest: "sha256:inference-approved",
    toolParserConfigurationDigest: "sha256:tool-parser-approved",
    templates: {
      agentSystemPromptDigest: "sha256:system-prompt-approved",
      modelTemplateDigest: "sha256:model-template-approved",
      runtimeInferenceConfigurationDigest: "sha256:runtime-inference-approved",
      sourceReference: "registry:templates:approved",
      verificationMechanism: "registry-and-runtime-digest",
    },
    networkConfigurationReference: "network:private-a",
    networkPosture: "PRIVATE_NETWORK",
    authenticationConfigurationReference: "auth:managed-a",
    authenticationPosture: "AUTHENTICATED",
    runtimeEnvironment: "staging",
    evidenceProvider: "runtime-attestation-a",
    evidenceReferences: ["evidence:model-state:a"],
    measuredAt,
    limitations: [],
    endpointLineage: { endpointReference: "endpoint:approved", routingProvider: "router-provider:a", intermediaryReference: "proxy:authenticated-a", finalInferenceServer: "server:inference-a" },
    router: { routerId: "router:a", routerVersion: "2.0", routingPolicyDigest: "sha256:routing-approved", selectedModel: "model-approved:1.0.0", fallbackModel: "model-fallback:1.0.0", selectionReason: "approved primary" },
    ...overrides,
  };
}

function baseline(overrides = {}) {
  return createApprovedModelStateBaseline({
    ...common(overrides),
    agentPassportVersion: "passport:agent-alpha:v3",
    policyVersion: "policy:model-state:v1",
    authorityReference: "authority:agent-alpha:v2",
  });
}

function observation(overrides = {}) {
  return createCurrentObservedModelState({
    ...common(),
    agentPassportVersion: "passport:agent-alpha:v3",
    policyVersion: "policy:model-state:v1",
    authorityReference: "authority:agent-alpha:v2",
    providerAssertions: [],
    ...overrides,
  });
}

function assess(observedOverrides = {}, options = {}) {
  const approved = options.approved ?? baseline();
  const observed = options.observed ?? observation(observedOverrides);
  return evaluateModelStateIntegrity({ enterpriseId, approved, observed, evaluatedAt, validation: { validationReference: "validation:model-state:v1", validatedBaselineDigest: approved.baselineDigest }, ...options });
}

test("approved exact match preserves immutable identity, provenance, and bounded state", () => {
  const result = assess();
  assert.equal(result.modelIntegrityState, "EXACT_MATCH");
  assert.equal(result.templateIntegrity.overall, "SUPPORTED");
  assert.equal(result.artifactIntegrity.state, "SUPPORTED");
  assert.equal(result.runtimeIntegrity.state, "SUPPORTED");
  assert.equal(result.endpointIntegrity.state, "SUPPORTED");
  assert.equal(Object.isFrozen(result.approvedModelState), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.canonicalDecisionBoundary.canAllow, false);
});

test("same model identity with a changed template is drift, not compromise", () => {
  const result = assess({ templates: { ...common().templates, modelTemplateDigest: "sha256:model-template-changed" } });
  assert.equal(result.observedModelState.modelId, result.approvedModelState.modelId);
  assert.equal(result.observedModelState.modelVersion, result.approvedModelState.modelVersion);
  assert.equal(result.templateIntegrity.modelTemplate, "CHANGED");
  assert.ok(result.findings.some((item) => item.code === "MODEL_TEMPLATE_CHANGED" && item.compromiseClaimed === false));
  assert.ok(result.findings.some((item) => item.code === "MODEL_STATE_DRIFT"));
});

test("artifact mismatch and unexplained change preserve material findings", () => {
  const result = assess({ modelArtifactDigest: "sha256:artifact-observed-other" });
  assert.equal(result.artifactIntegrity.state, "MISMATCH");
  for (const code of ["RUNTIME_MODEL_ARTIFACT_MISMATCH", "MODEL_STATE_DRIFT", "MODEL_STATE_CHANGE_ORIGIN_UNRESOLVED"]) assert.ok(result.findings.some((item) => item.code === code), code);
  assert.ok(result.trustMemoryEvents.some((item) => item.eventType === "MODEL_ARTIFACT_MISMATCH"));
});

test("approved configuration update remains attributable and expected", () => {
  const approved = baseline();
  const result = assess({ configurationDigest: "sha256:configuration-approved-v2" }, {
    approved,
    provenance: { classification: "APPROVED_CONFIGURATION_CHANGE", actorOrProvider: "principal:release-owner", approvalReference: "approval:model-config:v2", deploymentOrChangeReference: "change:model-config:v2", evidenceReferences: ["evidence:approval:v2"] },
    validation: { validationReference: "validation:model-state:v2", validatedBaselineDigest: approved.baselineDigest, reassessmentReference: "reassessment:model-config:v2" },
  });
  assert.equal(result.modelIntegrityState, "EXPECTED_CHANGE");
  assert.equal(result.stateChangeProvenance.classification, "APPROVED_CONFIGURATION_CHANGE");
  assert.equal(result.findings.some((item) => item.code === "MODEL_STATE_DRIFT"), false);
  assert.equal(result.findings.some((item) => item.code === "MODEL_STATE_CHANGE_ORIGIN_UNRESOLVED"), false);
});

test("endpoint, network exposure, authentication removal, and router switch remain separate evidence", () => {
  const cases = [
    [{ endpointLineage: { ...common().endpointLineage, endpointReference: "endpoint:unexpected" } }, "MODEL_ENDPOINT_CHANGED"],
    [{ networkPosture: "EXTERNALLY_REACHABLE" }, "MODEL_NETWORK_EXPOSURE_CHANGED"],
    [{ authenticationPosture: "UNAUTHENTICATED" }, "MODEL_RUNTIME_AUTH_CHANGED"],
    [{ router: { ...common().router, selectedModel: "model-fallback:1.0.0" } }, "MODEL_ROUTER_UNEXPECTED_SWITCH"],
  ];
  for (const [overrides, code] of cases) {
    const result = assess(overrides);
    assert.ok(result.findings.some((item) => item.code === code), code);
    assert.ok(result.requiredVerification.includes("VERIFY_MODEL_STATE"));
  }
});

test("material state change invalidates validation and requires reassessment", () => {
  const approved = baseline();
  const result = evaluateModelStateIntegrity({ enterpriseId, approved, observed: observation({ inferenceServerVersion: "5.0.0" }), evaluatedAt, validation: { validationReference: "validation:old", validatedBaselineDigest: approved.baselineDigest } });
  assert.equal(result.validationLineage.status, "REASSESSMENT_REQUIRED");
  assert.deepEqual(result.validationLineage.findings, ["VALIDATION_REASSESSMENT_REQUIRED", "REVALIDATION_REQUIRED"]);
  assert.ok(result.requiredVerification.includes("REVALIDATION"));
  assert.ok(result.trustMemoryEvents.some((item) => item.eventType === "VALIDATION_INVALIDATED"));
});

test("hardware/runtime corroboration supports a provider-neutral match", () => {
  const stateDigest = "sha256:corroborated-state";
  const result = assess({}, { observed: observation({ providerAssertions: [
    { providerClass: "RUNTIME_SECURITY_PROVIDER", providerKey: "runtime-provider", stateDigest, evidenceReference: "evidence:runtime", observedAt: measuredAt },
    { providerClass: "EDGE_ATTESTATION_PROVIDER", providerKey: "hardware-provider", stateDigest, evidenceReference: "evidence:hardware", observedAt: measuredAt, hardwareBacked: true },
  ] }) });
  assert.equal(result.modelIntegrityState, "SUPPORTED_MATCH");
  assert.equal(result.providerNeutralEvidence.length, 3);
  assert.ok(result.providerNeutralEvidence.some((item) => item.evidenceContext?.hardwareBacked === true));
});

test("provider disagreement remains visible and no provider becomes canonical", () => {
  const result = assess({}, { observed: observation({ providerAssertions: [
    { providerClass: "RUNTIME_SECURITY_PROVIDER", providerKey: "runtime-a", stateDigest: "sha256:a", evidenceReference: "evidence:a", observedAt: measuredAt },
    { providerClass: "MODEL_EVALUATION_PROVIDER", providerKey: "registry-b", stateDigest: "sha256:b", evidenceReference: "evidence:b", observedAt: measuredAt },
  ] }) });
  assert.equal(result.modelIntegrityState, "PROVIDER_CONFLICT");
  assert.equal(result.templateIntegrity.overall, "CONFLICTING");
  assert.ok(result.findings.some((item) => item.code === "MODEL_PROVIDER_DISAGREEMENT"));
});

test("decision-time snapshot and retrospective advisory keep known-now separate from learned-later", () => {
  const advisory = { advisoryReference: "advisory:runtime:77", learnedAt: "2026-08-25T10:00:00.000Z", evidenceReferences: ["evidence:advisory:77"], affectedAgents: ["agent-alpha"], affectedSessions: ["session:1"], affectedTransactions: ["transaction:1"], affectedDeployments: ["deployment:1"], affectedActions: ["action:1"], affectedOutcomes: ["outcome:1"] };
  const result = assess({}, { retrospectiveAdvisory: advisory, actionReference: "action:1", destinationReference: "destination:1", outcomeReference: "outcome:1" });
  assert.equal(result.retrospectiveReview.knownAtActionTime.observationDigest, result.observedModelState.observationDigest);
  assert.equal(result.retrospectiveReview.learnedLater.advisoryReference, advisory.advisoryReference);
  assert.equal(result.retrospectiveReview.recommendation, "RETROSPECTIVE_MODEL_STATE_REVIEW_RECOMMENDED");
  assert.equal(result.retrospectiveReview.exploitationAssumed, false);
  assert.ok(result.replayEvents.some((item) => item.eventType === "RETROSPECTIVE_MODEL_STATE_REVIEW_OPENED"));
});

test("restored state creates material memory without erasing earlier drift", () => {
  const previous = assess({ templates: { ...common().templates, modelTemplateDigest: "sha256:drift" } });
  const restored = assess({}, { previousAssessment: previous });
  assert.equal(restored.modelIntegrityState, "EXACT_MATCH");
  assert.ok(restored.trustMemoryEvents.some((item) => item.eventType === "MODEL_STATE_RESTORED"));
  assert.equal(previous.findings.some((item) => item.code === "MODEL_STATE_DRIFT"), true);
});

test("raw weights, proprietary template bodies, and secrets are rejected", () => {
  assert.throws(() => createApprovedModelStateBaseline({ ...baseline(), weights: [1, 2, 3] }), /not permitted/i);
  assert.throws(() => createApprovedModelStateBaseline({ ...baseline(), templates: { ...baseline().templates, body: "proprietary template" } }), /not permitted/i);
  assert.throws(() => createCurrentObservedModelState({ ...observation(), apiKey: "provider-secret-value" }), /not permitted/i);
});

test("cross-tenant and cross-agent model state fail closed", () => {
  const approved = baseline();
  assert.throws(() => evaluateModelStateIntegrity({ enterpriseId, approved, observed: observation({ enterpriseId: otherEnterpriseId }), evaluatedAt }), /TENANT_SCOPE_MISMATCH/);
  assert.throws(() => evaluateModelStateIntegrity({ enterpriseId, approved, observed: observation({ agentId: "agent-other" }), evaluatedAt }), /AGENT_SCOPE_MISMATCH/);
});

test("existing graph, replay, and Trust Memory carry the required model-state lineage", () => {
  const result = assess({ templates: { ...common().templates, modelTemplateDigest: "sha256:changed" } }, { actionReference: "action:1", destinationReference: "destination:1", outcomeReference: "outcome:1" });
  for (const nodeType of ["AGENT", "MODEL", "MODEL_ARTIFACT", "RUNTIME", "TEMPLATE", "CONFIGURATION", "INTEGRITY_MEASUREMENT", "AUTHORITY", "ACTION", "DESTINATION", "OUTCOME"]) assert.ok(result.graphProjection.nodes.some((item) => item.nodeType === nodeType), nodeType);
  for (const eventType of ["MODEL_STATE_BASELINE_ESTABLISHED", "MODEL_STATE_OBSERVED", "MODEL_STATE_INTEGRITY_EVALUATED", "CONSEQUENTIAL_ACTION_REQUESTED"]) assert.ok(result.replayEvents.some((item) => item.eventType === eventType), eventType);
  assert.ok(result.trustMemoryEvents.some((item) => item.eventType === "MODEL_TEMPLATE_CHANGED"));
});

test("Trust Twin, Forecast, Adaptive Verification, and Sentinel consume drift but cannot decide", () => {
  const modelState = assess({ authenticationPosture: "UNAUTHENTICATED" });
  const demo = createAgentAlphaTrustTwinDemo();
  const baselineTwin = demo.baseline;
  const twin = createTrustTwin({
    enterpriseId,
    entity: { id: baselineTwin.entityId, type: baselineTwin.entityType },
    owner: baselineTwin.owner,
    purpose: baselineTwin.purpose,
    evaluatedAt,
    forecastInput: { enterpriseId, subject: { id: baselineTwin.entityId, type: baselineTwin.entityType }, horizon: "NEXT_CONSEQUENTIAL_ACTION", evaluatedAt, policyReference: baselineTwin.policyReference, conditions: baselineTwin.trustForecast.conditions },
    consequenceReach: baselineTwin.consequenceReach,
    previousTwin: baselineTwin,
    actionContext: { type: "write_repository", purpose: "controlled_repository_access", environment: "production" },
    authorityContext: { reference: "authority:agent-alpha:v2", scopeValid: true },
    modelStateIntegrity: modelState,
  });
  const brief = createSentinelTrustBrief({ enterpriseId, currentTwin: twin, evaluatedAt });
  assert.equal(twin.modelIntegrityState, "UNDER_REVIEW");
  assert.ok(twin.trustForecast.forecastSignals.includes("MODEL_RUNTIME_AUTH_CHANGED"));
  assert.ok(twin.adaptiveVerification.missingEvidence.includes("VERIFY_MODEL_STATE"));
  assert.equal(twin.trustForecast.canonicalDecisionBoundary.forecastCanDeny, false);
  assert.equal(modelState.canonicalDecisionBoundary.canDeny, false);
  assert.equal(brief.canonicalDecision, null);
  assert.equal(brief.canonicalBoundary.sentinelCanDeny, false);
  assert.ok(brief.learningEpisode.conditionsObserved.includes("MODEL_STATE_DRIFT"));
});

test("all trust invariant templates are recommended and disabled", () => {
  const result = assess();
  assert.deepEqual(result.trustInvariants.map((item) => item.code), [...MODEL_STATE_TRUST_INVARIANTS]);
  assert.ok(result.trustInvariants.every((item) => item.enabled === false && item.disposition === "RECOMMENDED_DISABLED"));
});
