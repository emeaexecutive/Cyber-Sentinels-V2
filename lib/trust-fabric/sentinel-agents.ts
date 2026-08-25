import { deterministicUuid, hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { AdaptiveConsequenceClass, TrustGap, VerificationChallenge } from "./adaptive-verification.ts";
import type { TrustForecastGraphProjection, TrustForecastState } from "./trust-forecast.ts";
import type { CounterfactualTrustSimulation, TrustBudget, TrustPressure, TrustTwin, TrustTwinEntityType } from "./trust-twin.ts";

export const SENTINEL_ROLES = ["AUTHORITY", "IDENTITY", "RUNTIME", "EVIDENCE", "DEPLOYMENT", "WORKFORCE", "ROBOTICS"] as const;
export const SENTINEL_ATTENTION_STATES = ["NORMAL", "WATCHING", "INVESTIGATING", "ESCALATED", "PAUSED"] as const;
export const TRUST_WEATHER_STATES = ["CLEAR", "WATCH", "DETERIORATING", "SEVERE", "INSUFFICIENT_EVIDENCE"] as const;
export const SENTINEL_RECOMMENDATIONS = ["NO_ACTION", "OBSERVE", "REQUEST_EVIDENCE", "STEP_UP_VERIFICATION", "REQUALIFY_RUNTIME", "PIN_DESTINATION", "REDUCE_AUTHORITY", "RESTORE_MONITORING", "ROTATE_CREDENTIAL", "REQUIRE_HUMAN_APPROVAL", "REAUTHORIZE", "HOLD_DEPLOYMENT"] as const;
export const SENTINEL_ALLOWED_OPERATIONS = ["OBSERVE_CANONICAL_EVIDENCE", "READ_TRUST_TWIN", "READ_AUTHORITY_LINEAGE", "READ_EFFECTIVE_ACCESS", "READ_TRUST_MEMORY", "READ_POLICY", "READ_CONSEQUENCE_REACH", "RUN_COUNTERFACTUAL", "RECOMMEND_CONTROL", "ESCALATE_TO_CANONICAL_REVIEW"] as const;
export const SENTINEL_PROHIBITED_OPERATIONS = ["GRANT_AUTHORITY", "MODIFY_AUTHORITY", "MODIFY_POLICY", "FABRICATE_EVIDENCE", "EXTERNAL_WRITE", "CANONICAL_ALLOW", "CANONICAL_REVIEW", "CANONICAL_DENY", "SELF_APPROVE"] as const;

export type SentinelRole = (typeof SENTINEL_ROLES)[number];
export type SentinelAttention = (typeof SENTINEL_ATTENTION_STATES)[number];
export type TrustWeatherState = (typeof TRUST_WEATHER_STATES)[number];
export type SentinelRecommendation = (typeof SENTINEL_RECOMMENDATIONS)[number];
export type SentinelAllowedOperation = (typeof SENTINEL_ALLOWED_OPERATIONS)[number];
export type SentinelProhibitedOperation = (typeof SENTINEL_PROHIBITED_OPERATIONS)[number];
export type SentinelLifecycleState = "ACTIVE" | "PAUSED";
export type SentinelConfidence = { value: number; level: "LOW" | "MODERATE" | "HIGH" | "INSUFFICIENT"; basis: string[] };
export type SentinelConclusionClassification = "OBSERVED_FACT" | "DERIVED_CONDITION" | "HYPOTHESIS" | "RECOMMENDATION" | "CANONICAL_DECISION";
export type SentinelLifecycleRecord = { state: SentinelLifecycleState; createdAt: string; updatedAt: string };

export type SentinelRoleDefinition = {
  role: SentinelRole;
  name: string;
  mission: string;
  observationScope: string[];
  evidenceProviderClasses: string[];
  entityTypes: TrustTwinEntityType[];
};

export type SentinelIdentity = {
  entityType: "SOFTWARE_AGENT";
  identityReference: string;
  owner: string;
  purpose: string;
  tools: string[];
  permissions: SentinelAllowedOperation[];
  dataBoundaries: string[];
  destinationBoundaries: string[];
  runtimeReference: string;
  modelReference: string;
  monitoringReference: string;
  authorityReference: string;
  authorityScope: SentinelAllowedOperation[];
  deniedOperations: SentinelProhibitedOperation[];
  observedBySentinelIds: string[];
  implicitTrust: false;
};

export type SentinelObservation = {
  observationId: string;
  entityId: string;
  observedAt: string;
  classification: "OBSERVED_FACTS_AND_DERIVED_CONDITIONS";
  observedFacts: Array<{ dimension: string; value: string | number; evidenceReferences: string[]; source: "CANONICAL_TRUST_TWIN" }>;
  derivedConditions: string[];
  conflicts: string[];
  unknowns: string[];
  evidenceReferences: string[];
  freshness: string;
  deduplicated: boolean;
  material: boolean;
};

export type SentinelTrustHypothesis = {
  hypothesisId: string;
  classification: "HYPOTHESIS_NOT_FACT";
  statement: string;
  supporting: Array<{ statement: string; evidenceReferences: string[] }>;
  contradicting: Array<{ statement: string; evidenceReferences: string[] }>;
  confidence: SentinelConfidence;
  requiredProof: VerificationChallenge[];
  recommendedControl: SentinelRecommendation[];
  unknowns: string[];
  canChangeCanonicalDecision: false;
};

export type SentinelInvestigation = {
  investigationId: string;
  attention: SentinelAttention;
  performed: boolean;
  reason: string;
  approvedOperations: SentinelAllowedOperation[];
  prohibitedOperations: SentinelProhibitedOperation[];
  evidenceSources: string[];
  observation: SentinelObservation;
  hypothesis: SentinelTrustHypothesis;
  counterfactualReference: string | null;
  costControl: {
    deterministicConditionsFirst: true;
    expensiveAiInvoked: false;
    investigationTriggeredOnlyForMaterialConditions: true;
    nonMaterialOutcome: "DEDUPLICATE_WITHOUT_INVESTIGATION";
  };
};

export type SentinelTrustBrief = {
  briefVersion: "1.0";
  briefId: string;
  label: "SENTINEL_TRUST_BRIEF";
  enterpriseId: string;
  entityId: string;
  entityType: TrustTwinEntityType;
  sentinelId: string;
  sentinelRole: SentinelRole;
  attention: SentinelAttention;
  whyNow: string[];
  currentTwinId: string;
  currentForecast: TrustForecastState;
  currentTrend: TrustTwin["forecastTrend"];
  currentPressure: TrustPressure;
  currentBudget: TrustBudget;
  verificationDepth: TrustTwin["adaptiveVerification"]["requiredVerificationDepth"];
  verificationStatus: TrustTwin["adaptiveVerification"]["verificationStatus"];
  trustGaps: TrustGap[];
  consequence: AdaptiveConsequenceClass;
  consequenceReach: TrustTwin["consequenceReach"];
  policyReferences: string[];
  preActionContext: {
    actor: string;
    agent: string | null;
    delegatedHuman: string;
    authorityReference: string;
    intent: string;
    actionReference: string;
    monitoringState: TrustTwin["monitoringState"];
    mode: "PRE_ACTION" | "PRE_DEPLOYMENT";
    proposedTwinId: string | null;
    counterfactualReference: string | null;
    deploymentRecommendation: TrustTwin["trustForecast"]["deploymentRecommendation"];
    aiDeploymentTrustGate: "EXISTING_FORECAST_GATE";
  };
  hypothesis: SentinelTrustHypothesis;
  recommendedPrevention: SentinelRecommendation[];
  minimumPreventativeControl: SentinelRecommendation[];
  evidenceReferences: string[];
  confidence: SentinelConfidence;
  canonicalAuthority: "UNCHANGED";
  canonicalDecision: null;
  explainability: Array<{
    classification: SentinelConclusionClassification;
    statement: string;
    evidenceReferences: string[];
  }>;
  graphProjection: TrustForecastGraphProjection;
  replayEvents: Array<{ eventType: string; occurredAt: string; evidenceReferences: string[]; details: Record<string, unknown> }>;
  trustMemoryEvents: Array<{ eventId: string; eventType: string; occurredAt: string; evidenceReferences: string[] }>;
  learningEpisode: {
    conditionsObserved: string[];
    hypothesis: string;
    evidenceUsed: string[];
    evidenceMissing: VerificationChallenge[];
    forecast: TrustForecastState;
    recommendation: SentinelRecommendation[];
    canonicalDecision: null;
    controlApplied: null;
    outcome: null;
    laterResult: null;
    modelTrainingPerformed: false;
    onlinePolicyLearning: false;
  };
  canonicalBoundary: {
    sentinelCanAllow: false;
    sentinelCanReview: false;
    sentinelCanDeny: false;
    sentinelCanExecute: false;
    sentinelCanModifyAuthority: false;
    sentinelCanModifyPolicy: false;
    sentinelCanCreateEvidenceTruth: false;
    decisionAuthority: "CANONICAL_TRUST_FABRIC_ONLY";
  };
  knownLimitations: string[];
  generatedAt: string;
  briefDigest: string;
};

export type SentinelAgent = {
  sentinelVersion: "1.0";
  sentinelId: string;
  tenantId: string;
  name: string;
  role: SentinelRole;
  mission: string;
  scope: string[];
  entityTypes: TrustTwinEntityType[];
  authorityScope: SentinelAllowedOperation[];
  observationScope: string[];
  evidenceProviderClasses: string[];
  policyReferences: string[];
  currentState: SentinelLifecycleState;
  identity: SentinelIdentity;
  attention: SentinelAttention;
  lastObservation: string | null;
  lastMaterialChange: string | null;
  openTrustGaps: number;
  currentForecast: TrustForecastState | null;
  currentPressure: number | null;
  currentBudget: number | null;
  recommendedControl: SentinelRecommendation | null;
  confidence: SentinelConfidence;
  evidenceReferences: string[];
  observableByTrustFabric: true;
  recommendationIsCanonicalDecision: false;
  createdAt: string;
  updatedAt: string;
  stateDigest: string;
};

export type SentinelOperationalEvidence = {
  sentinelId: string;
  runtimeReference: string;
  toolsUsed: string[];
  investigationReferences: string[];
  evidenceAccessed: string[];
  counterfactualReferences: string[];
  recommendationsEmitted: SentinelRecommendation[];
  humanEscalations: Array<{ required: boolean; reason: string; emittedAt: string }>;
  chainOfThoughtStored: false;
  structuredResultMetadataOnly: true;
};

export type SentinelEntityAttention = {
  entityId: string;
  entityType: TrustTwinEntityType;
  sentinelId: string;
  sentinelRole: SentinelRole;
  attention: SentinelAttention;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "NORMAL";
  priorityReasons: string[];
  reason: string[];
  forecast: TrustForecastState;
  pressure: number;
  budgetRemaining: number;
  trustGap: TrustGap | null;
  consequence: AdaptiveConsequenceClass;
  recommendedPrevention: SentinelRecommendation[];
};

export type EnterpriseTrustWeather = {
  weatherVersion: "1.0";
  label: "ENTERPRISE_TRUST_WEATHER";
  enterpriseId: string;
  state: TrustWeatherState;
  currentConditions: string[];
  emergingPressure: string[];
  knownEntities: number;
  adequatelyEvidenced: number;
  deterioratingEvidenceConditions: number;
  trustGaps: number;
  criticalAuthorityPaths: number;
  entitiesToWatch: SentinelEntityAttention[];
  projectedConsequence: string;
  recommendedPrevention: SentinelRecommendation[];
  actualWeather: false;
  derivedOnly: true;
  generatedAt: string;
};

export type SentinelOperations = {
  operationsVersion: "1.0";
  label: "SENTINEL_OPERATIONS";
  enterpriseId: string;
  generatedAt: string;
  weather: EnterpriseTrustWeather;
  sentinels: SentinelAgent[];
  attentionQueue: SentinelEntityAttention[];
  trustBriefs: SentinelTrustBrief[];
  disagreements: Array<{ entityId: string; assessments: Array<{ sentinelRole: SentinelRole; assessment: string; evidenceReferences: string[] }>; canonicalResolutionMethod: "EVIDENCE_NOT_SENTINEL_VOTING" }>;
  graphProjection: TrustForecastGraphProjection;
  replayEvents: SentinelTrustBrief["replayEvents"];
  trustMemoryEvents: SentinelTrustBrief["trustMemoryEvents"];
  operationalEvidence: SentinelOperationalEvidence[];
  canonicalSystemOperationalWhenPaused: true;
  source: "DERIVED_FROM_CANONICAL_TRUST_FABRIC";
  operationsDigest: string;
};

const allEntityTypes: TrustTwinEntityType[] = ["HUMAN", "AI_AGENT", "SOFTWARE_AGENT", "WORKLOAD", "MACHINE", "ROBOT"];
export const SENTINEL_ROLE_DEFINITIONS: Record<SentinelRole, SentinelRoleDefinition> = {
  AUTHORITY: { role: "AUTHORITY", name: "Authority Sentinel", mission: "Observe authority, delegation, privilege, and downstream authorization propagation.", observationScope: ["authority", "delegation", "privilege", "authorization_propagation", "effective_access"], evidenceProviderClasses: ["IDENTITY_PROVIDER", "APPLICATION_SIGNAL", "RUNTIME_SECURITY_PROVIDER"], entityTypes: allEntityTypes },
  IDENTITY: { role: "IDENTITY", name: "Identity Sentinel", mission: "Observe human, agent, workload, machine, and robot identity continuity.", observationScope: ["identity", "owner", "session", "device", "agent_passport"], evidenceProviderClasses: ["IDENTITY_PROVIDER", "EDR_PROVIDER", "APPLICATION_SIGNAL"], entityTypes: allEntityTypes },
  RUNTIME: { role: "RUNTIME", name: "Runtime Sentinel", mission: "Observe runtime, model, tool, firmware, and configuration changes.", observationScope: ["runtime", "model", "toolset", "configuration", "firmware", "monitoring"], evidenceProviderClasses: ["RUNTIME_SECURITY_PROVIDER", "AI_ASSURANCE_PROVIDER", "MODEL_EVALUATION_PROVIDER", "EDGE_ATTESTATION_PROVIDER"], entityTypes: ["AI_AGENT", "SOFTWARE_AGENT", "WORKLOAD", "MACHINE", "ROBOT"] },
  EVIDENCE: { role: "EVIDENCE", name: "Evidence Sentinel", mission: "Observe evidence freshness, disagreement, provenance, and missing proof.", observationScope: ["evidence_freshness", "provider_disagreement", "missing_proof", "provenance"], evidenceProviderClasses: ["APPLICATION_SIGNAL", "IDENTITY_PROVIDER", "RUNTIME_SECURITY_PROVIDER", "AI_ASSURANCE_PROVIDER"], entityTypes: allEntityTypes },
  DEPLOYMENT: { role: "DEPLOYMENT", name: "Deployment Sentinel", mission: "Observe proposed AI and agent deployment changes before release.", observationScope: ["deployment", "production_manifest", "model_change", "tool_change", "destination_change"], evidenceProviderClasses: ["AI_ASSURANCE_PROVIDER", "MODEL_EVALUATION_PROVIDER", "RUNTIME_SECURITY_PROVIDER", "APPLICATION_SIGNAL"], entityTypes: ["AI_AGENT", "SOFTWARE_AGENT", "WORKLOAD"] },
  WORKFORCE: { role: "WORKFORCE", name: "Workforce Sentinel", mission: "Observe candidate, interview, onboarding, and workforce continuity.", observationScope: ["candidate", "interview", "onboarding", "workforce_identity", "human_intent"], evidenceProviderClasses: ["IDENTITY_PROVIDER", "APPLICATION_SIGNAL", "EDR_PROVIDER"], entityTypes: ["HUMAN"] },
  ROBOTICS: { role: "ROBOTICS", name: "Robotics Sentinel", mission: "Observe machine and robot authority, command origin, runtime, and operating boundaries.", observationScope: ["machine_identity", "command_origin", "runtime", "sensor", "physical_boundary", "safety_policy"], evidenceProviderClasses: ["ROBOTICS_RUNTIME_PROVIDER", "ROBOTICS_SAFETY_PROVIDER", "SENSOR_EVIDENCE_PROVIDER", "EDGE_ATTESTATION_PROVIDER"], entityTypes: ["MACHINE", "ROBOT"] },
};

const secretKey = /(?:^|_)(?:secret|password|private_key|access_token|refresh_token|credential_value|api_key)(?:$|_)/i;
const secretValue = /(?:bearer\s+[A-Za-z0-9._~+/=-]{16,}|-----BEGIN [A-Z ]+PRIVATE KEY-----)/i;

function assertSafe(value: unknown, path = "input") {
  if (typeof value === "string" && secretValue.test(value)) throw new TypeError(`${path} appears to contain a raw secret.`);
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (secretKey.test(key)) throw new TypeError(`${path}.${key} is not permitted; use a reference or digest.`);
    assertSafe(child, `${path}.${key}`);
  }
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function unique<T extends string>(values: readonly T[]): T[] { return [...new Set(values.filter(Boolean))].sort() as T[]; }
function clamp(value: number) { return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000)); }

function roleFor(twin: TrustTwin, simulation: CounterfactualTrustSimulation | null): SentinelRole {
  const signals = unique([...(simulation?.projectedTwin.trustForecast.forecastSignals ?? twin.trustForecast.forecastSignals), ...(simulation?.proposedChanges.map((item) => item.changeType) ?? [])]).join(" ");
  if (/AUTHORITY|PRIVILEGE|CREDENTIAL|DELEGAT/.test(signals)) return "AUTHORITY";
  if (/IDENTITY|OWNER|SESSION|DEVICE/.test(signals)) return "IDENTITY";
  if (/MODEL|TOOL|RUNTIME|MONITOR|FIRMWARE/.test(signals)) return "RUNTIME";
  if (/DEPLOY|DESTINATION|MANIFEST/.test(signals)) return "DEPLOYMENT";
  if (twin.entityType === "HUMAN") return "WORKFORCE";
  if (twin.entityType === "MACHINE" || twin.entityType === "ROBOT") return "ROBOTICS";
  return "EVIDENCE";
}

function confidenceFor(twin: TrustTwin): SentinelConfidence {
  const evidence = twin.evidenceReferences.length;
  const value = clamp((twin.providerConfidence * 0.7) + (Math.min(1, evidence / 6) * 0.3));
  return { value, level: evidence === 0 ? "INSUFFICIENT" : value >= 0.8 ? "HIGH" : value >= 0.55 ? "MODERATE" : "LOW", basis: [`Provider confidence ${Math.round(twin.providerConfidence * 100)}%.`, `${evidence} referenced evidence item(s).`] };
}

function attentionFor(twin: TrustTwin, simulation: CounterfactualTrustSimulation | null, lifecycleState: SentinelLifecycleState = "ACTIVE"): SentinelAttention {
  if (lifecycleState === "PAUSED") return "PAUSED";
  if (twin.trustForecast.state === "SEVERE" || twin.trustPressure.value >= 90 || twin.trustBudget.status === "EXCEEDED") return "ESCALATED";
  if (simulation || twin.materialEvents.length > 0 || twin.adaptiveVerification.trustGap.exists && ["STEP_UP", "GATE"].includes(twin.adaptiveVerification.requiredVerificationDepth)) return "INVESTIGATING";
  if (twin.trustForecast.state === "WATCH" || twin.trustPressure.value >= 35 || twin.trustBudget.status === "CONSTRAINED") return "WATCHING";
  return "NORMAL";
}

function recommendationsFor(twin: TrustTwin): SentinelRecommendation[] {
  const missing = twin.adaptiveVerification.missingEvidence;
  const output: SentinelRecommendation[] = [];
  if (missing.includes("VERIFY_RUNTIME") || missing.includes("VERIFY_AGENT_CONFIGURATION")) output.push("REQUALIFY_RUNTIME");
  if (missing.includes("VERIFY_DESTINATION")) output.push("PIN_DESTINATION");
  if (missing.includes("VERIFY_AUTHORITY")) output.push("REDUCE_AUTHORITY");
  if (missing.includes("VERIFY_MONITORING")) output.push("RESTORE_MONITORING");
  if (missing.includes("VERIFY_IDENTITY") || missing.includes("VERIFY_DEVICE")) output.push("STEP_UP_VERIFICATION");
  if (missing.includes("VERIFY_HUMAN_INTENT")) output.push("REQUIRE_HUMAN_APPROVAL");
  if (missing.includes("VERIFY_POLICY_ACKNOWLEDGEMENT")) output.push("REQUEST_EVIDENCE");
  if (twin.trustForecast.deploymentRecommendation === "HOLD") output.push("HOLD_DEPLOYMENT");
  return unique(output.length ? output : [twin.trustForecast.state === "STABLE" ? "OBSERVE" : "REQUEST_EVIDENCE"]);
}

function observationFor(twin: TrustTwin, evaluatedAt: string, simulation: CounterfactualTrustSimulation | null): SentinelObservation {
  const facts = [
    ["identity", twin.identityState], ["authority", twin.authorityState], ["runtime", twin.runtimeState], ["tool", twin.toolState],
    ["monitoring", twin.monitoringState], ["destination", twin.destinationState], ["forecast", twin.trustForecast.state],
    ["pressure", twin.trustPressure.value], ["budget_remaining", twin.trustBudget.remaining], ["verification", twin.adaptiveVerification.requiredVerificationDepth],
  ] as const;
  const conditions = unique([
    ...twin.trustForecast.primaryContributors.map((item) => `${item.dimension}:${item.status}`),
    ...twin.adaptiveVerification.missingEvidence.map((item) => `MISSING:${item}`),
    ...(simulation?.proposedChanges.map((item) => `PROPOSED:${item.changeType}`) ?? []),
  ]);
  const material = Boolean(simulation || twin.materialEvents.length || twin.adaptiveVerification.trustGap.exists || !["STABLE", "WATCH"].includes(twin.trustForecast.state));
  const core = {
    entityId: twin.entityId,
    observedAt: evaluatedAt,
    classification: "OBSERVED_FACTS_AND_DERIVED_CONDITIONS" as const,
    observedFacts: facts.map(([dimension, value]) => ({ dimension, value, evidenceReferences: twin.evidenceReferences, source: "CANONICAL_TRUST_TWIN" as const })),
    derivedConditions: conditions,
    conflicts: twin.trustForecast.evidenceGaps.filter((item) => /CONFLICT|DISAGREE/.test(item)),
    unknowns: unique([...twin.knownLimitations, ...twin.adaptiveVerification.knownLimitations]),
    evidenceReferences: twin.evidenceReferences,
    freshness: twin.adaptiveVerification.evidenceFreshness,
    deduplicated: !material,
    material,
  };
  return { observationId: deterministicUuid(core), ...core };
}

function hypothesisFor(twin: TrustTwin, observation: SentinelObservation, recommendations: SentinelRecommendation[]): SentinelTrustHypothesis {
  const gap = twin.adaptiveVerification.trustGap;
  const confidence = confidenceFor(twin);
  const supporting = [
    ...twin.trustForecast.primaryContributors.map((item) => ({ statement: item.explanation, evidenceReferences: item.evidenceReferences })),
    ...gap.missingEvidence.map((item) => ({ statement: `${item} is not currently satisfied.`, evidenceReferences: twin.evidenceReferences })),
  ];
  const contradicting = twin.trustForecast.mitigatingConditions.map((item) => ({ statement: item.explanation, evidenceReferences: item.evidenceReferences }));
  const statement = gap.exists
    ? "The current or proposed authority may exceed current verification coverage."
    : twin.trustForecast.state === "STABLE" ? "Current evidence supports continued observation without additional friction." : "Trust conditions may be deteriorating and require current proof.";
  const core = { statement, supporting, contradicting, confidence, requiredProof: gap.minimumProofRequired.challenges, recommendedControl: recommendations, unknowns: observation.unknowns };
  return { hypothesisId: deterministicUuid(core), classification: "HYPOTHESIS_NOT_FACT", ...core, canChangeCanonicalDecision: false };
}

function graphFor(input: { sentinelId: string; briefId: string; twin: TrustTwin; observation: SentinelObservation; hypothesis: SentinelTrustHypothesis; recommendations: SentinelRecommendation[]; simulation: CounterfactualTrustSimulation | null }): TrustForecastGraphProjection {
  const recommendationId = `${input.briefId}:recommendation`;
  const canonicalBoundaryId = `${input.briefId}:canonical-decision:pending`;
  const conditionNodes = input.twin.graphProjection.nodes.filter((item) => item.nodeType === "TRUST_CONDITION");
  const evidenceNodes = input.twin.graphProjection.nodes.filter((item) => item.nodeType === "EVIDENCE");
  const gapNodes = input.twin.graphProjection.nodes.filter((item) => item.nodeType === "TRUST_GAP");
  const forecastNodes = input.twin.graphProjection.nodes.filter((item) => item.nodeType === "FORECAST");
  const interventionNodes = input.twin.graphProjection.nodes.filter((item) => item.nodeType === "INTERVENTION");
  const outcomeNodes = input.twin.graphProjection.nodes.filter((item) => item.nodeType === "OUTCOME");
  const nodes: TrustForecastGraphProjection["nodes"] = [
    ...input.twin.graphProjection.nodes,
    { nodeType: "SENTINEL", externalId: input.sentinelId, domainKey: "GOVERNANCE", label: "Sentinel Agent", metadata: { canonicalAuthority: false } },
    { nodeType: "OBSERVATION", externalId: input.observation.observationId, domainKey: "EVIDENCE", label: "Sentinel observation", metadata: { material: input.observation.material } },
    { nodeType: "HYPOTHESIS", externalId: input.hypothesis.hypothesisId, domainKey: "GOVERNANCE", label: "Hypothesis, not fact", metadata: { confidence: input.hypothesis.confidence.level } },
    { nodeType: "RECOMMENDATION", externalId: recommendationId, domainKey: "GOVERNANCE", label: input.recommendations.join(" + "), metadata: { advisoryOnly: true } },
    { nodeType: "CANONICAL_DECISION", externalId: canonicalBoundaryId, domainKey: "GOVERNANCE", label: "Canonical decision pending", metadata: { status: "PENDING", decision: null, authority: "CANONICAL_TRUST_FABRIC_ONLY" } },
  ];
  const edges: TrustForecastGraphProjection["edges"] = [
    ...input.twin.graphProjection.edges,
    { fromNodeType: "SENTINEL", fromExternalId: input.sentinelId, toNodeType: "OBSERVATION", toExternalId: input.observation.observationId, edgeType: "ASSERTS" },
    ...conditionNodes.map((item) => ({ fromNodeType: "OBSERVATION", fromExternalId: input.observation.observationId, toNodeType: "TRUST_CONDITION", toExternalId: item.externalId, edgeType: "RESULTED_IN" as const })),
    ...conditionNodes.map((item) => ({ fromNodeType: "TRUST_CONDITION", fromExternalId: item.externalId, toNodeType: "HYPOTHESIS", toExternalId: input.hypothesis.hypothesisId, edgeType: "SUPPORTED" as const })),
    ...evidenceNodes.map((item) => ({ fromNodeType: "HYPOTHESIS", fromExternalId: input.hypothesis.hypothesisId, toNodeType: "EVIDENCE", toExternalId: item.externalId, edgeType: "DERIVED_FROM" as const })),
    ...evidenceNodes.flatMap((evidence) => gapNodes.map((gap) => ({ fromNodeType: "EVIDENCE", fromExternalId: evidence.externalId, toNodeType: "TRUST_GAP", toExternalId: gap.externalId, edgeType: "CORRELATED_WITH" as const }))),
    ...gapNodes.flatMap((gap) => forecastNodes.map((forecast) => ({ fromNodeType: "TRUST_GAP", fromExternalId: gap.externalId, toNodeType: "FORECAST", toExternalId: forecast.externalId, edgeType: "CORRELATED_WITH" as const }))),
    { fromNodeType: "RECOMMENDATION", fromExternalId: recommendationId, toNodeType: "ENTITY", toExternalId: input.twin.entityId, edgeType: "APPLIES_TO" },
    { fromNodeType: "RECOMMENDATION", fromExternalId: recommendationId, toNodeType: "CANONICAL_DECISION", toExternalId: canonicalBoundaryId, edgeType: "APPLIES_TO" },
    ...interventionNodes.map((item) => ({ fromNodeType: "CANONICAL_DECISION", fromExternalId: canonicalBoundaryId, toNodeType: "INTERVENTION", toExternalId: item.externalId, edgeType: "TRIGGERED" as const })),
    ...interventionNodes.flatMap((intervention) => outcomeNodes.map((outcome) => ({ fromNodeType: "INTERVENTION", fromExternalId: intervention.externalId, toNodeType: "OUTCOME", toExternalId: outcome.externalId, edgeType: "RESULTED_IN" as const }))),
  ];
  if (input.simulation) {
    nodes.push({ nodeType: "SIMULATION", externalId: input.simulation.simulationId, domainKey: "GOVERNANCE", label: "Counterfactual Trust Simulation", metadata: { executionPerformed: false } });
    if (forecastNodes.length) edges.push(...forecastNodes.map((item) => ({ fromNodeType: "FORECAST", fromExternalId: item.externalId, toNodeType: "SIMULATION", toExternalId: input.simulation!.simulationId, edgeType: "TRIGGERED" as const })));
    else edges.push({ fromNodeType: "HYPOTHESIS", fromExternalId: input.hypothesis.hypothesisId, toNodeType: "SIMULATION", toExternalId: input.simulation.simulationId, edgeType: "TRIGGERED" });
    edges.push({ fromNodeType: "SIMULATION", fromExternalId: input.simulation.simulationId, toNodeType: "RECOMMENDATION", toExternalId: recommendationId, edgeType: "RESULTED_IN" });
  } else {
    edges.push(...forecastNodes.map((item) => ({ fromNodeType: "FORECAST", fromExternalId: item.externalId, toNodeType: "RECOMMENDATION", toExternalId: recommendationId, edgeType: "RESULTED_IN" as const })));
  }
  return { nodes, edges };
}

function priorityFor(twin: TrustTwin, attention: SentinelAttention) {
  const reasons = unique([
    `Consequence ${twin.adaptiveVerification.consequence}.`,
    `Forecast ${twin.trustForecast.state}.`,
    `Pressure ${twin.trustPressure.value}.`,
    `Budget ${twin.trustBudget.remaining}/${twin.trustBudget.total}.`,
    `Reach ${twin.consequenceReach.systemCount} systems (${twin.consequenceReach.level}).`,
    ...(twin.adaptiveVerification.trustGap.exists ? ["Current proof is below the contextual requirement."] : []),
  ]);
  const priority = attention === "ESCALATED" || twin.adaptiveVerification.consequence === "CRITICAL" ? "URGENT"
    : attention === "INVESTIGATING" || twin.adaptiveVerification.consequence === "HIGH" ? "HIGH"
      : attention === "WATCHING" ? "MEDIUM" : "NORMAL";
  return { priority: priority as SentinelEntityAttention["priority"], reasons };
}

function sentinelId(enterpriseId: string, role: SentinelRole) { return deterministicUuid({ enterpriseId, role, type: "SENTINEL_AGENT" }); }

function agentFor(input: { enterpriseId: string; role: SentinelRole; owner: string; policyReferences: string[]; lifecycle: SentinelLifecycleRecord; twin: TrustTwin | null; brief: SentinelTrustBrief | null; evaluatedAt: string }): SentinelAgent {
  const definition = SENTINEL_ROLE_DEFINITIONS[input.role];
  const id = sentinelId(input.enterpriseId, input.role);
  const watchers = input.role === "IDENTITY" ? [sentinelId(input.enterpriseId, "AUTHORITY"), sentinelId(input.enterpriseId, "RUNTIME")]
    : input.role === "AUTHORITY" ? [sentinelId(input.enterpriseId, "IDENTITY")] : [sentinelId(input.enterpriseId, "IDENTITY"), sentinelId(input.enterpriseId, "AUTHORITY")];
  const confidence = input.twin ? confidenceFor(input.twin) : { value: 0, level: "INSUFFICIENT" as const, basis: ["No current scoped Trust Twin is available."] };
  const identity: SentinelIdentity = {
    entityType: "SOFTWARE_AGENT",
    identityReference: `operational-entity:sentinel:${input.role.toLowerCase()}`,
    owner: input.owner,
    purpose: definition.mission,
    tools: ["canonical-evidence-reader", "trust-twin-reader", "counterfactual-simulator"],
    permissions: [...SENTINEL_ALLOWED_OPERATIONS],
    dataBoundaries: [`tenant:${input.enterpriseId}`, ...definition.observationScope.map((item) => `domain:${item}`)],
    destinationBoundaries: ["canonical-trust-fabric:review-queue"],
    runtimeReference: "runtime:sentinel-agents-v1",
    modelReference: "deterministic-sentinel-v1:no-autonomous-model",
    monitoringReference: "monitoring:canonical-sentinel-activity",
    authorityReference: `authority:sentinel:${input.role.toLowerCase()}:observe-recommend-only`,
    authorityScope: [...SENTINEL_ALLOWED_OPERATIONS],
    deniedOperations: [...SENTINEL_PROHIBITED_OPERATIONS],
    observedBySentinelIds: watchers,
    implicitTrust: false,
  };
  const core = {
    sentinelVersion: "1.0" as const,
    sentinelId: id,
    tenantId: input.enterpriseId,
    name: definition.name,
    role: input.role,
    mission: definition.mission,
    scope: [`tenant:${input.enterpriseId}`, ...definition.observationScope],
    entityTypes: definition.entityTypes,
    authorityScope: [...SENTINEL_ALLOWED_OPERATIONS],
    observationScope: definition.observationScope,
    evidenceProviderClasses: definition.evidenceProviderClasses,
    policyReferences: input.policyReferences,
    currentState: input.lifecycle.state,
    identity,
    attention: input.lifecycle.state === "PAUSED" ? "PAUSED" as const : input.brief?.attention ?? "NORMAL" as const,
    lastObservation: input.brief?.generatedAt ?? null,
    lastMaterialChange: input.brief?.trustMemoryEvents.length ? input.evaluatedAt : null,
    openTrustGaps: input.brief?.trustGaps.filter((item) => item.exists).length ?? 0,
    currentForecast: input.twin?.trustForecast.state ?? null,
    currentPressure: input.twin?.trustPressure.value ?? null,
    currentBudget: input.twin?.trustBudget.remaining ?? null,
    recommendedControl: input.brief?.recommendedPrevention[0] ?? null,
    confidence,
    evidenceReferences: input.twin?.evidenceReferences ?? [],
    observableByTrustFabric: true as const,
    recommendationIsCanonicalDecision: false as const,
    createdAt: input.lifecycle.createdAt,
    updatedAt: input.lifecycle.updatedAt,
  };
  return deepFreeze({ ...core, stateDigest: hashCanonical(core) }) as SentinelAgent;
}

export function createSentinelTrustBrief(input: { enterpriseId: string; currentTwin: TrustTwin; evaluatedAt: string; simulation?: CounterfactualTrustSimulation | null; lifecycleState?: SentinelLifecycleState }): SentinelTrustBrief {
  assertSafe(input);
  if (input.currentTwin.enterpriseId !== input.enterpriseId || input.simulation && input.simulation.enterpriseId !== input.enterpriseId) throw new Error("SENTINEL_TENANT_SCOPE_MISMATCH");
  if (input.simulation && input.simulation.entityId !== input.currentTwin.entityId) throw new Error("SENTINEL_ENTITY_SCOPE_MISMATCH");
  if (!Number.isFinite(Date.parse(input.evaluatedAt))) throw new TypeError("Sentinel evaluation timestamp is invalid.");
  const twin = input.simulation?.projectedTwin ?? input.currentTwin;
  const simulation = input.simulation ?? null;
  const role = roleFor(twin, simulation);
  const id = sentinelId(input.enterpriseId, role);
  const observation = observationFor(twin, input.evaluatedAt, simulation);
  const recommendations = recommendationsFor(twin);
  const hypothesis = hypothesisFor(twin, observation, recommendations);
  const attention = attentionFor(twin, simulation, input.lifecycleState);
  const confidence = confidenceFor(twin);
  const whyNow = unique([
    ...(simulation?.proposedChanges.map((item) => `Proposed ${item.changeType}.`) ?? []),
    ...twin.trustForecast.primaryContributors.map((item) => item.explanation),
    ...(twin.adaptiveVerification.trustGap.exists ? [`${twin.adaptiveVerification.missingEvidence.length} contextual proof gap(s) are open.`] : []),
  ]);
  const briefId = deterministicUuid({ enterpriseId: input.enterpriseId, entityId: twin.entityId, sentinelId: id, evaluatedAt: input.evaluatedAt, twinDigest: twin.twinDigest, simulationId: simulation?.simulationId ?? null });
  const graphProjection = graphFor({ sentinelId: id, briefId, twin, observation, hypothesis, recommendations, simulation });
  const authorityReference = twin.graphProjection.nodes.find((item) => item.nodeType === "AUTHORITY")?.externalId ?? twin.policyReference;
  const actionReference = twin.graphProjection.nodes.find((item) => item.nodeType === "ACTION")?.externalId ?? twin.purpose;
  const preActionContext = {
    actor: twin.entityId,
    agent: ["AI_AGENT", "SOFTWARE_AGENT"].includes(twin.entityType) ? twin.entityId : null,
    delegatedHuman: twin.owner,
    authorityReference,
    intent: twin.purpose,
    actionReference,
    monitoringState: twin.monitoringState,
    mode: (role === "DEPLOYMENT" || twin.trustForecast.horizon === "PRE_DEPLOYMENT" ? "PRE_DEPLOYMENT" : "PRE_ACTION") as "PRE_ACTION" | "PRE_DEPLOYMENT",
    proposedTwinId: simulation?.projectedTwin.twinId ?? null,
    counterfactualReference: simulation?.simulationId ?? null,
    deploymentRecommendation: twin.trustForecast.deploymentRecommendation,
    aiDeploymentTrustGate: "EXISTING_FORECAST_GATE" as const,
  };
  const explainability: SentinelTrustBrief["explainability"] = [
    ...observation.observedFacts.map((item) => ({ classification: "OBSERVED_FACT" as const, statement: `${item.dimension}: ${item.value}`, evidenceReferences: item.evidenceReferences })),
    ...observation.derivedConditions.map((item) => ({ classification: "DERIVED_CONDITION" as const, statement: item, evidenceReferences: observation.evidenceReferences })),
    { classification: "HYPOTHESIS", statement: hypothesis.statement, evidenceReferences: observation.evidenceReferences },
    ...recommendations.map((item) => ({ classification: "RECOMMENDATION" as const, statement: item, evidenceReferences: observation.evidenceReferences })),
    { classification: "CANONICAL_DECISION", statement: "PENDING_CANONICAL_EVALUATION", evidenceReferences: [] },
  ];
  const replayEvents = [
    { eventType: "SENTINEL_OBSERVATION_RECORDED", occurredAt: input.evaluatedAt, evidenceReferences: observation.evidenceReferences, details: { observationId: observation.observationId, material: observation.material, classification: observation.classification } },
    ...(attention === "PAUSED" ? [{ eventType: "SENTINEL_OBSERVATION_PAUSED", occurredAt: input.evaluatedAt, evidenceReferences: [], details: { canonicalSystemAffected: false } }] : []),
    ...(observation.material && attention !== "PAUSED" ? [{ eventType: "SENTINEL_ATTENTION_CHANGED", occurredAt: input.evaluatedAt, evidenceReferences: observation.evidenceReferences, details: { attention, reason: whyNow } }] : []),
    ...(observation.material && attention !== "PAUSED" ? [{ eventType: "SENTINEL_INVESTIGATION_PERFORMED", occurredAt: input.evaluatedAt, evidenceReferences: observation.evidenceReferences, details: { hypothesisId: hypothesis.hypothesisId, simulationId: simulation?.simulationId ?? null, recommendations } }] : []),
  ];
  const memoryTypes = unique([
    ...(observation.material ? ["SENTINEL_IMPORTANT_INVESTIGATION"] : []),
    ...(twin.adaptiveVerification.trustGap.status === "OPEN" ? ["SENTINEL_CRITICAL_TRUST_GAP_DISCOVERED"] : []),
    ...(twin.adaptiveVerification.trustGap.status === "RESOLVED" ? ["SENTINEL_CRITICAL_TRUST_GAP_RESOLVED", "SENTINEL_PREVENTATIVE_CONTROL_SUCCEEDED"] : []),
    ...(["ELEVATED", "SEVERE"].includes(twin.trustForecast.state) ? ["SENTINEL_FORECAST_DETERIORATION"] : []),
  ]);
  const trustMemoryEvents = memoryTypes.map((eventType) => ({ eventId: hashCanonical([briefId, eventType]), eventType, occurredAt: input.evaluatedAt, evidenceReferences: observation.evidenceReferences }));
  const trustGaps = twin.adaptiveVerification.trustGap.exists || twin.adaptiveVerification.trustGap.status === "RESOLVED" ? [twin.adaptiveVerification.trustGap] : [];
  const core = {
    briefVersion: "1.0" as const,
    briefId,
    label: "SENTINEL_TRUST_BRIEF" as const,
    enterpriseId: input.enterpriseId,
    entityId: twin.entityId,
    entityType: twin.entityType,
    sentinelId: id,
    sentinelRole: role,
    attention,
    whyNow: whyNow.length ? whyNow : ["Deterministic observation found no material deterioration."],
    currentTwinId: twin.twinId,
    currentForecast: twin.trustForecast.state,
    currentTrend: twin.forecastTrend,
    currentPressure: twin.trustPressure,
    currentBudget: twin.trustBudget,
    verificationDepth: twin.adaptiveVerification.requiredVerificationDepth,
    verificationStatus: twin.adaptiveVerification.verificationStatus,
    trustGaps,
    consequence: twin.adaptiveVerification.consequence,
    consequenceReach: twin.consequenceReach,
    policyReferences: [twin.policyReference, twin.adaptiveVerification.policyReference],
    preActionContext,
    hypothesis,
    recommendedPrevention: recommendations,
    minimumPreventativeControl: recommendations.slice(0, Math.min(3, recommendations.length)),
    evidenceReferences: observation.evidenceReferences,
    confidence,
    canonicalAuthority: "UNCHANGED" as const,
    canonicalDecision: null,
    explainability,
    graphProjection,
    replayEvents,
    trustMemoryEvents,
    learningEpisode: {
      conditionsObserved: observation.derivedConditions,
      hypothesis: hypothesis.statement,
      evidenceUsed: observation.evidenceReferences,
      evidenceMissing: twin.adaptiveVerification.missingEvidence,
      forecast: twin.trustForecast.state,
      recommendation: recommendations,
      canonicalDecision: null,
      controlApplied: null,
      outcome: null,
      laterResult: null,
      modelTrainingPerformed: false as const,
      onlinePolicyLearning: false as const,
    },
    canonicalBoundary: { sentinelCanAllow: false as const, sentinelCanReview: false as const, sentinelCanDeny: false as const, sentinelCanExecute: false as const, sentinelCanModifyAuthority: false as const, sentinelCanModifyPolicy: false as const, sentinelCanCreateEvidenceTruth: false as const, decisionAuthority: "CANONICAL_TRUST_FABRIC_ONLY" as const },
    knownLimitations: ["Sentinel findings are deterministic derived observations, hypotheses, and recommendations; they are not facts beyond cited evidence or canonical decisions.", "No autonomous model training, online policy learning, external writes, or consequential execution is performed.", "A paused Sentinel does not pause or replace the canonical Trust Fabric."],
    generatedAt: input.evaluatedAt,
  };
  return deepFreeze({ ...core, briefDigest: hashCanonical(core) }) as SentinelTrustBrief;
}

export function createSentinelInvestigation(input: { enterpriseId: string; currentTwin: TrustTwin; evaluatedAt: string; simulation?: CounterfactualTrustSimulation | null; lifecycleState?: SentinelLifecycleState }): SentinelInvestigation {
  const brief = createSentinelTrustBrief(input);
  const twin = input.simulation?.projectedTwin ?? input.currentTwin;
  const observation = observationFor(twin, input.evaluatedAt, input.simulation ?? null);
  const performed = observation.material && brief.attention !== "PAUSED";
  return deepFreeze({
    investigationId: deterministicUuid({ briefId: brief.briefId, type: "SENTINEL_INVESTIGATION" }),
    attention: brief.attention,
    performed,
    reason: brief.attention === "PAUSED" ? "Sentinel observation is paused; the canonical Trust Fabric remains operational." : observation.material ? brief.whyNow.join(" ") : "No material deterministic condition requires investigation.",
    approvedOperations: performed ? [...SENTINEL_ALLOWED_OPERATIONS] : brief.attention === "PAUSED" ? [] : ["OBSERVE_CANONICAL_EVIDENCE"],
    prohibitedOperations: [...SENTINEL_PROHIBITED_OPERATIONS],
    evidenceSources: brief.evidenceReferences,
    observation,
    hypothesis: brief.hypothesis,
    counterfactualReference: input.simulation?.simulationId ?? null,
    costControl: { deterministicConditionsFirst: true, expensiveAiInvoked: false, investigationTriggeredOnlyForMaterialConditions: true, nonMaterialOutcome: "DEDUPLICATE_WITHOUT_INVESTIGATION" },
  }) as SentinelInvestigation;
}

function weatherFor(enterpriseId: string, generatedAt: string, twins: TrustTwin[], queue: SentinelEntityAttention[]): EnterpriseTrustWeather {
  const insufficient = twins.length === 0 || twins.some((item) => item.trustForecast.state === "INSUFFICIENT_EVIDENCE");
  const severe = twins.some((item) => item.trustForecast.state === "SEVERE" || item.trustPressure.value >= 90 || item.trustBudget.status === "EXCEEDED");
  const deteriorating = twins.some((item) => ["ELEVATED"].includes(item.trustForecast.state) || item.trustPressure.value >= 65 || item.trustBudget.status === "NEAR_LIMIT");
  const watching = twins.some((item) => item.trustForecast.state === "WATCH" || item.adaptiveVerification.trustGap.exists || item.trustPressure.value >= 35);
  const state: TrustWeatherState = insufficient ? "INSUFFICIENT_EVIDENCE" : severe ? "SEVERE" : deteriorating ? "DETERIORATING" : watching ? "WATCH" : "CLEAR";
  const gaps = twins.filter((item) => item.adaptiveVerification.trustGap.exists);
  const deterioratingEvidence = twins.filter((item) => ["AGING", "STALE", "EXPIRED", "INVALIDATED", "UNAVAILABLE"].includes(item.adaptiveVerification.evidenceFreshness));
  const criticalPaths = gaps.filter((item) => ["HIGH", "CRITICAL"].includes(item.adaptiveVerification.consequence));
  return deepFreeze({
    weatherVersion: "1.0",
    label: "ENTERPRISE_TRUST_WEATHER",
    enterpriseId,
    state,
    currentConditions: unique(twins.map((item) => `${item.entityId}:${item.trustForecast.state}`)),
    emergingPressure: unique(twins.filter((item) => item.trustPressure.trend === "RISING" || item.trustPressure.trend === "SPIKING").flatMap((item) => item.trustPressure.primaryContributors.map((factor) => `${item.entityId}:${factor.code}`))),
    knownEntities: twins.length,
    adequatelyEvidenced: twins.filter((item) => !item.adaptiveVerification.trustGap.exists).length,
    deterioratingEvidenceConditions: deterioratingEvidence.length,
    trustGaps: gaps.length,
    criticalAuthorityPaths: criticalPaths.length,
    entitiesToWatch: queue.slice(0, 10),
    projectedConsequence: queue[0] ? `${queue[0].consequence} consequence across the highest-priority known path.` : "No material projected consequence is currently identified.",
    recommendedPrevention: unique(queue.flatMap((item) => item.recommendedPrevention)).slice(0, 5),
    actualWeather: false,
    derivedOnly: true,
    generatedAt,
  }) as EnterpriseTrustWeather;
}

export function createSentinelOperations(input: { enterpriseId: string; twins: TrustTwin[]; generatedAt: string; owner?: string; lifecycleStates?: Partial<Record<SentinelRole, SentinelLifecycleState>>; lifecycleRecords?: Partial<Record<SentinelRole, SentinelLifecycleRecord>>; simulations?: CounterfactualTrustSimulation[] }): SentinelOperations {
  assertSafe(input);
  if (!Number.isFinite(Date.parse(input.generatedAt))) throw new TypeError("Sentinel Operations timestamp is invalid.");
  if (input.twins.some((item) => item.enterpriseId !== input.enterpriseId) || (input.simulations ?? []).some((item) => item.enterpriseId !== input.enterpriseId)) throw new Error("SENTINEL_OPERATIONS_TENANT_SCOPE_MISMATCH");
  const latestTwins = [...new Map(input.twins.map((item) => [item.entityId, item])).values()];
  const simulations = new Map((input.simulations ?? []).map((item) => [item.entityId, item]));
  const briefs = latestTwins.map((twin) => {
    const simulation = simulations.get(twin.entityId) ?? null;
    const role = roleFor(simulation?.projectedTwin ?? twin, simulation);
    const lifecycleState = input.lifecycleRecords?.[role]?.state ?? input.lifecycleStates?.[role] ?? "ACTIVE";
    return createSentinelTrustBrief({ enterpriseId: input.enterpriseId, currentTwin: twin, evaluatedAt: input.generatedAt, simulation, lifecycleState });
  });
  const queue = briefs.map((brief) => {
    const twin = simulations.get(brief.entityId)?.projectedTwin ?? latestTwins.find((item) => item.entityId === brief.entityId)!;
    const priority = priorityFor(twin, brief.attention);
    return { entityId: brief.entityId, entityType: brief.entityType, sentinelId: brief.sentinelId, sentinelRole: brief.sentinelRole, attention: brief.attention, priority: priority.priority, priorityReasons: priority.reasons, reason: brief.whyNow, forecast: brief.currentForecast, pressure: brief.currentPressure.value, budgetRemaining: brief.currentBudget.remaining, trustGap: brief.trustGaps.find((item) => item.exists) ?? null, consequence: brief.consequence, recommendedPrevention: brief.recommendedPrevention };
  }).sort((a, b) => ["URGENT", "HIGH", "MEDIUM", "NORMAL"].indexOf(a.priority) - ["URGENT", "HIGH", "MEDIUM", "NORMAL"].indexOf(b.priority) || b.pressure - a.pressure);
  const briefByRole = new Map(briefs.map((item) => [item.sentinelRole, item]));
  const twinsByRole = new Map(briefs.map((brief) => [brief.sentinelRole, latestTwins.find((item) => item.entityId === brief.entityId) ?? null]));
  const sentinels = SENTINEL_ROLES.map((role) => {
    const twin = twinsByRole.get(role) ?? latestTwins[0] ?? null;
    const fallbackTimestamp = twin?.updatedAt ?? input.generatedAt;
    const lifecycle = input.lifecycleRecords?.[role] ?? { state: input.lifecycleStates?.[role] ?? "ACTIVE", createdAt: fallbackTimestamp, updatedAt: fallbackTimestamp };
    return agentFor({ enterpriseId: input.enterpriseId, role, owner: input.owner ?? "owner:enterprise-trust-operations", policyReferences: unique(latestTwins.map((item) => item.policyReference)), lifecycle, twin, brief: briefByRole.get(role) ?? null, evaluatedAt: input.generatedAt });
  });
  const weather = weatherFor(input.enterpriseId, input.generatedAt, latestTwins.map((item) => simulations.get(item.entityId)?.projectedTwin ?? item), queue);
  const graphProjection: TrustForecastGraphProjection = {
    nodes: [...briefs.flatMap((item) => item.graphProjection.nodes), ...sentinels.map((item) => ({ nodeType: "SENTINEL_IDENTITY", externalId: item.identity.identityReference, domainKey: "IDENTITY", label: item.name, metadata: { observable: true, implicitTrust: false } }))],
    edges: [...briefs.flatMap((item) => item.graphProjection.edges), ...sentinels.flatMap((item) => item.identity.observedBySentinelIds.map((watcher) => ({ fromNodeType: "SENTINEL", fromExternalId: watcher, toNodeType: "SENTINEL_IDENTITY", toExternalId: item.identity.identityReference, edgeType: "CORRELATED_WITH" as const })))],
  };
  const disagreements = briefs.map((brief) => {
    const twin = simulations.get(brief.entityId)?.projectedTwin ?? latestTwins.find((item) => item.entityId === brief.entityId)!;
    return { entityId: brief.entityId, assessments: [
      { sentinelRole: "IDENTITY" as const, assessment: `Identity ${twin.identityState}.`, evidenceReferences: twin.evidenceReferences },
      { sentinelRole: "RUNTIME" as const, assessment: `Runtime ${twin.runtimeState}; tools ${twin.toolState}; monitoring ${twin.monitoringState}.`, evidenceReferences: twin.evidenceReferences },
      { sentinelRole: "AUTHORITY" as const, assessment: `Authority ${twin.authorityState}; propagation ${twin.authorizationPropagation}.`, evidenceReferences: twin.evidenceReferences },
    ], canonicalResolutionMethod: "EVIDENCE_NOT_SENTINEL_VOTING" as const };
  });
  const operationalEvidence: SentinelOperationalEvidence[] = sentinels.map((sentinel) => {
    const brief = briefs.find((item) => item.sentinelId === sentinel.sentinelId);
    const investigating = brief && brief.attention !== "PAUSED" && brief.replayEvents.some((item) => item.eventType === "SENTINEL_INVESTIGATION_PERFORMED");
    return {
      sentinelId: sentinel.sentinelId,
      runtimeReference: sentinel.identity.runtimeReference,
      toolsUsed: investigating ? sentinel.identity.tools : [],
      investigationReferences: investigating && brief ? [deterministicUuid({ briefId: brief.briefId, type: "SENTINEL_INVESTIGATION" })] : [],
      evidenceAccessed: investigating && brief ? brief.evidenceReferences : [],
      counterfactualReferences: investigating && brief?.preActionContext.counterfactualReference ? [brief.preActionContext.counterfactualReference] : [],
      recommendationsEmitted: investigating && brief ? brief.recommendedPrevention : [],
      humanEscalations: investigating && brief && ["ESCALATED", "GATE"].includes(brief.attention === "ESCALATED" ? "ESCALATED" : brief.verificationDepth) ? [{ required: true, reason: "High-consequence or gated conditions require accountable human review.", emittedAt: input.generatedAt }] : [],
      chainOfThoughtStored: false,
      structuredResultMetadataOnly: true,
    };
  });
  const core = {
    operationsVersion: "1.0" as const,
    label: "SENTINEL_OPERATIONS" as const,
    enterpriseId: input.enterpriseId,
    generatedAt: input.generatedAt,
    weather,
    sentinels,
    attentionQueue: queue,
    trustBriefs: briefs,
    disagreements,
    graphProjection,
    replayEvents: briefs.flatMap((item) => item.replayEvents),
    trustMemoryEvents: briefs.flatMap((item) => item.trustMemoryEvents),
    operationalEvidence,
    canonicalSystemOperationalWhenPaused: true as const,
    source: "DERIVED_FROM_CANONICAL_TRUST_FABRIC" as const,
  };
  return deepFreeze({ ...core, operationsDigest: hashCanonical(core) }) as SentinelOperations;
}

export function transitionSentinelLifecycle(input: { enterpriseId: string; sentinel: SentinelAgent; requestedState: SentinelLifecycleState; actorRole: string; occurredAt: string }) {
  assertSafe(input);
  if (input.sentinel.tenantId !== input.enterpriseId) throw new Error("SENTINEL_LIFECYCLE_TENANT_SCOPE_MISMATCH");
  if (!Number.isFinite(Date.parse(input.occurredAt))) throw new TypeError("Sentinel lifecycle timestamp is invalid.");
  if (!["owner", "admin"].includes(input.actorRole.toLowerCase())) throw new Error("SENTINEL_LIFECYCLE_ADMIN_REQUIRED");
  const lifecycleState = input.requestedState;
  return deepFreeze({
    sentinelId: input.sentinel.sentinelId,
    enterpriseId: input.enterpriseId,
    previousState: input.sentinel.currentState,
    currentState: lifecycleState,
    operationalEntityLifecycleState: lifecycleState === "PAUSED" ? "suspended" as const : "active" as const,
    canonicalSystemAffected: false as const,
    destructiveKillPerformed: false as const,
    occurredAt: input.occurredAt,
    eventDigest: hashCanonical({ sentinelId: input.sentinel.sentinelId, previousState: input.sentinel.currentState, lifecycleState, occurredAt: input.occurredAt }),
  });
}

export function assertSentinelActionAllowed(input: { enterpriseId: string; sentinel: SentinelAgent; operation: SentinelAllowedOperation | SentinelProhibitedOperation; targetEnterpriseId: string }) {
  if (input.sentinel.tenantId !== input.enterpriseId || input.targetEnterpriseId !== input.enterpriseId) throw new Error("SENTINEL_CROSS_TENANT_ACCESS_DENIED");
  if (input.sentinel.currentState === "PAUSED") throw new Error("SENTINEL_PAUSED");
  if ((SENTINEL_PROHIBITED_OPERATIONS as readonly string[]).includes(input.operation)) {
    const code = input.operation === "MODIFY_AUTHORITY" || input.operation === "GRANT_AUTHORITY" ? "SENTINEL_AUTHORITY_ESCALATION_DENIED"
      : input.operation === "MODIFY_POLICY" ? "SENTINEL_POLICY_MODIFICATION_DENIED"
        : input.operation === "FABRICATE_EVIDENCE" ? "SENTINEL_EVIDENCE_FABRICATION_DENIED"
          : input.operation === "EXTERNAL_WRITE" ? "SENTINEL_EXTERNAL_WRITE_DENIED" : "SENTINEL_CANONICAL_ACTION_DENIED";
    throw new Error(code);
  }
  if (!input.sentinel.authorityScope.includes(input.operation as SentinelAllowedOperation)) throw new Error("SENTINEL_OPERATION_OUT_OF_SCOPE");
  return deepFreeze({ allowed: true as const, operation: input.operation as SentinelAllowedOperation, evidenceOnly: true as const, canonicalDecisionCreated: false as const, externalWritePerformed: false as const });
}
