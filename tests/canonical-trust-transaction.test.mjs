import assert from "node:assert/strict";
import test from "node:test";

import { executeCanonicalTrustTransaction } from "../src/lib/trust-transaction/canonical.ts";
import { authorizeValeTrust } from "../src/lib/trust-fabric/vale.ts";
import { normalizeProviderNeutralEvidence, referenceProviderAdapters } from "../lib/providers/adapters.ts";
import { hashCanonical } from "../src/lib/trust-core/hash.ts";
import { createAgentAlphaTrustTwinDemo } from "../lib/trust-fabric/trust-twin.ts";
import { createSentinelOperations } from "../lib/trust-fabric/sentinel-agents.ts";
import { createApprovedModelStateBaseline, createCurrentObservedModelState } from "../lib/trust-fabric/model-state-integrity.ts";

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
    async loadTrustObject() { calls.push("resolveTrustObject"); return options.trustObject ?? trustObject(); },
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

function canonicalModelState(templateDigest = "sha256:model-template-approved") {
  const common = {
    enterpriseId: tenantId, agentId: subjectId, modelProvider: "provider:model-registry", modelId: "settlement-model", modelVersion: "1.0.0",
    modelArtifactReference: "artifact:settlement-model:1", modelArtifactDigest: "sha256:model-artifact-approved", runtimeProvider: "provider:runtime",
    runtimeImageReference: "image:settlement-agent:1", runtimeImageDigest: "sha256:runtime-approved", inferenceServer: "server:settlement-inference", inferenceServerVersion: "1.0.0",
    configurationDigest: "sha256:configuration-approved", adapterConfigurationDigest: "sha256:adapter-approved", inferenceConfigurationDigest: "sha256:inference-approved", toolParserConfigurationDigest: "sha256:tool-parser-approved",
    templates: { agentSystemPromptDigest: "sha256:system-prompt-approved", modelTemplateDigest: templateDigest, runtimeInferenceConfigurationDigest: "sha256:runtime-inference-approved", sourceReference: "registry:settlement-template", verificationMechanism: "provider-digest" },
    networkConfigurationReference: "network:settlement-private", networkPosture: "PRIVATE_NETWORK", authenticationConfigurationReference: "auth:settlement", authenticationPosture: "AUTHENTICATED",
    runtimeEnvironment: "sandbox", evidenceProvider: "runtime-attestation", evidenceReferences: ["evidence:model-state:canonical"], measuredAt: "2026-08-06T09:45:00.000Z", limitations: [],
    endpointLineage: { endpointReference: "endpoint:settlement", routingProvider: "router:settlement", intermediaryReference: "proxy:settlement", finalInferenceServer: "server:settlement-inference" },
    router: { routerId: "router:settlement", routerVersion: "1", routingPolicyDigest: "sha256:routing-approved", selectedModel: "settlement-model:1.0.0", fallbackModel: null, selectionReason: "approved primary" },
  };
  return common;
}

test("canonical evaluator remains the sole decision engine for model-state evidence", async () => {
  const approved = createApprovedModelStateBaseline({ ...canonicalModelState(), agentPassportVersion: "passport:settlement:v1", policyVersion: "policy-settlement:1.0.0", authorityReference: authority().contractId });
  const observedExact = createCurrentObservedModelState({ ...canonicalModelState(), agentPassportVersion: "passport:settlement:v1", policyVersion: "policy-settlement:1.0.0", authorityReference: authority().contractId, providerAssertions: [] });
  const observedDrift = createCurrentObservedModelState({ ...canonicalModelState("sha256:model-template-unapproved"), agentPassportVersion: "passport:settlement:v1", policyVersion: "policy-settlement:1.0.0", authorityReference: authority().contractId, providerAssertions: [] });

  const exact = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "model-state-exact", decisionType: "AI_DEPLOYMENT_TRUST_GATE", deploymentContext: { approvedModelState: approved, currentObservedModelState: observedExact, modelValidation: { validationReference: "validation:settlement:v1", validatedBaselineDigest: approved.baselineDigest } } }), dependencies().deps);
  assert.equal(exact.decisionTimeSnapshot.modelStateIntegrity.modelIntegrityState, "EXACT_MATCH");
  assert.equal(exact.modelStateIntegrity.canonicalDecisionBoundary.canAllow, false);
  assert.equal(exact.trustForecast.canonicalDecisionBoundary.forecastCanDeny, false);

  const drift = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "model-state-drift", decisionType: "AI_DEPLOYMENT_TRUST_GATE", deploymentContext: { approvedModelState: approved, currentObservedModelState: observedDrift, modelValidation: { validationReference: "validation:settlement:v1", validatedBaselineDigest: approved.baselineDigest } } }), dependencies().deps);
  assert.equal(drift.decision, "REVIEW");
  assert.ok(drift.reasonCodes.includes("MODEL_STATE_DRIFT"));
  assert.equal(drift.deploymentGate.assuranceFreshness, "ASSURANCE_INVALIDATED_BY_CHANGE");
  assert.equal(drift.deploymentGate.validationState, "REASSESSMENT_REQUIRED");
  assert.equal(drift.sentinelTrustBrief.canonicalDecision, null);

  const invalidAuthority = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "model-state-authority-invalid", action: { ...transactionInput().action, type: "transfer_funds" }, decisionType: "AI_DEPLOYMENT_TRUST_GATE", deploymentContext: { approvedModelState: approved, currentObservedModelState: observedExact, modelValidation: { validationReference: "validation:settlement:v1", validatedBaselineDigest: approved.baselineDigest } } }), dependencies().deps);
  assert.equal(invalidAuthority.decision, "DENY");
  assert.ok(invalidAuthority.reasonCodes.includes("AUTHORITY_SCOPE_INVALID"));
});

test("authority-integrity findings flow through the canonical evaluator and existing artifacts", async () => {
  const parameterSchema = [{ parameterName: "tenant_id", parameterCategory: "tenant_boundary", allowedProvenanceClasses: ["authority_bound"], materiality: "critical", required: true, modelVisible: false, mutableAfterApproval: false, defaultState: "server_resolved" }];
  const securityCriticalFields = ["tenant_id"];
  const toolSchema = { toolId: "tool:repository", toolVersion: "2.0.0", parameterSchema, securityCriticalFields, schemaDigest: hashCanonical({ parameterSchema, securityCriticalFields }), sourceProvider: "capability_registry", reviewedAt: requestedAt };
  const { deps, calls } = dependencies();
  const receipt = await executeCanonicalTrustTransaction(transactionInput({
    idempotencyKey: "authority-integrity-canonical-1",
    managedControl: {
      authorityIntegrity: {
        enterpriseId: tenantId, actionId: "action:canonical-1", actionTimestamp: requestedAt, principalReference: `human:${actorId}`,
        agentPassportReference: `agent-passport:${subjectId}`, authorityLineageReference: authority().contractId, capabilityProvenanceReference: "capability:repository:2",
        toolSchema, parameters: [{ tool: "tool:repository", toolVersion: "2.0.0", parameterName: "tenant_id", parameterCategory: "tenant_boundary", parameterProvenance: "model_controlled", valueDigestOrMaskedValue: "sha256:" + "9".repeat(64), materiality: "critical", timestamp: requestedAt, evidenceProvider: "runtime_provider", policyReference: "policy-settlement:1.0.0", configurationPinning: "model_selectable" }],
        modelProposalDigest: "1".repeat(64), finalParametersDigest: "2".repeat(64), runtimeParametersDigest: "3".repeat(64), trustedContextDigest: "4".repeat(64),
        tenant: { authoritativeTenant: tenantId, authoritativeWorkspace: tenantId, sourceIdentity: `session:${actorId}`, runtimeTenant: tenantId, requestedTenant: tenantId, modelSuppliedTenant: null, destinationTenant: tenantId },
        credentialDestination: null, runtime: null, authorizationChanges: [], delegatedSubject: { originatingHuman: `human:${actorId}`, originatingSystem: null, organization: "organization:acme", agent: `agent:${subjectId}`, delegatedSubject: "invoice-owner:4488", actingSubject: `agent:${subjectId}`, delegationEvidence: "delegation:invoice-4488", task: "settle_invoice", purpose: "settle_invoice", authorizationDecision: "ALLOW" },
        policyReference: "policy-settlement:1.0.0", trustInvariantReferences: ["SECURITY_BOUNDARY_PARAMETERS_ARE_NOT_MODEL_CONTROLLED"], outcomeEvidenceReferences: [],
      },
    },
  }), deps);
  assert.equal(receipt.decision, "REVIEW");
  assert.ok(receipt.reasonCodes.includes("MODEL_CONTROLLED_SECURITY_BOUNDARY"));
  assert.equal(receipt.authorityIntegrity?.findings[0].malicious, false);
  assert.equal(receipt.decisionTimeSnapshot.authorityIntegrity?.actionTimeEvidence.toolSchema.schemaDigest, toolSchema.schemaDigest);
  assert.deepEqual(receipt.authorityEvidenceSummary, receipt.decisionTimeSnapshot.authorityIntegrity?.receiptSummary);
  assert.equal(receipt.authorityEvidenceSummary?.parameterProvenanceSummary[0].provenance, "MODEL_PROPOSED");
  assert.equal(receipt.authorityEvidenceSummary?.propagationState, "INSUFFICIENT_EVIDENCE");
  assert.ok(receipt.providerNeutralEvidence.some((item) => item.evidenceType === "MODEL_CONTROLLED_SECURITY_BOUNDARY"));
  for (const artifact of ["extendEvidenceGraph", "appendReplay", "emitMaterialTrustMemory"]) assert.ok(calls.includes(artifact));
  assert.equal(calls.includes("requestExternalExecutionIfAllowed"), false);
});

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

test("repository authority persists an out-of-scope write as canonical DENY with reconstructable artifacts", async () => {
  const repositoryAuthority = authority({
    workflow: { id: workflowId, objective: "controlled_repository_access" },
    authorizedObjective: "controlled_repository_access",
    requiredAuthority: ["read_repository"],
    permittedScope: ["read_repository"],
    monitoringRequirements: [],
  });
  const { deps, calls } = dependencies({ authority: repositoryAuthority });
  let persistedAction = null;
  const persist = deps.persistDecision;
  deps.persistDecision = async (record) => {
    persistedAction = record.action.type;
    return persist(record);
  };
  const receipt = await executeCanonicalTrustTransaction(transactionInput({
    idempotencyKey: "repository-write-deny-1",
    action: {
      type: "write_repository",
      purpose: "controlled_repository_access",
      resource: "repository:a",
      environment: "sandbox",
      payloadDigest: "f".repeat(64),
    },
  }), deps);

  assert.equal(receipt.decision, "DENY");
  assert.equal(receipt.trustState, "suspended");
  assert.equal(receipt.action.type, "write_repository");
  assert.equal(persistedAction, "write_repository");
  assert.ok(receipt.reasonCodes.includes("AUTHORITY_SCOPE_INVALID"));
  assert.equal(receipt.evidenceGraphReference, "graph-1");
  assert.equal(receipt.replayReference, "replay-1");
  assert.equal(receipt.trustMemoryReference, "memory-1");
  assert.match(receipt.transactionId, /^[0-9a-f-]{36}$/i);
  assert.match(receipt.decisionReference, /^[0-9a-f-]{36}$/i);
  for (const step of ["persistDecision", "extendEvidenceGraph", "appendReplay", "emitMaterialTrustMemory"]) assert.ok(calls.includes(step));
  assert.equal(calls.includes("requestExternalExecutionIfAllowed"), false);
  assert.equal(calls.includes("recordExternalAcknowledgement"), false);
  assert.equal(calls.some((item) => item.startsWith("recordExternalOutcome")), false);
});

test("repository authority allows read through the same canonical evaluator", async () => {
  const repositoryAuthority = authority({
    workflow: { id: workflowId, objective: "controlled_repository_access" },
    authorizedObjective: "controlled_repository_access",
    requiredAuthority: ["read_repository"],
    permittedScope: ["read_repository"],
    monitoringRequirements: [],
  });
  const { deps, calls } = dependencies({ authority: repositoryAuthority });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({
    idempotencyKey: "repository-read-allow-1",
    action: {
      type: "read_repository",
      purpose: "controlled_repository_access",
      resource: "repository:a",
      environment: "sandbox",
      payloadDigest: "e".repeat(64),
    },
  }), deps);

  assert.equal(receipt.decision, "ALLOW");
  assert.equal(receipt.action.type, "read_repository");
  assert.ok(receipt.reasonCodes.includes("AUTHORITY_SCOPE_VALID"));
  assert.ok(calls.includes("persistDecision"));
  assert.ok(calls.includes("requestExternalExecutionIfAllowed"));
});

test("Agent Alpha golden path predicts pressure, requests proof, and leaves the canonical deny to the Fabric", async () => {
  const demo = createAgentAlphaTrustTwinDemo();
  const operations = createSentinelOperations({
    enterpriseId: demo.baseline.enterpriseId,
    twins: [demo.baseline],
    simulations: [demo.projected],
    generatedAt: "2026-08-24T09:20:00.000Z",
  });
  const brief = operations.trustBriefs[0];

  assert.equal(brief.attention, "INVESTIGATING");
  assert.equal(demo.projected.projectedTwin.trustPressure.value, 81);
  assert.equal(demo.projected.projectedTwin.trustBudget.remaining, 19);
  assert.ok(brief.hypothesis.requiredProof.includes("VERIFY_RUNTIME"));
  assert.ok(brief.hypothesis.requiredProof.includes("VERIFY_DESTINATION"));
  for (const control of ["REDUCE_AUTHORITY", "PIN_DESTINATION", "REFRESH_RUNTIME_ATTESTATION"]) {
    assert.ok(demo.controlled.proposedChanges.some((change) => change.changeType === control));
  }
  assert.equal(brief.canonicalDecision, null);
  assert.equal(brief.canonicalBoundary.decisionAuthority, "CANONICAL_TRUST_FABRIC_ONLY");

  const repositoryAuthority = authority({
    workflow: { id: workflowId, objective: "controlled_repository_access" },
    authorizedObjective: "controlled_repository_access",
    requiredAuthority: ["read_repository"],
    permittedScope: ["read_repository"],
    monitoringRequirements: [],
  });
  const { deps, calls } = dependencies({ authority: repositoryAuthority });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({
    idempotencyKey: "agent-alpha-golden-write-deny-1",
    action: {
      type: "write_repository",
      purpose: "controlled_repository_access",
      resource: "repository:a",
      environment: "sandbox",
      payloadDigest: "9".repeat(64),
    },
  }), deps);

  assert.equal(receipt.decision, "DENY");
  assert.ok(receipt.reasonCodes.includes("AUTHORITY_SCOPE_INVALID"));
  assert.equal(receipt.externalExecution.requested, false);
  assert.equal(calls.includes("requestExternalExecutionIfAllowed"), false);
  for (const artifact of ["persistDecision", "extendEvidenceGraph", "appendReplay", "emitMaterialTrustMemory"]) assert.ok(calls.includes(artifact));
  assert.match(receipt.digest, /^[a-f0-9]{64}$/);
});

test("a delegated authorization denial persists its exact reason in the canonical receipt", async () => {
  const { deps, calls } = dependencies();
  const receipt = await executeCanonicalTrustTransaction(transactionInput({
    idempotencyKey: "delegated-scope-denial",
    managedControl: {
      authorization: {
        decision: "DENY",
        reasonCodes: ["ACTION_OUT_OF_DELEGATED_SCOPE"],
      },
    },
  }), deps);
  assert.equal(receipt.decision, "DENY");
  assert.ok(receipt.reasonCodes.includes("ACTION_OUT_OF_DELEGATED_SCOPE"));
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

test("review-gated transactions downgrade continuity to review-required instead of interruption", async () => {
  const { deps } = dependencies({ evidence: [], operationalEntity: operationalEntity({ currentConsequenceClassification: "high" }) });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "continuity-review-gated-1" }), deps);
  assert.equal(receipt.decision, "REVIEW");
  assert.equal(receipt.continuitySignals.identityContinuity, "review_required");
  assert.equal(receipt.continuitySignals.monitoringCoverage, "not_observed");
  assert.equal(receipt.continuitySignals.consequentialImpactLineage.humanReviewRequired, true);
});

test("AI deployment gates route material change to review with reauthorization required", async () => {
  const { deps } = dependencies();
  const receipt = await executeCanonicalTrustTransaction(transactionInput({
    idempotencyKey: "deployment-gate-review-1",
    decisionType: "AI_DEPLOYMENT_TRUST_GATE",
    deploymentContext: {
      environment: "production",
      release: "2026.08.19",
      materialChanges: ["MODEL_CHANGED", "TOOL_PERMISSION_CHANGED"],
      assuranceEvidence: [{
        providerKey: "internal_assurance",
        assessmentId: "assessment-001",
        subject: "agent:alpha",
        environment: "production",
        scope: "deployment",
        methodReference: "safety-eval",
        occurredAt: requestedAt,
        receivedAt: requestedAt,
        expiresAt: "2026-08-20T10:00:00.000Z",
        modelVersion: "v1",
        toolSet: ["repo.read"],
        permissionContext: "read",
        assurance: 0.82,
        confidence: "high",
        evidenceDigest: "d".repeat(64),
        findingReferences: ["finding-1"],
        retestReference: null,
      }],
    },
  }), deps);
  assert.equal(receipt.decision, "REVIEW");
  assert.equal(receipt.deploymentGate?.assuranceFreshness, "ASSURANCE_INVALIDATED_BY_CHANGE");
  assert.equal(receipt.deploymentGate?.reauthorizationRequired, true);
  assert.ok(receipt.reasonCodes.includes("REAUTHORIZATION_REQUIRED"));
  assert.ok(receipt.reasonCodes.includes("ASSURANCE_INVALIDATED_BY_CHANGE"));
});

test("Mythos-style assurance evidence is ingested as provider-neutral evidence without becoming a separate decision engine", async () => {
  const normalized = normalizeProviderNeutralEvidence({
    providerId: "mythos-compatible-test-provider",
    providerName: "Mythos-compatible test provider",
    evidenceType: "AI_BEHAVIOR_ASSESSMENT",
    observedAt: requestedAt,
    outcome: "PASSED",
    evidenceDigest: "e".repeat(64),
    correlationId: "assurance-correlation-1",
    providerClass: "AI_ASSURANCE_PROVIDER",
    providerKey: "mythos-compatible-test-provider",
    environment: "production",
    scope: "deployment",
    modelVersion: "v2",
    permissionContext: "read",
    assurance: 0.91,
    confidence: "high",
    findingReferences: ["finding-2"],
    retestReference: "retest-2",
  });
  assert.equal(normalized.providerClass, "AI_ASSURANCE_PROVIDER");
  assert.equal(normalized.providerKey, "mythos-compatible-test-provider");
  assert.equal(normalized.environment, "production");
  assert.equal(normalized.scope, "deployment");
  assert.equal(normalized.modelVersion, "v2");
  assert.equal(normalized.assurance, 0.91);
  assert.deepEqual(normalized.findingReferences, ["finding-2"]);
  assert.equal(normalized.retestReference, "retest-2");
});

test("a NeuralTrust-compatible BLOCK remains runtime evidence for the canonical evaluator", async () => {
  const mapped = await referenceProviderAdapters["neuraltrust-compatible-test-provider"].mapEvidence({
    providerKey: "neuraltrust-compatible-test-provider",
    eventId: "runtime-event-001",
    subject: { type: "AI_AGENT", id: subjectId },
    evidenceType: "TOOL_CALL_POLICY_FINDING",
    finding: "BLOCK",
    evidence: { tool: "mcp:warehouse", access: "blocked", policy_reference: "runtime-policy:7" },
    occurredAt: requestedAt,
  }, requestedAt);
  assert.equal(mapped.result, "INCONCLUSIVE");
  assert.equal(Object.hasOwn(mapped, "decision"), false);

  const runtimeEvidence = evidence({
    reference: mapped.evidenceId,
    type: mapped.evidenceType,
    providerId: mapped.providerKey,
    providerEventId: "runtime-event-001",
    providerSessionId: "runtime-session-001",
    outcome: "INCONCLUSIVE",
    sourceDigest: mapped.payloadHash,
    assuranceLevel: null,
    correlationId: "10000000-0000-4000-8000-000000000019",
    sourceClassification: "unconfirmed",
  });
  const { deps } = dependencies({
    evidence: [evidence(), runtimeEvidence],
    authority: authority({ permittedProviders: ["hopae_connect", "neuraltrust-compatible-test-provider"] }),
  });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "runtime-provider-block-evidence-001" }), deps);
  assert.equal(receipt.decision, "ALLOW");
  assert.equal(receipt.providerNeutralEvidence.some((item) => item.providerId === "neuraltrust-compatible-test-provider"), true);
  assert.equal(receipt.reasonCodes.includes("NEGATIVE_PROVIDER_EVIDENCE"), false);
});

test("AGENT_ASSERTED evidence cannot satisfy a canonical required evidence type", async () => {
  const asserted = evidence({
    providerId: "api-client:alpha",
    sourcePartyId: "api-client:alpha",
    sourceClassification: "agent_asserted",
    serverVerified: false,
    type: "IDENTITY_SESSION",
  });
  const { deps } = dependencies({ evidence: [asserted] });
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "agent-asserted-evidence-001" }), deps);
  assert.equal(receipt.evidenceComplete, false);
  assert.equal(receipt.evidenceIndependence, "insufficient");
  assert.equal(receipt.decision, "REVIEW");
  assert.ok(receipt.reasonCodes.includes("EVIDENCE_INSUFFICIENT"));
});

test("reference provider adapters always recompute payload digests", async () => {
  const mapped = await referenceProviderAdapters["mythos-compatible-test-provider"].mapEvidence({
    providerKey: "mythos-compatible-test-provider",
    eventId: "digest-recompute-001",
    subject: { type: "AI_AGENT", id: subjectId },
    evidenceType: "CAPABILITY_EVALUATION",
    finding: "ASSESSMENT",
    evidence: { score: 0.8 },
    occurredAt: requestedAt,
    digest: "f".repeat(64),
  }, requestedAt);
  assert.notEqual(mapped.payloadHash, "f".repeat(64));
});

test("canonical receipts expose provider-neutral continuity signals for investor-facing trust evidence", async () => {
  const normalized = normalizeProviderNeutralEvidence({
    providerId: "runtime_security",
    providerName: "Runtime Security",
    evidenceType: "runtime_security_observation",
    observedAt: requestedAt,
    outcome: "PASSED",
    evidenceDigest: "c".repeat(64),
    correlationId: "correlation-1",
  });
  assert.equal(normalized.providerId, "runtime_security");
  assert.equal(normalized.monitoringCoverage, "covered");
  assert.equal(normalized.identityContinuity, "continuous");
  assert.equal(normalized.signingBoundary, "provider_signed");
  const { deps } = dependencies();
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "test-key-001" }), deps);
  assert.ok(receipt.continuitySignals);
  assert.equal(receipt.continuitySignals.identityContinuity, "continuous");
  assert.equal(receipt.continuitySignals.monitoringCoverage, "covered");
  assert.equal(receipt.continuitySignals.signedHumanIntent, "not_provided");
  assert.equal(receipt.continuitySignals.consequentialImpactLineage.target, "invoice:4488");
});

test("VALE routes robotics conflicts through the one canonical transaction and canonical artifacts", async () => {
  const robotTrustObject = {
    ...trustObject(),
    subjectType: "machine_identity",
    subject: { type: "machine_identity", id: subjectId, displayName: "Robot Beta" },
    activeContradictions: [],
  };
  const robotAuthority = authority({
    subjectType: "machine_identity",
    subject: robotTrustObject.subject,
    authorizedObjective: "warehouse_move",
    permittedScope: ["MOVE"],
    requiredAuthority: ["MOVE"],
  });
  const { deps, calls } = dependencies({
    trustObject: robotTrustObject,
    authority: robotAuthority,
    operationalEntity: operationalEntity({ entityType: "robot", currentConsequenceClassification: "high" }),
  });
  const receipt = await authorizeValeTrust({
    tenantId,
    actorLineage: [
      { operationalEntityId: "human:alice", type: "HUMAN", role: "operator", accountablePrincipalId: "human:alice" },
      { operationalEntityId: "agent:alpha", type: "AI_AGENT", role: "planner", accountablePrincipalId: "human:alice" },
      { operationalEntityId: subjectId, type: "ROBOT", role: "warehouse_robot", accountablePrincipalId: "human:alice" },
    ],
    intent: { action: "MOVE", resource: "warehouse:pallet-123", purpose: "warehouse_move", environment: "sandbox", destination: "warehouse:zone-b", signedBy: "human:alice", signedAt: requestedAt, signatureReference: "intent:alice-001" },
    machine: { identityState: "MACHINE_IDENTITY_VERIFIED", attestationState: "CURRENT", firmwareHash: "f".repeat(64) },
    model: { provider: "model:test", modelId: "navigation", version: "v1", weightsHash: "e".repeat(64) },
    monitoring: { expectedProviders: ["fleet", "camera"], observedProviders: ["fleet"], telemetryGapSeconds: 8, connection: "INTERMITTENT" },
    sensors: [
      { source: "vision", observationClass: "MODEL_PERCEPTION", observation: "PATH_CLEAR", observedAt: requestedAt, digest: "1".repeat(64), freshness: "current" },
      { source: "lidar", observationClass: "INDEPENDENT_OBSERVATION", observation: "OBSTACLE_PRESENT", observedAt: requestedAt, digest: "2".repeat(64), freshness: "current" },
    ],
    execution: { commandTarget: "warehouse:zone-c", stages: [{ stage: "COMMAND_SENT", status: "observed", occurredAt: requestedAt, evidenceReference: "command:001" }] },
    oversight: "HUMAN_IN_THE_LOOP",
    conflicts: ["PHYSICAL_PATH_CONFLICT"],
    idempotencyKey: "vale-canonical-robot-001",
    requestedAt,
  }, deps);
  assert.equal(receipt.decision, "REVIEW");
  for (const reason of ["INTENT_EXECUTION_MISMATCH", "MONITORING_COVERAGE_GAP", "ACTION_DURING_EVIDENCE_GAP", "SENSOR_DISAGREEMENT", "PHYSICAL_PATH_CONFLICT"]) assert.ok(receipt.reasonCodes.includes(reason));
  assert.equal(receipt.evidenceGraphReference, "graph-1");
  assert.equal(receipt.replayReference, "replay-1");
  assert.equal(receipt.trustMemoryReference, "memory-1");
  assert.equal(receipt.continuitySignals.signedHumanIntent, "provided");
  assert.equal(receipt.continuitySignals.monitoringCoverage, "partial");
  assert.ok(receipt.executionContinuity.some((stage) => stage.stage === "COMMAND_SENT"));
  assert.equal(calls.includes("requestExternalExecutionIfAllowed"), false);
});

test("a current reassessment with a retest reference clears deployment reauthorization in the canonical gate", async () => {
  const { deps } = dependencies();
  const receipt = await executeCanonicalTrustTransaction(transactionInput({
    idempotencyKey: "deployment-gate-revalidated-1",
    decisionType: "AI_DEPLOYMENT_TRUST_GATE",
    deploymentContext: {
      materialChanges: ["MODEL_CHANGED"],
      assuranceEvidence: [{
        providerKey: "mythos-compatible-test-provider", assessmentId: "assessment-retest", subject: subjectId,
        environment: "sandbox", scope: "deployment", methodReference: "safety-eval", occurredAt: requestedAt,
        receivedAt: requestedAt, expiresAt: "2026-08-20T10:00:00.000Z", modelVersion: "v2", toolSet: ["repo.read"],
        permissionContext: "read", assurance: 0.93, confidence: "high", evidenceDigest: "9".repeat(64), findingReferences: [], retestReference: "retest:assessment-retest",
      }],
    },
  }), deps);
  assert.equal(receipt.deploymentGate?.assuranceFreshness, "ASSURANCE_CURRENT");
  assert.equal(receipt.deploymentGate?.reauthorizationRequired, false);
  assert.equal(receipt.reasonCodes.includes("REAUTHORIZATION_REQUIRED"), false);
});

test("canonical execution continuity keeps intent, request, authorization, acknowledgement and outcome distinct", async () => {
  const { deps } = dependencies();
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "execution-continuity-001" }), deps);
  const stages = receipt.executionContinuity.map((item) => item.stage);
  for (const stage of ["INTENDED_ACTION", "REQUESTED_ACTION", "AUTHORIZED_ACTION", "COMMAND_SENT", "COMMAND_ACKNOWLEDGED", "ACTION_EXECUTED", "CONSEQUENCE_OBSERVED"]) assert.ok(stages.includes(stage));
  assert.equal(new Set(stages).size, stages.length);
});

test("canonical evaluation automatically persists a pre-action Trust Forecast for consequential agent action", async () => {
  const { deps } = dependencies();
  const receipt = await executeCanonicalTrustTransaction(transactionInput({ idempotencyKey: "automatic-pre-action-forecast-001" }), deps);
  assert.equal(receipt.trustForecast?.snapshotType, "PRE_ACTION_TRUST_FORECAST");
  assert.equal(receipt.trustForecast?.subject.type, "AI_AGENT");
  assert.ok(receipt.trustForecast?.conditions.some((item) => item.dimension === "AUTHORITY_STABILITY"));
  assert.equal(receipt.decisionTimeSnapshot.trustForecast?.forecastId, receipt.trustForecast?.forecastId);
  assert.equal(receipt.trustForecast?.canonicalDecisionBoundary.forecastCanDeny, false);
  assert.ok(receipt.providerNeutralEvidence.some((item) => item.evidenceType === "TRUST_CONDITION_TOOL_PARAMETER_PROVENANCE"));
});

test("Trust Forecast evidence flows through the existing deployment gate and canonical artifacts", async () => {
  const { deps, calls } = dependencies();
  const receipt = await executeCanonicalTrustTransaction(transactionInput({
    idempotencyKey: "trust-forecast-deployment-gate-001",
    decisionType: "AI_DEPLOYMENT_TRUST_GATE",
    deploymentContext: { materialChanges: [], assuranceEvidence: [] },
    managedControl: {
      trustForecast: {
        enterpriseId: tenantId,
        subject: { type: "AI_AGENT", id: subjectId },
        horizon: "PRE_DEPLOYMENT",
        evaluatedAt: requestedAt,
        policyReference: "policy-settlement:1.0.0",
        conditions: [{
          dimension: "AUTHORITY_STABILITY",
          status: "ELEVATED",
          confidence: 0.92,
          evidenceReferences: ["evidence:authority-expansion"],
          lastVerifiedAt: requestedAt,
          freshness: "CURRENT",
          trend: "DETERIORATING",
          materiality: "CRITICAL",
          knownLimitations: [],
          summary: "Proposed authority expands beyond the approved deployment baseline.",
          signals: ["PRIVILEGE_INCREASED"],
          providerIds: ["ci:deployment-candidate"],
        }],
      },
    },
  }), deps);
  assert.equal(receipt.decision, "REVIEW");
  assert.equal(receipt.trustForecast?.state, "ELEVATED");
  assert.equal(receipt.trustForecast?.canonicalDecisionBoundary.forecastCanDeny, false);
  assert.equal(receipt.decisionTimeSnapshot.trustForecast?.forecastId, receipt.trustForecast?.forecastId);
  assert.equal(receipt.deploymentGate?.forecastState, "ELEVATED");
  assert.equal(receipt.deploymentGate?.deploymentRecommendation, "HOLD");
  assert.ok(receipt.reasonCodes.includes("TRUST_FORECAST_REQUIRES_CANONICAL_REVIEW"));
  assert.ok(receipt.providerNeutralEvidence.some((item) => item.evidenceType === "TRUST_CONDITION_AUTHORITY_STABILITY"));
  for (const artifact of ["extendEvidenceGraph", "appendReplay", "emitMaterialTrustMemory"]) assert.ok(calls.includes(artifact));
  assert.equal(calls.includes("requestExternalExecutionIfAllowed"), false);
});

test("a forecast recommendation outside the deployment gate cannot directly replace canonical ALLOW", async () => {
  const { deps, calls } = dependencies();
  const receipt = await executeCanonicalTrustTransaction(transactionInput({
    idempotencyKey: "trust-forecast-canonical-separation-001",
    managedControl: {
      trustForecast: {
        enterpriseId: tenantId,
        subject: { type: "AI_AGENT", id: subjectId },
        horizon: "NEXT_CONSEQUENTIAL_ACTION",
        evaluatedAt: requestedAt,
        policyReference: "policy-settlement:1.0.0",
        conditions: [{
          dimension: "CONSEQUENCE_EXPOSURE",
          status: "SEVERE",
          confidence: 0.95,
          evidenceReferences: ["evidence:forecast-only"],
          lastVerifiedAt: requestedAt,
          freshness: "CURRENT",
          trend: "RAPIDLY_DETERIORATING",
          materiality: "CRITICAL",
          knownLimitations: [],
          summary: "Forecast-only evidence recommends preventative controls.",
        }],
      },
    },
  }), deps);
  assert.equal(receipt.trustForecast?.state, "SEVERE");
  assert.equal(receipt.decision, "ALLOW");
  assert.ok(calls.includes("requestExternalExecutionIfAllowed"));
});
