import { deterministicUuid, hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { ProviderNeutralEvidence } from "../providers/adapters.ts";
import type { TrustConditionInput, TrustForecastGraphProjection } from "./trust-forecast.ts";

export const MODEL_INTEGRITY_STATES = [
  "EXACT_MATCH", "SUPPORTED_MATCH", "EXPECTED_CHANGE", "MATERIAL_CHANGE", "CONFIGURATION_DRIFT",
  "INTEGRITY_UNRESOLVED", "PROVIDER_CONFLICT", "INSUFFICIENT_EVIDENCE", "UNDER_REVIEW",
] as const;
export const TEMPLATE_INTEGRITY_STATES = ["SUPPORTED", "CHANGED", "UNAVAILABLE", "UNVERIFIABLE", "CONFLICTING"] as const;
export const NETWORK_POSTURES = ["LOOPBACK_ONLY", "AUTHENTICATED_PROXY", "PRIVATE_NETWORK", "EXTERNALLY_REACHABLE", "UNKNOWN"] as const;
export const AUTH_POSTURES = ["AUTHENTICATED", "UNAUTHENTICATED", "PROVIDER_MANAGED", "UNKNOWN"] as const;
export const MODEL_STATE_CHANGE_CLASSIFICATIONS = [
  "APPROVED_UPGRADE", "APPROVED_CONFIGURATION_CHANGE", "APPROVED_TEMPLATE_CHANGE", "APPROVED_ADAPTER_CHANGE",
  "EMERGENCY_REMEDIATION", "PROVIDER_MANAGED_CHANGE", "UNKNOWN_CHANGE",
] as const;
export const MODEL_STATE_TRUST_INVARIANTS = [
  "CONSEQUENTIAL_AGENT_MODEL_STATE_MATCHES_APPROVED_BASELINE",
  "MODEL_TEMPLATE_MATCHES_APPROVED_TEMPLATE",
  "RUNTIME_MODEL_ARTIFACT_MATCHES_APPROVED_ARTIFACT",
  "UNAPPROVED_MODEL_STATE_CHANGE_REQUIRES_REVALIDATION",
  "MODEL_ENDPOINT_REMAINS_WITHIN_APPROVED_NETWORK_BOUNDARY",
  "INFERENCE_SERVER_AUTHENTICATION_REMAINS_ENABLED",
  "MODEL_STATE_CHANGE_HAS_ATTRIBUTABLE_PROVENANCE",
  "HIGH_IMPACT_AGENT_EXECUTION_HAS_CURRENT_MODEL_STATE_EVIDENCE",
] as const;

export type ModelIntegrityState = (typeof MODEL_INTEGRITY_STATES)[number];
export type TemplateIntegrityState = (typeof TEMPLATE_INTEGRITY_STATES)[number];
export type NetworkPosture = (typeof NETWORK_POSTURES)[number];
export type AuthenticationPosture = (typeof AUTH_POSTURES)[number];
export type ModelStateChangeClassification = (typeof MODEL_STATE_CHANGE_CLASSIFICATIONS)[number];
export type ModelStateEvidenceFreshness = "CURRENT" | "AGING" | "STALE" | "EXPIRED" | "UNAVAILABLE";

export type TemplateState = {
  agentSystemPromptDigest: string | null;
  modelTemplateDigest: string | null;
  runtimeInferenceConfigurationDigest: string | null;
  sourceReference: string | null;
  verificationMechanism: string | null;
};

export type ModelRouterState = {
  routerId: string | null;
  routerVersion: string | null;
  routingPolicyDigest: string | null;
  selectedModel: string | null;
  fallbackModel: string | null;
  selectionReason: string | null;
};

export type InferenceEndpointLineage = {
  endpointReference: string | null;
  routingProvider: string | null;
  intermediaryReference: string | null;
  finalInferenceServer: string | null;
};

export type ApprovedModelStateSnapshotInput = {
  enterpriseId: string;
  agentId: string;
  agentPassportVersion: string;
  modelProvider: string;
  modelId: string;
  modelVersion: string;
  modelArtifactReference?: string | null;
  modelArtifactDigest?: string | null;
  runtimeProvider: string;
  runtimeImageReference?: string | null;
  runtimeImageDigest?: string | null;
  inferenceServer: string;
  inferenceServerVersion?: string | null;
  configurationDigest?: string | null;
  adapterConfigurationDigest?: string | null;
  inferenceConfigurationDigest?: string | null;
  toolParserConfigurationDigest?: string | null;
  templates: TemplateState;
  networkConfigurationReference?: string | null;
  networkPosture: NetworkPosture;
  authenticationConfigurationReference?: string | null;
  authenticationPosture: AuthenticationPosture;
  runtimeEnvironment: string;
  policyVersion: string;
  authorityReference: string;
  evidenceProvider: string;
  evidenceReferences: string[];
  measuredAt: string;
  limitations?: string[];
  endpointLineage: InferenceEndpointLineage;
  router?: ModelRouterState | null;
};

export type ApprovedModelStateSnapshot = Readonly<ApprovedModelStateSnapshotInput & {
  baselineVersion: "1.0";
  baselineId: string;
  baselineDigest: string;
  immutable: true;
}>;

export type ModelStateProviderAssertion = {
  providerClass: string;
  providerKey: string;
  stateDigest: string;
  evidenceReference: string;
  observedAt: string;
  hardwareBacked?: boolean;
};

export type CurrentObservedModelStateInput = Omit<ApprovedModelStateSnapshotInput,
  "agentPassportVersion" | "policyVersion" | "authorityReference" | "evidenceProvider" | "measuredAt"> & {
    agentPassportVersion?: string | null;
    policyVersion?: string | null;
    authorityReference?: string | null;
    evidenceProvider: string;
    measuredAt: string;
    expiresAt?: string | null;
    providerAssertions?: ModelStateProviderAssertion[];
  };

export type CurrentObservedModelState = Readonly<CurrentObservedModelStateInput & {
  observationVersion: "1.0";
  observationId: string;
  observationDigest: string;
}>;

export type ModelStateChangeProvenance = {
  classification: ModelStateChangeClassification;
  previousStateReference: string;
  newStateReference: string;
  actorOrProvider: string | null;
  sourceReference: string | null;
  changedAt: string | null;
  deploymentOrChangeReference: string | null;
  approvalReference: string | null;
  evidenceReferences: string[];
};

export type ModelValidationLineage = {
  validationReference: string | null;
  validatedBaselineDigest: string | null;
  observedStateDigest: string | null;
  status: "CURRENT" | "INVALIDATED_BY_CHANGE" | "REASSESSMENT_REQUIRED" | "UNKNOWN";
  reassessmentReference: string | null;
  findings: Array<"VALIDATION_REASSESSMENT_REQUIRED" | "REVALIDATION_REQUIRED">;
};

export type ModelStateRetrospectiveAdvisory = {
  advisoryReference: string;
  learnedAt: string;
  evidenceReferences: string[];
  affectedAgents?: string[];
  affectedSessions?: string[];
  affectedTransactions?: string[];
  affectedDeployments?: string[];
  affectedActions?: string[];
  affectedOutcomes?: string[];
};

export type ModelStateFindingCode =
  | "MODEL_STATE_DRIFT" | "RUNTIME_MODEL_ARTIFACT_MISMATCH" | "MODEL_STATE_CHANGE_ORIGIN_UNRESOLVED"
  | "MODEL_ENDPOINT_CHANGED" | "MODEL_TEMPLATE_CHANGED" | "MODEL_RUNTIME_AUTH_CHANGED"
  | "MODEL_NETWORK_EXPOSURE_CHANGED" | "MODEL_ROUTER_UNEXPECTED_SWITCH" | "INFERENCE_CONFIGURATION_CHANGED"
  | "MODEL_PROVIDER_DISAGREEMENT" | "VALIDATION_REASSESSMENT_REQUIRED" | "REVALIDATION_REQUIRED";

export type ModelStateFinding = {
  code: ModelStateFindingCode;
  severity: "INFORMATIONAL" | "REVIEW" | "MATERIAL";
  summary: string;
  evidenceReferences: string[];
  compromiseClaimed: false;
};

export type ModelStateIntegrityAssessment = Readonly<{
  assessmentVersion: "1.0";
  assessmentId: string;
  enterpriseId: string;
  agentId: string;
  approvedModelState: ApprovedModelStateSnapshot;
  observedModelState: CurrentObservedModelState;
  modelIntegrityState: ModelIntegrityState;
  templateIntegrity: {
    overall: TemplateIntegrityState;
    agentSystemPrompt: TemplateIntegrityState;
    modelTemplate: TemplateIntegrityState;
    runtimeInferenceConfiguration: TemplateIntegrityState;
  };
  artifactIntegrity: { state: "SUPPORTED" | "MISMATCH" | "UNAVAILABLE" | "CONFLICTING"; approvedDigest: string | null; observedDigest: string | null };
  runtimeIntegrity: { state: "SUPPORTED" | "CHANGED" | "UNAVAILABLE" | "CONFLICTING"; changedComponents: string[]; networkPosture: NetworkPosture; authenticationPosture: AuthenticationPosture };
  endpointIntegrity: { state: "SUPPORTED" | "CHANGED" | "UNAVAILABLE" | "CONFLICTING"; approved: InferenceEndpointLineage; observed: InferenceEndpointLineage };
  stateChangeProvenance: ModelStateChangeProvenance;
  validationLineage: ModelValidationLineage;
  findings: ModelStateFinding[];
  requiredVerification: Array<"VERIFY_MODEL_STATE" | "VERIFY_RUNTIME" | "VERIFY_AGENT_CONFIGURATION" | "STEP_UP_RUNTIME_ATTESTATION" | "REVALIDATION">;
  lastModelStateMeasurement: string;
  modelStateEvidenceFreshness: ModelStateEvidenceFreshness;
  providerNeutralEvidence: ProviderNeutralEvidence[];
  trustConditions: TrustConditionInput[];
  graphProjection: TrustForecastGraphProjection;
  replayEvents: Array<{ eventType: string; occurredAt: string; evidenceReferences: string[]; details: Record<string, unknown> }>;
  trustMemoryEvents: Array<{ eventId: string; eventType: string; occurredAt: string; evidenceReferences: string[] }>;
  retrospectiveReview: {
    knownAtActionTime: { baselineDigest: string; observationDigest: string; measuredAt: string; evidenceReferences: string[] };
    learnedLater: ModelStateRetrospectiveAdvisory | null;
    recommendation: "RETROSPECTIVE_MODEL_STATE_REVIEW_RECOMMENDED" | "NO_RETROSPECTIVE_REVIEW_INDICATED";
    exploitationAssumed: false;
  };
  trustInvariants: Array<{ code: (typeof MODEL_STATE_TRUST_INVARIANTS)[number]; enabled: false; disposition: "RECOMMENDED_DISABLED" }>;
  canonicalDecisionBoundary: {
    decisionAuthority: "CANONICAL_TRUST_FABRIC_ONLY";
    canAllow: false;
    canReview: false;
    canDeny: false;
    canGrantAuthority: false;
    driftImpliesCompromise: false;
  };
  evaluatedAt: string;
  assessmentDigest: string;
}>;

export type EvaluateModelStateIntegrityInput = {
  enterpriseId: string;
  approved: ApprovedModelStateSnapshot;
  observed: CurrentObservedModelState;
  evaluatedAt: string;
  provenance?: Partial<ModelStateChangeProvenance> | null;
  validation?: { validationReference: string; validatedBaselineDigest: string; reassessmentReference?: string | null } | null;
  previousAssessment?: ModelStateIntegrityAssessment | null;
  retrospectiveAdvisory?: ModelStateRetrospectiveAdvisory | null;
  actionReference?: string | null;
  destinationReference?: string | null;
  outcomeReference?: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const forbiddenKey = /(?:^|_)(?:secret|password|private_key|access_token|refresh_token|credential_value|api_key)(?:$|_)/i;
const secretLikeValue = /(?:bearer\s+[A-Za-z0-9._~+/=-]{16,}|-----BEGIN [A-Z ]+PRIVATE KEY-----|(?:sk|pk)_[A-Za-z0-9_-]{16,})/i;

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function assertSafe(value: unknown, path = "modelState") {
  if (typeof value === "string" && secretLikeValue.test(value)) throw new TypeError(`${path} appears to contain a raw secret.`);
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`);
    const rawModelContent = /weights?/.test(normalizedKey)
      || (/(?:^|_)(?:system_prompt|model_template|prompt|template)$/.test(normalizedKey) && !/(?:digest|reference|source|verification|^templates$)/.test(normalizedKey))
      || (/(?:template|prompt)/i.test(path) && /^(?:body|content|text|value)$/i.test(key));
    if (forbiddenKey.test(normalizedKey) || rawModelContent) throw new TypeError(`${path}.${key} is not permitted; use a digest or bounded reference.`);
    assertSafe(child, `${path}.${key}`);
  }
}

function unique(values: readonly string[]) { return [...new Set(values.filter(Boolean))].sort(); }
function validTime(value: string | null | undefined) { return Boolean(value && Number.isFinite(Date.parse(value))); }
function present(value: string | null | undefined) { return typeof value === "string" && value.length > 0; }

function validateCommon(input: ApprovedModelStateSnapshotInput | CurrentObservedModelStateInput) {
  assertSafe(input);
  if (!uuidPattern.test(input.enterpriseId)) throw new TypeError("Model state requires a valid enterprise tenant.");
  if (![input.agentId, input.modelProvider, input.modelId, input.modelVersion, input.runtimeProvider, input.inferenceServer, input.runtimeEnvironment, input.evidenceProvider].every(present)) throw new TypeError("Model state identity and runtime references are required.");
  if (!validTime(input.measuredAt)) throw new TypeError("Model state measurement timestamp is invalid.");
  if (!NETWORK_POSTURES.includes(input.networkPosture) || !AUTH_POSTURES.includes(input.authenticationPosture)) throw new TypeError("Model state runtime posture is invalid.");
}

export function createApprovedModelStateBaseline(input: ApprovedModelStateSnapshotInput): ApprovedModelStateSnapshot {
  validateCommon(input);
  if (![input.agentPassportVersion, input.policyVersion, input.authorityReference].every(present)) throw new TypeError("Approved model state requires passport, policy, and authority lineage.");
  const clean = structuredClone({ ...input, evidenceReferences: unique(input.evidenceReferences), limitations: unique(input.limitations ?? []) });
  const baselineId = deterministicUuid({ enterpriseId: clean.enterpriseId, agentId: clean.agentId, measuredAt: clean.measuredAt, state: clean });
  const baselineDigest = hashCanonical({ ...clean, baselineId });
  return deepFreeze({ ...clean, baselineVersion: "1.0" as const, baselineId, baselineDigest, immutable: true as const }) as ApprovedModelStateSnapshot;
}

export function createCurrentObservedModelState(input: CurrentObservedModelStateInput): CurrentObservedModelState {
  validateCommon(input);
  if (input.expiresAt && !validTime(input.expiresAt)) throw new TypeError("Observed model state expiry is invalid.");
  for (const assertion of input.providerAssertions ?? []) {
    if (![assertion.providerClass, assertion.providerKey, assertion.stateDigest, assertion.evidenceReference].every(present) || !validTime(assertion.observedAt)) throw new TypeError("Provider model-state assertion is invalid.");
  }
  const clean = structuredClone({ ...input, evidenceReferences: unique(input.evidenceReferences), limitations: unique(input.limitations ?? []), providerAssertions: [...(input.providerAssertions ?? [])] });
  const observationId = deterministicUuid({ enterpriseId: clean.enterpriseId, agentId: clean.agentId, measuredAt: clean.measuredAt, state: clean });
  const observationDigest = hashCanonical({ ...clean, observationId });
  return deepFreeze({ ...clean, observationVersion: "1.0" as const, observationId, observationDigest }) as CurrentObservedModelState;
}

type CompareField = { key: string; approved: string | null | undefined; observed: string | null | undefined; finding?: ModelStateFindingCode };

function templateState(approved: string | null, observed: string | null, conflict: boolean): TemplateIntegrityState {
  if (conflict) return "CONFLICTING";
  if (!present(approved) || !present(observed)) return "UNAVAILABLE";
  return approved === observed ? "SUPPORTED" : "CHANGED";
}

function freshnessFor(observed: CurrentObservedModelState, evaluatedAt: string): ModelStateEvidenceFreshness {
  if (!validTime(observed.measuredAt)) return "UNAVAILABLE";
  if (observed.expiresAt && Date.parse(observed.expiresAt) <= Date.parse(evaluatedAt)) return "EXPIRED";
  const ageHours = (Date.parse(evaluatedAt) - Date.parse(observed.measuredAt)) / 3_600_000;
  if (ageHours > 24) return "STALE";
  if (ageHours > 12) return "AGING";
  return "CURRENT";
}

function finding(code: ModelStateFindingCode, summary: string, evidenceReferences: string[], severity: ModelStateFinding["severity"] = "MATERIAL"): ModelStateFinding {
  return { code, severity, summary, evidenceReferences, compromiseClaimed: false };
}

function graphFor(input: EvaluateModelStateIntegrityInput, assessmentId: string, evidenceReferences: string[]): TrustForecastGraphProjection {
  const a = input.approved;
  const o = input.observed;
  const ids = {
    agent: a.agentId,
    model: `${assessmentId}:model:${o.modelProvider}:${o.modelId}:${o.modelVersion}`,
    artifact: o.modelArtifactReference ?? `${assessmentId}:artifact:unavailable`,
    runtime: o.runtimeImageReference ?? `${assessmentId}:runtime:${o.runtimeProvider}`,
    template: `${assessmentId}:template:${o.templates.modelTemplateDigest ?? "unavailable"}`,
    configuration: `${assessmentId}:configuration:${o.configurationDigest ?? "unavailable"}`,
    measurement: o.observationId,
    authority: a.authorityReference,
    action: input.actionReference ?? `${assessmentId}:action:pending`,
    destination: input.destinationReference ?? o.endpointLineage.finalInferenceServer ?? `${assessmentId}:destination:unknown`,
    outcome: input.outcomeReference ?? `${assessmentId}:outcome:pending`,
  };
  const nodes: TrustForecastGraphProjection["nodes"] = [
    { nodeType: "AGENT", externalId: ids.agent, domainKey: "IDENTITY", label: "Agent", metadata: { passportVersion: a.agentPassportVersion } },
    { nodeType: "MODEL", externalId: ids.model, domainKey: "IDENTITY", label: `${o.modelId}:${o.modelVersion}`, metadata: { provider: o.modelProvider } },
    { nodeType: "MODEL_ARTIFACT", externalId: ids.artifact, domainKey: "EVIDENCE", label: "Model artifact", metadata: { digestAvailable: present(o.modelArtifactDigest) } },
    { nodeType: "RUNTIME", externalId: ids.runtime, domainKey: "RUNTIME", label: o.runtimeProvider, metadata: { networkPosture: o.networkPosture, authenticationPosture: o.authenticationPosture } },
    { nodeType: "TEMPLATE", externalId: ids.template, domainKey: "EVIDENCE", label: "Model template", metadata: { digestAvailable: present(o.templates.modelTemplateDigest) } },
    { nodeType: "CONFIGURATION", externalId: ids.configuration, domainKey: "RUNTIME", label: "Inference configuration", metadata: {} },
    { nodeType: "INTEGRITY_MEASUREMENT", externalId: ids.measurement, domainKey: "EVIDENCE", label: "Current model-state measurement", metadata: { observedAt: o.measuredAt, providers: unique([o.evidenceProvider, ...(o.providerAssertions ?? []).map((item) => item.providerKey)]) } },
    { nodeType: "AUTHORITY", externalId: ids.authority, domainKey: "AUTHORITY", label: "Authority lineage", metadata: {} },
    { nodeType: "ACTION", externalId: ids.action, domainKey: "ACTION", label: input.actionReference ? "Consequential action" : "Action pending", metadata: {} },
    { nodeType: "DESTINATION", externalId: ids.destination, domainKey: "DESTINATION", label: "Inference destination", metadata: {} },
    { nodeType: "OUTCOME", externalId: ids.outcome, domainKey: "OUTCOME", label: input.outcomeReference ? "Observed outcome" : "Outcome pending", metadata: {} },
  ];
  const chain: Array<[string, string, string, string]> = [
    ["AGENT", ids.agent, "MODEL", ids.model], ["MODEL", ids.model, "MODEL_ARTIFACT", ids.artifact], ["MODEL_ARTIFACT", ids.artifact, "RUNTIME", ids.runtime],
    ["RUNTIME", ids.runtime, "TEMPLATE", ids.template], ["TEMPLATE", ids.template, "CONFIGURATION", ids.configuration], ["CONFIGURATION", ids.configuration, "INTEGRITY_MEASUREMENT", ids.measurement],
    ["INTEGRITY_MEASUREMENT", ids.measurement, "AUTHORITY", ids.authority], ["AUTHORITY", ids.authority, "ACTION", ids.action], ["ACTION", ids.action, "DESTINATION", ids.destination], ["DESTINATION", ids.destination, "OUTCOME", ids.outcome],
  ];
  const edges: TrustForecastGraphProjection["edges"] = chain.map(([fromNodeType, fromExternalId, toNodeType, toExternalId]) => ({ fromNodeType, fromExternalId, toNodeType, toExternalId, edgeType: "APPLIES_TO" }));
  for (const reference of evidenceReferences) {
    nodes.push({ nodeType: "EVIDENCE", externalId: reference, domainKey: "EVIDENCE", label: reference, metadata: {} });
    edges.push({ fromNodeType: "EVIDENCE", fromExternalId: reference, toNodeType: "INTEGRITY_MEASUREMENT", toExternalId: ids.measurement, edgeType: "SUPPORTED" });
  }
  return { nodes, edges };
}

export function evaluateModelStateIntegrity(input: EvaluateModelStateIntegrityInput): ModelStateIntegrityAssessment {
  assertSafe({ ...input, previousAssessment: undefined });
  if (!uuidPattern.test(input.enterpriseId) || input.approved.enterpriseId !== input.enterpriseId || input.observed.enterpriseId !== input.enterpriseId) throw new Error("MODEL_STATE_TENANT_SCOPE_MISMATCH");
  if (input.approved.agentId !== input.observed.agentId) throw new Error("MODEL_STATE_AGENT_SCOPE_MISMATCH");
  if (!validTime(input.evaluatedAt) || Date.parse(input.observed.measuredAt) > Date.parse(input.evaluatedAt)) throw new TypeError("Model-state evaluation timestamp is invalid.");
  if (input.previousAssessment && (input.previousAssessment.enterpriseId !== input.enterpriseId || input.previousAssessment.agentId !== input.approved.agentId)) throw new Error("MODEL_STATE_PREVIOUS_SCOPE_MISMATCH");

  const evidenceReferences = unique([...input.approved.evidenceReferences, ...input.observed.evidenceReferences, ...(input.observed.providerAssertions ?? []).map((item) => item.evidenceReference), ...(input.provenance?.evidenceReferences ?? [])]);
  const providerDigests = unique((input.observed.providerAssertions ?? []).map((item) => item.stateDigest));
  const providerConflict = providerDigests.length > 1;
  const fields: CompareField[] = [
    { key: "modelProvider", approved: input.approved.modelProvider, observed: input.observed.modelProvider },
    { key: "modelId", approved: input.approved.modelId, observed: input.observed.modelId },
    { key: "modelVersion", approved: input.approved.modelVersion, observed: input.observed.modelVersion },
    { key: "modelArtifactDigest", approved: input.approved.modelArtifactDigest, observed: input.observed.modelArtifactDigest, finding: "RUNTIME_MODEL_ARTIFACT_MISMATCH" },
    { key: "runtimeImageDigest", approved: input.approved.runtimeImageDigest, observed: input.observed.runtimeImageDigest },
    { key: "inferenceServer", approved: input.approved.inferenceServer, observed: input.observed.inferenceServer, finding: "MODEL_ENDPOINT_CHANGED" },
    { key: "inferenceServerVersion", approved: input.approved.inferenceServerVersion, observed: input.observed.inferenceServerVersion },
    { key: "configurationDigest", approved: input.approved.configurationDigest, observed: input.observed.configurationDigest, finding: "INFERENCE_CONFIGURATION_CHANGED" },
    { key: "adapterConfigurationDigest", approved: input.approved.adapterConfigurationDigest, observed: input.observed.adapterConfigurationDigest, finding: "INFERENCE_CONFIGURATION_CHANGED" },
    { key: "inferenceConfigurationDigest", approved: input.approved.inferenceConfigurationDigest, observed: input.observed.inferenceConfigurationDigest, finding: "INFERENCE_CONFIGURATION_CHANGED" },
    { key: "toolParserConfigurationDigest", approved: input.approved.toolParserConfigurationDigest, observed: input.observed.toolParserConfigurationDigest, finding: "INFERENCE_CONFIGURATION_CHANGED" },
    { key: "networkPosture", approved: input.approved.networkPosture, observed: input.observed.networkPosture, finding: "MODEL_NETWORK_EXPOSURE_CHANGED" },
    { key: "authenticationPosture", approved: input.approved.authenticationPosture, observed: input.observed.authenticationPosture, finding: "MODEL_RUNTIME_AUTH_CHANGED" },
    { key: "endpoint", approved: input.approved.endpointLineage.endpointReference, observed: input.observed.endpointLineage.endpointReference, finding: "MODEL_ENDPOINT_CHANGED" },
    { key: "routingProvider", approved: input.approved.endpointLineage.routingProvider, observed: input.observed.endpointLineage.routingProvider, finding: "MODEL_ENDPOINT_CHANGED" },
    { key: "finalInferenceServer", approved: input.approved.endpointLineage.finalInferenceServer, observed: input.observed.endpointLineage.finalInferenceServer, finding: "MODEL_ENDPOINT_CHANGED" },
    { key: "routerSelectedModel", approved: input.approved.router?.selectedModel, observed: input.observed.router?.selectedModel, finding: "MODEL_ROUTER_UNEXPECTED_SWITCH" },
    { key: "routingPolicyDigest", approved: input.approved.router?.routingPolicyDigest, observed: input.observed.router?.routingPolicyDigest, finding: "MODEL_ROUTER_UNEXPECTED_SWITCH" },
  ];
  const unavailable = fields.filter((item) => !present(item.approved) || !present(item.observed)).map((item) => item.key);
  const changed = fields.filter((item) => present(item.approved) && present(item.observed) && item.approved !== item.observed);
  const agentSystemPrompt = templateState(input.approved.templates.agentSystemPromptDigest, input.observed.templates.agentSystemPromptDigest, providerConflict);
  const modelTemplate = templateState(input.approved.templates.modelTemplateDigest, input.observed.templates.modelTemplateDigest, providerConflict);
  const runtimeInferenceConfiguration = templateState(input.approved.templates.runtimeInferenceConfigurationDigest, input.observed.templates.runtimeInferenceConfigurationDigest, providerConflict);
  const changedTemplateParts = [agentSystemPrompt, modelTemplate, runtimeInferenceConfiguration].filter((item) => item === "CHANGED").length;
  const templateOverall: TemplateIntegrityState = providerConflict ? "CONFLICTING" : changedTemplateParts ? "CHANGED" : [agentSystemPrompt, modelTemplate, runtimeInferenceConfiguration].every((item) => item === "SUPPORTED") ? "SUPPORTED" : "UNAVAILABLE";
  const approvedChange = Boolean(input.provenance?.approvalReference && input.provenance.classification && input.provenance.classification !== "UNKNOWN_CHANGE");
  const materialChange = changed.length > 0 || changedTemplateParts > 0;
  const findings: ModelStateFinding[] = [];
  if (providerConflict) findings.push(finding("MODEL_PROVIDER_DISAGREEMENT", "Provider assertions disagree about the observed model state; no provider is treated as canonical.", evidenceReferences, "REVIEW"));
  if (changedTemplateParts) findings.push(finding("MODEL_TEMPLATE_CHANGED", "One or more bounded template digests differ from the approved baseline.", evidenceReferences));
  for (const code of unique(changed.flatMap((item) => item.finding ? [item.finding] : [])) as ModelStateFindingCode[]) {
    const summaries: Partial<Record<ModelStateFindingCode, string>> = {
      RUNTIME_MODEL_ARTIFACT_MISMATCH: "The observed runtime model artifact digest differs from the approved artifact digest.",
      MODEL_ENDPOINT_CHANGED: "The observed inference endpoint lineage differs from the approved endpoint lineage.",
      INFERENCE_CONFIGURATION_CHANGED: "The observed inference, adapter, or tool-parser configuration differs from the approved configuration.",
      MODEL_NETWORK_EXPOSURE_CHANGED: "The observed network posture differs from the approved bounded network posture.",
      MODEL_RUNTIME_AUTH_CHANGED: "The observed inference authentication posture differs from the approved posture.",
      MODEL_ROUTER_UNEXPECTED_SWITCH: "The observed router policy or selected model differs from the approved route.",
    };
    findings.push(finding(code, summaries[code] ?? "Observed model-state evidence differs from the approved baseline.", evidenceReferences));
  }
  if (materialChange && !approvedChange) findings.push(finding("MODEL_STATE_DRIFT", "Material model or runtime state differs from the approved baseline without a corresponding approved change; this is not a compromise or maliciousness determination.", evidenceReferences));
  if (materialChange && !approvedChange) findings.push(finding("MODEL_STATE_CHANGE_ORIGIN_UNRESOLVED", "No attributable approved change record explains the material observed model-state change.", evidenceReferences, "REVIEW"));

  const validationReusable = Boolean(input.validation && input.validation.validatedBaselineDigest === input.approved.baselineDigest && (!materialChange || input.validation.reassessmentReference));
  const validationFindings: ModelValidationLineage["findings"] = materialChange && !validationReusable ? ["VALIDATION_REASSESSMENT_REQUIRED", "REVALIDATION_REQUIRED"] : [];
  for (const code of validationFindings) findings.push(finding(code, "Prior validation cannot be silently carried across the materially different model state.", evidenceReferences, "REVIEW"));
  const validationLineage: ModelValidationLineage = {
    validationReference: input.validation?.validationReference ?? null,
    validatedBaselineDigest: input.validation?.validatedBaselineDigest ?? null,
    observedStateDigest: input.observed.observationDigest,
    status: !input.validation ? "UNKNOWN" : validationReusable ? "CURRENT" : materialChange ? "REASSESSMENT_REQUIRED" : "INVALIDATED_BY_CHANGE",
    reassessmentReference: input.validation?.reassessmentReference ?? null,
    findings: validationFindings,
  };

  let modelIntegrityState: ModelIntegrityState;
  if (providerConflict) modelIntegrityState = "PROVIDER_CONFLICT";
  else if (!evidenceReferences.length || unavailable.length > fields.length / 2) modelIntegrityState = "INSUFFICIENT_EVIDENCE";
  else if (!materialChange) modelIntegrityState = (input.observed.providerAssertions ?? []).length > 1 ? "SUPPORTED_MATCH" : "EXACT_MATCH";
  else if (approvedChange) modelIntegrityState = "EXPECTED_CHANGE";
  else if (validationFindings.length) modelIntegrityState = "UNDER_REVIEW";
  else if (changed.some((item) => /configuration|router/i.test(item.key)) || changedTemplateParts) modelIntegrityState = "CONFIGURATION_DRIFT";
  else modelIntegrityState = "MATERIAL_CHANGE";

  const provenance: ModelStateChangeProvenance = {
    classification: input.provenance?.classification ?? "UNKNOWN_CHANGE",
    previousStateReference: input.provenance?.previousStateReference ?? input.approved.baselineId,
    newStateReference: input.provenance?.newStateReference ?? input.observed.observationId,
    actorOrProvider: input.provenance?.actorOrProvider ?? null,
    sourceReference: input.provenance?.sourceReference ?? null,
    changedAt: input.provenance?.changedAt ?? (materialChange ? input.observed.measuredAt : null),
    deploymentOrChangeReference: input.provenance?.deploymentOrChangeReference ?? null,
    approvalReference: input.provenance?.approvalReference ?? null,
    evidenceReferences: unique(input.provenance?.evidenceReferences ?? []),
  };
  const freshness = freshnessFor(input.observed, input.evaluatedAt);
  const requiredVerification = unique([
    ...(modelIntegrityState === "EXACT_MATCH" || modelIntegrityState === "SUPPORTED_MATCH" ? [] : ["VERIFY_MODEL_STATE"]),
    ...(changed.some((item) => /runtime|inferenceServer|network|authentication|endpoint/i.test(item.key)) ? ["VERIFY_RUNTIME", "STEP_UP_RUNTIME_ATTESTATION"] : []),
    ...(changedTemplateParts || changed.some((item) => /configuration|router/i.test(item.key)) ? ["VERIFY_AGENT_CONFIGURATION"] : []),
    ...(validationFindings.length ? ["REVALIDATION"] : []),
  ]) as ModelStateIntegrityAssessment["requiredVerification"];
  const assessmentId = deterministicUuid({ enterpriseId: input.enterpriseId, baseline: input.approved.baselineDigest, observation: input.observed.observationDigest, evaluatedAt: input.evaluatedAt });
  const providerNeutralEvidence: ProviderNeutralEvidence[] = unique([input.observed.evidenceProvider, ...(input.observed.providerAssertions ?? []).map((item) => item.providerKey)]).map((providerId) => ({
    providerId,
    providerName: providerId.replace(/[_-]/g, " "),
    evidenceType: "MODEL_STATE_INTEGRITY_MEASUREMENT",
    observedAt: input.observed.measuredAt,
    outcome: modelIntegrityState,
    evidenceDigest: providerId === input.observed.evidenceProvider ? input.observed.observationDigest : input.observed.providerAssertions?.find((item) => item.providerKey === providerId)?.stateDigest ?? input.observed.observationDigest,
    correlationId: assessmentId,
    monitoringCoverage: "covered",
    identityContinuity: ["EXACT_MATCH", "SUPPORTED_MATCH", "EXPECTED_CHANGE"].includes(modelIntegrityState) ? "continuous" : "review_required",
    signingBoundary: "provider_signed",
    providerClass: input.observed.providerAssertions?.find((item) => item.providerKey === providerId)?.providerClass ?? "RUNTIME_SECURITY_PROVIDER",
    providerKey: providerId,
    environment: input.observed.runtimeEnvironment,
    scope: input.observed.agentId,
    modelVersion: input.observed.modelVersion,
    permissionContext: null,
    assurance: null,
    confidence: providerConflict ? "CONFLICTING" : unavailable.length ? "PARTIAL" : "SUPPORTED",
    findingReferences: findings.map((item) => item.code),
    retestReference: input.validation?.reassessmentReference ?? null,
    evidenceContext: { baselineId: input.approved.baselineId, observationId: input.observed.observationId, hardwareBacked: input.observed.providerAssertions?.some((item) => item.providerKey === providerId && item.hardwareBacked === true) ?? false },
  }));
  const severe = findings.some((item) => ["RUNTIME_MODEL_ARTIFACT_MISMATCH", "MODEL_RUNTIME_AUTH_CHANGED", "MODEL_NETWORK_EXPOSURE_CHANGED", "MODEL_ROUTER_UNEXPECTED_SWITCH"].includes(item.code));
  const integrityStatus: TrustConditionInput["status"] = ["EXACT_MATCH", "SUPPORTED_MATCH"].includes(modelIntegrityState) ? "STRONG" : modelIntegrityState === "EXPECTED_CHANGE" ? "WATCH" : providerConflict || modelIntegrityState === "INSUFFICIENT_EVIDENCE" ? "UNKNOWN" : severe ? "ELEVATED" : "WATCH";
  const trustConditions: TrustConditionInput[] = [{
    dimension: "MODEL_STATE_INTEGRITY",
    status: integrityStatus,
    confidence: providerConflict ? 0.3 : unavailable.length ? 0.55 : (input.observed.providerAssertions ?? []).length > 1 ? 0.95 : 0.82,
    evidenceReferences,
    lastVerifiedAt: input.observed.measuredAt,
    freshness,
    trend: materialChange ? "DETERIORATING" : input.previousAssessment && !["EXACT_MATCH", "SUPPORTED_MATCH"].includes(input.previousAssessment.modelIntegrityState) ? "IMPROVING" : "UNCHANGED",
    materiality: severe ? "CRITICAL" : materialChange ? "HIGH" : "MEDIUM",
    knownLimitations: unique([...input.approved.limitations ?? [], ...input.observed.limitations ?? [], ...unavailable.map((item) => `${item}:UNAVAILABLE`)]),
    summary: materialChange ? "Observed model state differs from the approved state and requires canonical policy consideration." : "Observed model state corresponds to the approved baseline.",
    signals: findings.map((item) => item.code),
    providerIds: providerNeutralEvidence.map((item) => item.providerId),
  }];
  const graphProjection = graphFor(input, assessmentId, evidenceReferences);
  const replayEvents = [
    { eventType: "MODEL_STATE_BASELINE_ESTABLISHED", occurredAt: input.approved.measuredAt, evidenceReferences: input.approved.evidenceReferences, details: { baselineId: input.approved.baselineId } },
    { eventType: "MODEL_STATE_OBSERVED", occurredAt: input.observed.measuredAt, evidenceReferences: input.observed.evidenceReferences, details: { observationId: input.observed.observationId } },
    { eventType: "MODEL_STATE_INTEGRITY_EVALUATED", occurredAt: input.evaluatedAt, evidenceReferences, details: { assessmentId, modelIntegrityState, findings: findings.map((item) => item.code), compromiseClaimed: false } },
    ...(input.actionReference ? [{ eventType: "CONSEQUENTIAL_ACTION_REQUESTED", occurredAt: input.evaluatedAt, evidenceReferences, details: { actionReference: input.actionReference } }] : []),
    ...(input.retrospectiveAdvisory ? [{ eventType: "RETROSPECTIVE_MODEL_STATE_REVIEW_OPENED", occurredAt: input.retrospectiveAdvisory.learnedAt, evidenceReferences: input.retrospectiveAdvisory.evidenceReferences, details: { advisoryReference: input.retrospectiveAdvisory.advisoryReference, exploitationAssumed: false } }] : []),
  ];
  const memoryTypes = unique([
    "MODEL_STATE_BASELINE_ESTABLISHED",
    ...(!materialChange ? [input.previousAssessment && !["EXACT_MATCH", "SUPPORTED_MATCH"].includes(input.previousAssessment.modelIntegrityState) ? "MODEL_STATE_RESTORED" : "MODEL_STATE_VERIFIED"] : []),
    ...(findings.some((item) => item.code === "RUNTIME_MODEL_ARTIFACT_MISMATCH") ? ["MODEL_ARTIFACT_MISMATCH"] : []),
    ...(findings.some((item) => item.code === "MODEL_TEMPLATE_CHANGED") ? ["MODEL_TEMPLATE_CHANGED"] : []),
    ...(findings.some((item) => item.code === "INFERENCE_CONFIGURATION_CHANGED") ? ["INFERENCE_CONFIGURATION_CHANGED"] : []),
    ...(findings.some((item) => item.code === "MODEL_ENDPOINT_CHANGED") ? ["MODEL_ENDPOINT_CHANGED"] : []),
    ...(findings.some((item) => item.code === "MODEL_RUNTIME_AUTH_CHANGED") ? ["MODEL_AUTH_STATE_CHANGED"] : []),
    ...(findings.some((item) => item.code === "MODEL_STATE_CHANGE_ORIGIN_UNRESOLVED") ? ["MODEL_STATE_CHANGE_ORIGIN_UNRESOLVED"] : []),
    ...(validationFindings.length ? ["VALIDATION_INVALIDATED"] : []),
    ...(input.retrospectiveAdvisory ? ["RETROSPECTIVE_MODEL_STATE_REVIEW_OPENED"] : []),
  ]);
  const trustMemoryEvents = memoryTypes.map((eventType) => ({ eventId: hashCanonical([assessmentId, eventType]), eventType, occurredAt: eventType === "MODEL_STATE_BASELINE_ESTABLISHED" ? input.approved.measuredAt : input.evaluatedAt, evidenceReferences }));
  const retrospectiveReview = {
    knownAtActionTime: { baselineDigest: input.approved.baselineDigest, observationDigest: input.observed.observationDigest, measuredAt: input.observed.measuredAt, evidenceReferences },
    learnedLater: input.retrospectiveAdvisory ? structuredClone(input.retrospectiveAdvisory) : null,
    recommendation: input.retrospectiveAdvisory ? "RETROSPECTIVE_MODEL_STATE_REVIEW_RECOMMENDED" as const : "NO_RETROSPECTIVE_REVIEW_INDICATED" as const,
    exploitationAssumed: false as const,
  };
  const core = {
    assessmentVersion: "1.0" as const,
    assessmentId,
    enterpriseId: input.enterpriseId,
    agentId: input.approved.agentId,
    approvedModelState: input.approved,
    observedModelState: input.observed,
    modelIntegrityState,
    templateIntegrity: { overall: templateOverall, agentSystemPrompt, modelTemplate, runtimeInferenceConfiguration },
    artifactIntegrity: { state: providerConflict ? "CONFLICTING" as const : !present(input.approved.modelArtifactDigest) || !present(input.observed.modelArtifactDigest) ? "UNAVAILABLE" as const : input.approved.modelArtifactDigest === input.observed.modelArtifactDigest ? "SUPPORTED" as const : "MISMATCH" as const, approvedDigest: input.approved.modelArtifactDigest ?? null, observedDigest: input.observed.modelArtifactDigest ?? null },
    runtimeIntegrity: { state: providerConflict ? "CONFLICTING" as const : unavailable.some((item) => /runtime|inference|network|authentication/i.test(item)) ? "UNAVAILABLE" as const : changed.some((item) => /runtime|inference|network|authentication/i.test(item.key)) ? "CHANGED" as const : "SUPPORTED" as const, changedComponents: changed.filter((item) => /runtime|inference|network|authentication|configuration/i.test(item.key)).map((item) => item.key), networkPosture: input.observed.networkPosture, authenticationPosture: input.observed.authenticationPosture },
    endpointIntegrity: { state: providerConflict ? "CONFLICTING" as const : !present(input.approved.endpointLineage.endpointReference) || !present(input.observed.endpointLineage.endpointReference) ? "UNAVAILABLE" as const : changed.some((item) => /endpoint|routingProvider|finalInferenceServer|inferenceServer/.test(item.key)) ? "CHANGED" as const : "SUPPORTED" as const, approved: input.approved.endpointLineage, observed: input.observed.endpointLineage },
    stateChangeProvenance: provenance,
    validationLineage,
    findings,
    requiredVerification,
    lastModelStateMeasurement: input.observed.measuredAt,
    modelStateEvidenceFreshness: freshness,
    providerNeutralEvidence,
    trustConditions,
    graphProjection,
    replayEvents,
    trustMemoryEvents,
    retrospectiveReview,
    trustInvariants: MODEL_STATE_TRUST_INVARIANTS.map((code) => ({ code, enabled: false as const, disposition: "RECOMMENDED_DISABLED" as const })),
    canonicalDecisionBoundary: { decisionAuthority: "CANONICAL_TRUST_FABRIC_ONLY" as const, canAllow: false as const, canReview: false as const, canDeny: false as const, canGrantAuthority: false as const, driftImpliesCompromise: false as const },
    evaluatedAt: input.evaluatedAt,
  };
  const assessmentDigest = hashCanonical(core);
  return deepFreeze({ ...core, assessmentDigest }) as ModelStateIntegrityAssessment;
}
