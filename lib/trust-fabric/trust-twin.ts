import { deterministicUuid, hashCanonical } from "../../src/lib/trust-core/hash.ts";
import {
  evaluateTrustForecast,
  type DeploymentRecommendation,
  type ForecastSubjectType,
  type TrustConditionInput,
  type TrustForecast,
  type TrustForecastEvaluationInput,
  type TrustForecastGraphProjection,
  type TrustForecastState,
} from "./trust-forecast.ts";
import {
  evaluateAdaptiveVerification,
  type AdaptiveVerificationPolicy,
  type AdaptiveVerificationRequirement,
  type VerificationEvidenceInput,
} from "./adaptive-verification.ts";
import type { ModelStateIntegrityAssessment } from "./model-state-integrity.ts";
import type { AuthorityIntegrityAssessment } from "./authority-integrity.ts";

export const TRUST_PRESSURE_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL", "UNKNOWN"] as const;
export const TRUST_PRESSURE_TRENDS = ["RISING", "FALLING", "STABLE", "SPIKING", "UNKNOWN"] as const;
export const TRUST_BUDGET_STATUSES = ["HEALTHY", "CONSTRAINED", "NEAR_LIMIT", "EXCEEDED", "UNKNOWN"] as const;
export const COUNTERFACTUAL_CHANGE_TYPES = [
  "GRANT_WRITE_REPOSITORY",
  "ADD_MCP_TOOL",
  "REMOVE_MONITORING",
  "CHANGE_DESTINATION",
  "WEAKEN_DESTINATION_BINDING",
  "CHANGE_MODEL",
  "INCREASE_PRIVILEGE",
  "REMOVE_HUMAN_APPROVAL",
  "CHANGE_RUNTIME",
  "REVOKE_CREDENTIAL",
  "REDUCE_AUTHORITY",
  "PIN_DESTINATION",
  "RESTORE_MONITORING",
  "REFRESH_RUNTIME_ATTESTATION",
  "WIDEN_AUTHORITY",
  "MODEL_CONTROL_DESTINATION",
  "DELAY_RUNTIME_AUTHORITY_REFRESH",
  "DELAY_CREDENTIAL_ROTATION",
  "PIN_PARAMETER_TO_AUTHORITY",
] as const;
export const TRUST_TWIN_ENTITY_TYPES = ["HUMAN", "AI_AGENT", "SOFTWARE_AGENT", "WORKLOAD", "MACHINE", "ROBOT"] as const;

export type TrustPressureLevel = (typeof TRUST_PRESSURE_LEVELS)[number];
export type TrustPressureTrend = (typeof TRUST_PRESSURE_TRENDS)[number];
export type TrustBudgetStatus = (typeof TRUST_BUDGET_STATUSES)[number];
export type CounterfactualChangeType = (typeof COUNTERFACTUAL_CHANGE_TYPES)[number];
export type TrustTwinEntityType = (typeof TRUST_TWIN_ENTITY_TYPES)[number];
export type TrustTwinStateValue = "STRONG" | "STABLE" | "COMPLETE" | "WATCH" | "PARTIAL" | "ELEVATED" | "SEVERE" | "UNKNOWN";

export type TrustPressureContributor = {
  code: string;
  impact: number;
  direction: "PRESSURE" | "MITIGATING";
  explanation: string;
  evidenceReferences: string[];
  evidenceConfidence: number;
};

export type TrustPressure = {
  value: number;
  level: TrustPressureLevel;
  trend: TrustPressureTrend;
  primaryContributors: TrustPressureContributor[];
  mitigatingContributors: TrustPressureContributor[];
  history: Array<{ value: number; occurredAt: string; reason: string; evidenceReferences: string[] }>;
  precisionBoundary: "NORMALIZED_EXPLAINABLE_HEURISTIC";
};

export type TrustBudget = {
  total: number;
  consumed: number;
  remaining: number;
  status: TrustBudgetStatus;
  consumers: TrustPressureContributor[];
  contextualConstraints: TrustPressureContributor[];
  restorers: Array<{ code: TrustControlCode; expectedRestoration: number; explanation: string }>;
  context: {
    consequenceSeverity: string;
    dataSensitivity: string;
    privilegeLevel: string;
    financialExposure: string;
    reversibility: string;
    humanSafetyImpact: string;
    regulatorySensitivity: string;
    authorityScope: string;
    policyTolerance: string;
    monitoringConfidence: number;
  };
  precisionBoundary: "NORMALIZED_CONTEXTUAL_TOLERANCE_NOT_ACTUARIAL";
};

export type ConsequenceReachInput = {
  systems: string[];
  credentials: string[];
  tools: string[];
  dataClasses: string[];
  destinations: string[];
  downstreamAgents: string[];
  productionResources: string[];
  financialExposure: string[];
  humanImpactingSystems: string[];
};

export type ConsequenceReach = ConsequenceReachInput & {
  systemCount: number;
  dimensionCount: number;
  level: "LIMITED" | "BOUNDED" | "BROAD" | "EXTENSIVE" | "UNKNOWN";
  knownLimitations: string[];
};

export type TrustControlCode =
  | "STEP_UP_VERIFICATION"
  | "PIN_DESTINATION"
  | "REDUCE_AUTHORITY"
  | "RESTORE_MONITORING"
  | "REQUIRE_HUMAN_APPROVAL"
  | "ROTATE_CREDENTIAL"
  | "REQUALIFY_TOOL"
  | "REAUTHORIZE"
  | "HOLD_DEPLOYMENT";

export type TrustControlRecommendation = {
  code: TrustControlCode;
  rank: number;
  disruption: 1 | 2 | 3;
  specificity: number;
  expectedRestoration: number;
  evidenceConfidence: number;
  reason: string;
  addresses: string[];
};

export type RecommendedTrustPath = {
  currentPath: string;
  recommendedPath: string;
  reason: string;
  advisoryOnly: true;
};

export type TrustTwinMaterialEventType =
  | "TWIN_AUTHORITY_CHANGED"
  | "TWIN_MONITORING_DEGRADED"
  | "TWIN_IDENTITY_CHANGED"
  | "TWIN_RUNTIME_CHANGED"
  | "TWIN_DESTINATION_CHANGED"
  | "TWIN_PRESSURE_SPIKE"
  | "TWIN_BUDGET_NEAR_LIMIT"
  | "TWIN_BUDGET_EXCEEDED"
  | "TWIN_FORECAST_DETERIORATED"
  | "TWIN_FORECAST_IMPROVED";

export type TrustTwin = {
  twinVersion: "1.0";
  twinId: string;
  label: "DERIVED_TRUST_TWIN";
  enterpriseId: string;
  entityId: string;
  entityType: TrustTwinEntityType;
  policyReference: string;
  identityState: TrustTwinStateValue;
  owner: string;
  purpose: string;
  authorityState: TrustTwinStateValue;
  intentState: TrustTwinStateValue;
  toolState: TrustTwinStateValue;
  runtimeState: TrustTwinStateValue;
  monitoringState: TrustTwinStateValue;
  destinationState: TrustTwinStateValue;
  dataExposure: TrustTwinStateValue;
  humanOversight: TrustTwinStateValue;
  providerConfidence: number;
  evidenceFreshness: "CURRENT" | "AGING" | "STALE" | "EXPIRED" | "UNAVAILABLE";
  authorizationPropagation: TrustTwinStateValue;
  declaredAuthority: string[];
  runtimeEffectiveAuthority: string[];
  destinationEffectiveAuthority: string[] | null;
  authorityPropagationState: AuthorityIntegrityAssessment["authorizationPropagation"]["state"] | "NOT_OBSERVED";
  parameterAuthorityBindings: AuthorityIntegrityAssessment["parameterAuthority"];
  parameterProvenance: Array<{ parameterName: string; provenance: string | null; state: string }>;
  authorityEvidenceFreshness: "CURRENT" | "STALE" | "UNAVAILABLE";
  staleAuthorityRisk: boolean;
  authorityConflicts: string[];
  authorityIntegrity: AuthorityIntegrityAssessment | null;
  approvedModelState: ModelStateIntegrityAssessment["approvedModelState"] | null;
  observedModelState: ModelStateIntegrityAssessment["observedModelState"] | null;
  modelIntegrityState: ModelStateIntegrityAssessment["modelIntegrityState"] | "NOT_OBSERVED";
  templateIntegrity: ModelStateIntegrityAssessment["templateIntegrity"] | null;
  artifactIntegrity: ModelStateIntegrityAssessment["artifactIntegrity"] | null;
  runtimeIntegrity: ModelStateIntegrityAssessment["runtimeIntegrity"] | null;
  endpointIntegrity: ModelStateIntegrityAssessment["endpointIntegrity"] | null;
  stateChangeProvenance: ModelStateIntegrityAssessment["stateChangeProvenance"] | null;
  lastModelStateMeasurement: string | null;
  modelStateEvidenceFreshness: ModelStateIntegrityAssessment["modelStateEvidenceFreshness"] | "UNAVAILABLE";
  modelStateIntegrity: ModelStateIntegrityAssessment | null;
  adaptiveVerification: AdaptiveVerificationRequirement;
  trustForecast: TrustForecast;
  forecastTrend: TrustForecast["trend"];
  trustPressure: TrustPressure;
  trustBudget: TrustBudget;
  consequenceReach: ConsequenceReach;
  lastMaterialChange: string | null;
  recommendedControl: TrustControlRecommendation | null;
  recommendedControls: TrustControlRecommendation[];
  recommendedTrustPath: RecommendedTrustPath[];
  knownLimitations: string[];
  evidenceReferences: string[];
  materialEvents: Array<{ eventId: string; eventType: TrustTwinMaterialEventType; occurredAt: string; evidenceReferences: string[] }>;
  graphProjection: TrustForecastGraphProjection;
  replayEvents: Array<{ eventType: string; occurredAt: string; evidenceReferences: string[]; details: Record<string, unknown> }>;
  trustMemoryEvents: Array<{ eventId: string; eventType: string; occurredAt: string; evidenceReferences: string[] }>;
  mlReadiness: {
    eligibleEpisode: {
      twinStateBefore: string | null;
      pressure: number;
      budget: number;
      forecast: TrustForecastState;
      proposedChange: string[];
      counterfactualProjection: null;
      controlRecommended: TrustControlCode | null;
      controlApplied: null;
      canonicalDecision: null;
      executionOutcome: null;
      destinationOutcome: null;
      laterResult: null;
    };
    modelUsed: false;
    trainingPerformed: false;
  };
  canonicalDecisionBoundary: {
    decisionAuthority: "CANONICAL_TRUST_FABRIC_ONLY";
    pressureCanDeny: false;
    budgetCanDeny: false;
    twinCanExecute: false;
    verificationCanGrantAuthority: false;
  };
  source: "CANONICAL_EVIDENCE_PROJECTION";
  updatedAt: string;
  twinDigest: string;
};

export type TrustTwinEvaluationInput = {
  enterpriseId: string;
  entity: { id: string; type: ForecastSubjectType };
  owner: string;
  purpose: string;
  evaluatedAt: string;
  forecastInput: TrustForecastEvaluationInput;
  consequenceReach: ConsequenceReachInput;
  budgetContext?: Partial<TrustBudget["context"]>;
  previousTwin?: TrustTwin | null;
  proposedChanges?: string[];
  actionContext?: { type: string; purpose: string; environment: string };
  authorityContext?: { reference: string; scopeValid: boolean };
  verificationEvidence?: VerificationEvidenceInput[];
  verificationPolicy?: Partial<AdaptiveVerificationPolicy> | null;
  modelStateIntegrity?: ModelStateIntegrityAssessment | null;
  authorityIntegrity?: AuthorityIntegrityAssessment | null;
};

export type CounterfactualChange = {
  changeType: CounterfactualChangeType;
  target?: string;
  explanation?: string;
};

export type CounterfactualTrustSimulation = {
  simulationVersion: "1.0";
  simulationId: string;
  type: "COUNTERFACTUAL_TRUST_SIMULATION";
  simulated: true;
  isolated: true;
  executionPerformed: false;
  persistedAsCanonicalExecution: false;
  enterpriseId: string;
  entityId: string;
  evaluatedAt: string;
  sourceTwinId: string;
  sourceTwinDigest: string;
  proposedChanges: CounterfactualChange[];
  currentTwin: TrustTwin;
  projectedTwin: TrustTwin;
  delta: {
    forecast: { from: TrustForecastState; to: TrustForecastState };
    pressure: { from: number; to: number; change: number };
    budgetRemaining: { from: number; to: number; change: number };
    projectedBlastRadius: { from: number; to: number; change: number };
  };
  primaryContributors: TrustPressureContributor[];
  newEvidenceGaps: string[];
  recommendedControls: TrustControlRecommendation[];
  deploymentRecommendation: DeploymentRecommendation;
  recommendedTrustPath: RecommendedTrustPath[];
  graphProjection: TrustForecastGraphProjection;
  replayEvents: Array<{ eventType: "COUNTERFACTUAL_TRUST_SIMULATION"; occurredAt: string; simulated: true; persistedAsCanonicalExecution: false; evidenceReferences: string[]; details: Record<string, unknown> }>;
  mlReadiness: {
    episode: {
      twinStateBefore: string;
      pressure: number;
      budget: number;
      forecast: TrustForecastState;
      proposedChange: CounterfactualChangeType[];
      counterfactualProjection: string;
      controlRecommended: TrustControlCode | null;
      controlApplied: null;
      canonicalDecision: null;
      executionOutcome: null;
      destinationOutcome: null;
      laterResult: null;
    };
    modelUsed: false;
    trainingPerformed: false;
  };
  knownLimitations: string[];
  simulationDigest: string;
};

export type CounterfactualOutcomeFeedback = {
  feedbackVersion: "1.0";
  feedbackId: string;
  simulationId: string;
  enterpriseId: string;
  controlApplied: TrustControlCode | null;
  canonicalDecision: "ALLOW" | "REVIEW" | "DENY";
  executionOutcome: "EXECUTED" | "NOT_EXECUTED" | "UNKNOWN";
  destinationOutcome: string;
  laterResult: string;
  occurredAt: string;
  replayEvents: Array<{ eventType: string; occurredAt: string; simulated: false; evidenceReferences: string[]; details: Record<string, unknown> }>;
  trustMemoryEvents: Array<{ eventId: string; eventType: "COUNTERFACTUAL_PREVENTED_UNSAFE_RELEASE" | "CONTROL_RESTORED_TRUST"; occurredAt: string; evidenceReferences: string[] }>;
  mlEpisode: {
    twinStateBefore: string;
    pressure: number;
    budget: number;
    forecast: TrustForecastState;
    proposedChange: CounterfactualChangeType[];
    counterfactualProjection: string;
    controlRecommended: TrustControlCode | null;
    controlApplied: TrustControlCode | null;
    canonicalDecision: "ALLOW" | "REVIEW" | "DENY";
    executionOutcome: "EXECUTED" | "NOT_EXECUTED" | "UNKNOWN";
    destinationOutcome: string;
    laterResult: string;
  };
  automaticTrainingStarted: false;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const referencePattern = /^[A-Za-z0-9_.:@/+\-]{1,300}$/;
const forbiddenSecretKey = /(?:^|_)(?:secret|password|private_key|access_token|refresh_token|credential_value|api_key)(?:$|_)/i;
const secretLikeValue = /(?:bearer\s+[A-Za-z0-9._~+/=-]{16,}|-----BEGIN [A-Z ]+PRIVATE KEY-----)/i;

function assertSafe(value: unknown, path = "input") {
  if (typeof value === "string" && secretLikeValue.test(value)) throw new TypeError(`${path} appears to contain a raw secret.`);
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenSecretKey.test(key)) throw new TypeError(`${path}.${key} is not permitted; use a reference or digest.`);
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

function unique(values: readonly string[]) { return [...new Set(values.filter(Boolean))].sort(); }
function clamp(value: number, minimum = 0, maximum = 100) { return Math.max(minimum, Math.min(maximum, Math.round(value))); }
function dimension(conditions: readonly TrustConditionInput[], name: TrustConditionInput["dimension"]): TrustConditionInput | undefined { return conditions.find((item) => item.dimension === name); }
function state(conditions: readonly TrustConditionInput[], name: TrustConditionInput["dimension"]): TrustTwinStateValue { return dimension(conditions, name)?.status ?? "UNKNOWN"; }

type PressureRule = { dimension: TrustConditionInput["dimension"]; statuses: TrustTwinStateValue[]; code: string; impact: number; explanation: string };

const pressureRules: PressureRule[] = [
  { dimension: "CONSEQUENCE_EXPOSURE", statuses: ["WATCH"], code: "CONSEQUENCE_EXPOSURE", impact: 14, explanation: "Consequential exposure reduces tolerance for unresolved uncertainty." },
  { dimension: "CONSEQUENCE_EXPOSURE", statuses: ["ELEVATED", "SEVERE"], code: "CONSEQUENCE_EXPOSURE_INCREASE", impact: 28, explanation: "Consequence exposure is materially elevated." },
  { dimension: "AUTHORITY_STABILITY", statuses: ["ELEVATED", "SEVERE"], code: "AUTHORITY_EXPANSION", impact: 24, explanation: "Authority is expanding beyond the approved stable state." },
  { dimension: "PRIVILEGE_CHANGE_RISK", statuses: ["ELEVATED", "SEVERE"], code: "AUTHORITY_EXPANSION", impact: 24, explanation: "Privilege increased beyond the approved baseline." },
  { dimension: "TOOL_EXPOSURE", statuses: ["ELEVATED", "SEVERE"], code: "NEW_OR_CHANGED_TOOL", impact: 16, explanation: "A new or materially changed tool adds unqualified capability." },
  { dimension: "DESTINATION_EXPOSURE", statuses: ["ELEVATED", "SEVERE"], code: "DESTINATION_CHANGE", impact: 20, explanation: "Destination binding is changed or unverified." },
  { dimension: "MONITORING_COVERAGE", statuses: ["WATCH", "PARTIAL"], code: "MONITORING_GAP", impact: 7, explanation: "Monitoring is incomplete for the proposed action." },
  { dimension: "MONITORING_COVERAGE", statuses: ["ELEVATED", "SEVERE"], code: "MONITORING_LOSS", impact: 15, explanation: "Required monitoring is absent or materially degraded." },
  { dimension: "IDENTITY_STABILITY", statuses: ["ELEVATED", "SEVERE"], code: "IDENTITY_DISCONTINUITY", impact: 18, explanation: "Identity continuity is not established." },
  { dimension: "RUNTIME_ASSURANCE", statuses: ["ELEVATED", "SEVERE"], code: "RUNTIME_CHANGE", impact: 15, explanation: "Runtime assurance changed or is unverified." },
  { dimension: "INTENT_ALIGNMENT", statuses: ["ELEVATED", "SEVERE"], code: "SIGNED_INTENT_MISMATCH", impact: 15, explanation: "Signed human intent no longer covers the proposed action." },
  { dimension: "POLICY_CHANGE_RISK", statuses: ["ELEVATED", "SEVERE"], code: "POLICY_DRIFT", impact: 12, explanation: "Policy evidence has drifted from the qualified baseline." },
  { dimension: "PROVIDER_CONFIDENCE", statuses: ["ELEVATED", "SEVERE"], code: "PROVIDER_CONFLICT", impact: 12, explanation: "Provider evidence is conflicting or insufficiently independent." },
  { dimension: "EVIDENCE_FRESHNESS", statuses: ["ELEVATED", "SEVERE"], code: "STALE_EVIDENCE", impact: 10, explanation: "Stale evidence consumes contextual trust tolerance." },
  { dimension: "AUTHORIZATION_PROPAGATION", statuses: ["ELEVATED", "SEVERE"], code: "AUTHORIZATION_PROPAGATION_FAILURE", impact: 25, explanation: "Authority changes have not propagated to all enforcement points." },
  { dimension: "STALE_AUTHORITY_RISK", statuses: ["ELEVATED", "SEVERE"], code: "STALE_AUTHORITY_ACTIVE", impact: 28, explanation: "Old authority may remain active downstream." },
  { dimension: "CHANGE_VELOCITY", statuses: ["WATCH", "PARTIAL", "ELEVATED", "SEVERE"], code: "MATERIAL_CHANGE_VELOCITY", impact: 8, explanation: "Recent material change leaves residual qualification uncertainty." },
];

function pressureLevel(value: number, hasEvidence: boolean): TrustPressureLevel {
  if (!hasEvidence) return "UNKNOWN";
  if (value >= 75) return "CRITICAL";
  if (value >= 50) return "HIGH";
  if (value >= 20) return "MODERATE";
  return "LOW";
}

function pressureTrend(value: number, previous?: number | null): TrustPressureTrend {
  if (previous === null || previous === undefined) return "UNKNOWN";
  const delta = value - previous;
  if (delta >= 25) return "SPIKING";
  if (delta >= 5) return "RISING";
  if (delta <= -5) return "FALLING";
  return "STABLE";
}

function derivePressure(conditions: readonly TrustConditionInput[], evaluatedAt: string, previous?: TrustTwin | null): TrustPressure {
  const byCode = new Map<string, TrustPressureContributor>();
  for (const rule of pressureRules) {
    const condition = dimension(conditions, rule.dimension);
    if (!condition || !rule.statuses.includes(condition.status)) continue;
    const contributor: TrustPressureContributor = {
      code: rule.code,
      impact: rule.impact,
      direction: "PRESSURE",
      explanation: condition.summary || rule.explanation,
      evidenceReferences: unique(condition.evidenceReferences),
      evidenceConfidence: condition.confidence,
    };
    const existing = byCode.get(rule.code);
    if (!existing || contributor.impact > existing.impact) byCode.set(rule.code, contributor);
  }
  const primaryContributors = [...byCode.values()].sort((a, b) => b.impact - a.impact || a.code.localeCompare(b.code));
  const mitigatingContributors = conditions
    .filter((item) => ["STRONG", "COMPLETE"].includes(item.status) && item.confidence >= 0.6)
    .slice(0, 6)
    .map((item) => ({ code: `${item.dimension}_STABLE`, impact: 0, direction: "MITIGATING" as const, explanation: item.summary, evidenceReferences: unique(item.evidenceReferences), evidenceConfidence: item.confidence }));
  const value = clamp(primaryContributors.reduce((sum, item) => sum + item.impact, 0));
  const previousValue = previous?.trustPressure.value;
  const reason = primaryContributors.length ? primaryContributors.map((item) => item.code).join(" + ") : "NO_MATERIAL_PRESSURE_CONTRIBUTOR";
  const history = [
    ...(previous?.trustPressure.history ?? []),
    ...(!previous || previousValue !== value ? [{ value, occurredAt: evaluatedAt, reason, evidenceReferences: unique(primaryContributors.flatMap((item) => item.evidenceReferences)) }] : []),
  ];
  return {
    value,
    level: pressureLevel(value, conditions.some((item) => item.evidenceReferences.length > 0)),
    trend: pressureTrend(value, previousValue),
    primaryContributors,
    mitigatingContributors,
    history,
    precisionBoundary: "NORMALIZED_EXPLAINABLE_HEURISTIC",
  };
}

const controlByPressure: Record<string, { code: TrustControlCode; disruption: 1 | 2 | 3; specificity: number; restoration: number; reason: string }> = {
  AUTHORITY_EXPANSION: { code: "REDUCE_AUTHORITY", disruption: 2, specificity: 1, restoration: 24, reason: "Return authority to the smallest already-qualified scope." },
  NEW_OR_CHANGED_TOOL: { code: "REQUALIFY_TOOL", disruption: 1, specificity: 1, restoration: 16, reason: "Requalify the changed tool and its security-critical parameters." },
  DESTINATION_CHANGE: { code: "PIN_DESTINATION", disruption: 1, specificity: 1, restoration: 20, reason: "Bind the destination outside model control." },
  MONITORING_GAP: { code: "RESTORE_MONITORING", disruption: 1, specificity: 1, restoration: 7, reason: "Verify full monitoring coverage for the action path." },
  MONITORING_LOSS: { code: "RESTORE_MONITORING", disruption: 1, specificity: 1, restoration: 15, reason: "Restore required monitoring before action." },
  IDENTITY_DISCONTINUITY: { code: "STEP_UP_VERIFICATION", disruption: 1, specificity: 1, restoration: 18, reason: "Re-establish identity continuity with fresh evidence." },
  RUNTIME_CHANGE: { code: "HOLD_DEPLOYMENT", disruption: 2, specificity: 0.7, restoration: 15, reason: "Hold release until runtime attestation is current." },
  SIGNED_INTENT_MISMATCH: { code: "REQUIRE_HUMAN_APPROVAL", disruption: 1, specificity: 1, restoration: 15, reason: "Obtain fresh signed approval for the changed action." },
  POLICY_DRIFT: { code: "REAUTHORIZE", disruption: 2, specificity: 0.8, restoration: 12, reason: "Refresh policy evidence and reauthorize the changed scope." },
  PROVIDER_CONFLICT: { code: "STEP_UP_VERIFICATION", disruption: 1, specificity: 0.8, restoration: 12, reason: "Resolve provider conflict with independent verification." },
  STALE_EVIDENCE: { code: "STEP_UP_VERIFICATION", disruption: 1, specificity: 0.9, restoration: 10, reason: "Refresh stale decision-time evidence." },
  AUTHORIZATION_PROPAGATION_FAILURE: { code: "REAUTHORIZE", disruption: 2, specificity: 0.9, restoration: 25, reason: "Reauthorize only after downstream propagation is independently confirmed." },
  STALE_AUTHORITY_ACTIVE: { code: "ROTATE_CREDENTIAL", disruption: 2, specificity: 1, restoration: 28, reason: "Rotate the stale credential and confirm downstream rejection." },
  CONSEQUENCE_EXPOSURE_INCREASE: { code: "REQUIRE_HUMAN_APPROVAL", disruption: 1, specificity: 0.7, restoration: 12, reason: "Add human approval for materially increased consequence exposure." },
  MATERIAL_CHANGE_VELOCITY: { code: "HOLD_DEPLOYMENT", disruption: 2, specificity: 0.6, restoration: 8, reason: "Hold long enough to requalify the changed material state." },
};

const controlByBudgetConstraint: Record<string, { code: TrustControlCode; disruption: 1 | 2 | 3; specificity: number; restoration: number; reason: string }> = {
  BUDGET_CONSEQUENCE_SEVERITY: { code: "REQUIRE_HUMAN_APPROVAL", disruption: 1, specificity: 0.8, restoration: 20, reason: "Require accountable human approval for the high-consequence action context." },
  BUDGET_DATA_SENSITIVITY: { code: "REDUCE_AUTHORITY", disruption: 2, specificity: 0.8, restoration: 15, reason: "Reduce authority to the smallest scope needed for the sensitive data context." },
  BUDGET_PRIVILEGE_LEVEL: { code: "REDUCE_AUTHORITY", disruption: 2, specificity: 1, restoration: 15, reason: "Reduce elevated privilege to the already-qualified authority scope." },
  BUDGET_FINANCIAL_EXPOSURE: { code: "REQUIRE_HUMAN_APPROVAL", disruption: 1, specificity: 0.9, restoration: 25, reason: "Require accountable approval and a bounded transaction limit for material financial exposure." },
  BUDGET_LOW_REVERSIBILITY: { code: "HOLD_DEPLOYMENT", disruption: 2, specificity: 0.8, restoration: 15, reason: "Hold the irreversible action until its evidence and recovery path are requalified." },
  BUDGET_HUMAN_SAFETY: { code: "REQUIRE_HUMAN_APPROVAL", disruption: 1, specificity: 1, restoration: 25, reason: "Require accountable human approval for a human-impacting action path." },
  BUDGET_REGULATORY_SENSITIVITY: { code: "REAUTHORIZE", disruption: 2, specificity: 0.8, restoration: 10, reason: "Reauthorize the action against the applicable regulatory policy evidence." },
  BUDGET_AUTHORITY_SCOPE: { code: "REDUCE_AUTHORITY", disruption: 2, specificity: 1, restoration: 15, reason: "Narrow broad or out-of-scope authority before execution." },
  BUDGET_MONITORING_CONFIDENCE: { code: "RESTORE_MONITORING", disruption: 1, specificity: 1, restoration: 10, reason: "Restore verified monitoring coverage for this action context." },
  BUDGET_POLICY_TOLERANCE: { code: "REAUTHORIZE", disruption: 2, specificity: 0.9, restoration: 15, reason: "Reauthorize under the strict policy tolerance applicable to this action." },
};

function recommendControls(pressure: TrustPressure, contextualConstraints: TrustPressureContributor[] = []): TrustControlRecommendation[] {
  const controls = new Map<TrustControlCode, TrustControlRecommendation>();
  for (const contributor of [...pressure.primaryContributors, ...contextualConstraints]) {
    const mapping = controlByPressure[contributor.code] ?? controlByBudgetConstraint[contributor.code];
    if (!mapping) continue;
    const candidate: TrustControlRecommendation = {
      code: mapping.code,
      rank: 0,
      disruption: mapping.disruption,
      specificity: mapping.specificity,
      expectedRestoration: Math.min(contributor.impact, mapping.restoration),
      evidenceConfidence: contributor.evidenceConfidence,
      reason: mapping.reason,
      addresses: [contributor.code],
    };
    const existing = controls.get(candidate.code);
    if (existing) {
      existing.expectedRestoration = Math.max(existing.expectedRestoration, candidate.expectedRestoration);
      existing.evidenceConfidence = Math.max(existing.evidenceConfidence, candidate.evidenceConfidence);
      existing.addresses = unique([...existing.addresses, ...candidate.addresses]);
    } else controls.set(candidate.code, candidate);
  }
  return [...controls.values()]
    .sort((a, b) => a.disruption - b.disruption || b.specificity - a.specificity || b.expectedRestoration - a.expectedRestoration || b.evidenceConfidence - a.evidenceConfidence || a.code.localeCompare(b.code))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function deriveBudget(pressure: TrustPressure, input: TrustTwinEvaluationInput): Omit<TrustBudget, "restorers"> {
  const consequence = dimension(input.forecastInput.conditions, "CONSEQUENCE_EXPOSURE")?.status ?? "UNKNOWN";
  const monitoring = dimension(input.forecastInput.conditions, "MONITORING_COVERAGE");
  const context: TrustBudget["context"] = {
    consequenceSeverity: input.budgetContext?.consequenceSeverity ?? consequence,
    dataSensitivity: input.budgetContext?.dataSensitivity ?? state(input.forecastInput.conditions, "DATA_EXPOSURE"),
    privilegeLevel: input.budgetContext?.privilegeLevel ?? state(input.forecastInput.conditions, "AUTHORITY_EXPOSURE"),
    financialExposure: input.budgetContext?.financialExposure ?? (input.consequenceReach.financialExposure.length ? "MATERIAL" : "NONE_OBSERVED"),
    reversibility: input.budgetContext?.reversibility ?? (input.purpose.includes("read") ? "HIGH" : "UNKNOWN"),
    humanSafetyImpact: input.budgetContext?.humanSafetyImpact ?? (input.entity.type === "ROBOT" ? "POTENTIAL" : "NONE_OBSERVED"),
    regulatorySensitivity: input.budgetContext?.regulatorySensitivity ?? "UNKNOWN",
    authorityScope: input.budgetContext?.authorityScope ?? state(input.forecastInput.conditions, "AUTHORITY_STABILITY"),
    policyTolerance: input.budgetContext?.policyTolerance ?? "STANDARD",
    monitoringConfidence: input.budgetContext?.monitoringConfidence ?? monitoring?.confidence ?? 0,
  };
  const evidenceReferences = unique(input.forecastInput.conditions.flatMap((item) => item.evidenceReferences));
  const constraints: Array<{ code: string; impact: number; applies: boolean; explanation: string }> = [
    { code: "BUDGET_CONSEQUENCE_SEVERITY", impact: /CRITICAL|SEVERE/.test(context.consequenceSeverity.toUpperCase()) ? 35 : /HIGH/.test(context.consequenceSeverity.toUpperCase()) ? 20 : 0, applies: /CRITICAL|SEVERE|HIGH/.test(context.consequenceSeverity.toUpperCase()), explanation: "High consequence severity narrows contextual tolerance." },
    { code: "BUDGET_DATA_SENSITIVITY", impact: 15, applies: /RESTRICTED|SECRET|REGULATED|PAYMENT|HEALTH|PERSONAL/.test(context.dataSensitivity.toUpperCase()), explanation: "Sensitive data narrows acceptable uncertainty." },
    { code: "BUDGET_PRIVILEGE_LEVEL", impact: 15, applies: /WRITE|ADMIN|ROOT|ELEVATED|OUTSIDE/.test(context.privilegeLevel.toUpperCase()), explanation: "Elevated privilege requires a smaller uncertainty tolerance." },
    { code: "BUDGET_FINANCIAL_EXPOSURE", impact: /VERY_HIGH|CRITICAL|10M|MILLION/.test(context.financialExposure.toUpperCase()) ? 30 : 20, applies: !/NONE|NOT_OBSERVED|UNKNOWN/.test(context.financialExposure.toUpperCase()), explanation: "Material financial exposure requires a substantially smaller tolerance." },
    { code: "BUDGET_LOW_REVERSIBILITY", impact: 15, applies: /LOW|IRREVERSIBLE|NONE/.test(context.reversibility.toUpperCase()), explanation: "Low reversibility reduces the uncertainty the action can safely tolerate." },
    { code: "BUDGET_HUMAN_SAFETY", impact: 25, applies: /POTENTIAL|HIGH|CRITICAL|HUMAN/.test(context.humanSafetyImpact.toUpperCase()), explanation: "Potential human impact requires strict contextual tolerance." },
    { code: "BUDGET_REGULATORY_SENSITIVITY", impact: 10, applies: /SENSITIVE|HIGH|REGULATED|STRICT/.test(context.regulatorySensitivity.toUpperCase()), explanation: "Regulatory sensitivity narrows acceptable uncertainty." },
    { code: "BUDGET_AUTHORITY_SCOPE", impact: 15, applies: /BROAD|UNBOUNDED|OUTSIDE|EXPANDED/.test(context.authorityScope.toUpperCase()), explanation: "Broad or out-of-scope authority reduces contextual tolerance." },
    { code: "BUDGET_MONITORING_CONFIDENCE", impact: 10, applies: context.monitoringConfidence < 0.5, explanation: "Low monitoring confidence narrows acceptable uncertainty." },
    { code: "BUDGET_POLICY_TOLERANCE", impact: 15, applies: /STRICT|ZERO|MINIMAL/.test(context.policyTolerance.toUpperCase()), explanation: "Strict policy tolerance leaves less capacity for unresolved uncertainty." },
  ];
  const contextualConstraints: TrustPressureContributor[] = constraints
    .filter((item) => item.applies && item.impact > 0)
    .map((item) => ({ code: item.code, impact: item.impact, direction: "PRESSURE" as const, explanation: item.explanation, evidenceReferences, evidenceConfidence: pressure.primaryContributors[0]?.evidenceConfidence ?? monitoring?.confidence ?? 0 }));
  const total = clamp(100 - contextualConstraints.reduce((sum, item) => sum + item.impact, 0), 10, 100);
  const consumed = pressure.level === "UNKNOWN" ? total : clamp(pressure.value);
  const remaining = clamp(total - consumed, 0, total);
  const remainingRatio = total ? remaining / total : 0;
  const status: TrustBudgetStatus = pressure.level === "UNKNOWN" ? "UNKNOWN" : consumed >= total ? "EXCEEDED" : remainingRatio <= 0.25 ? "NEAR_LIMIT" : remainingRatio <= 0.55 ? "CONSTRAINED" : "HEALTHY";
  return {
    total,
    consumed,
    remaining,
    status,
    consumers: pressure.primaryContributors,
    contextualConstraints,
    context,
    precisionBoundary: "NORMALIZED_CONTEXTUAL_TOLERANCE_NOT_ACTUARIAL",
  };
}

function deriveReach(input: ConsequenceReachInput): ConsequenceReach {
  const normalized: ConsequenceReachInput = {
    systems: unique(input.systems), credentials: unique(input.credentials), tools: unique(input.tools), dataClasses: unique(input.dataClasses),
    destinations: unique(input.destinations), downstreamAgents: unique(input.downstreamAgents), productionResources: unique(input.productionResources),
    financialExposure: unique(input.financialExposure), humanImpactingSystems: unique(input.humanImpactingSystems),
  };
  const dimensionCount = Object.values(normalized).filter((items) => items.length > 0).length;
  const systemCount = normalized.systems.length;
  const level = systemCount === 0 ? "UNKNOWN" : systemCount <= 3 ? "LIMITED" : systemCount <= 10 ? "BOUNDED" : systemCount <= 25 ? "BROAD" : "EXTENSIVE";
  return { ...normalized, systemCount, dimensionCount, level, knownLimitations: ["Reach is derived from known Evidence Graph and Effective Access relationships; it is not an exact damage prediction."] };
}

function recommendedPaths(input: TrustTwinEvaluationInput, pressure: TrustPressure): RecommendedTrustPath[] {
  const paths: RecommendedTrustPath[] = [];
  const signals = new Set(input.forecastInput.conditions.flatMap((item) => item.signals ?? []));
  if (signals.has("PRIVILEGE_INCREASED") || pressure.primaryContributors.some((item) => item.code === "AUTHORITY_EXPANSION")) paths.push({ currentPath: "write authority", recommendedPath: "read-only authority", reason: "Use the already-qualified least-privilege path.", advisoryOnly: true });
  if (pressure.primaryContributors.some((item) => item.code === "DESTINATION_CHANGE")) paths.push({ currentPath: "unverified destination", recommendedPath: "pinned verified destination", reason: "Keep destination selection outside model control.", advisoryOnly: true });
  if (pressure.value >= 50) paths.push({ currentPath: "direct production", recommendedPath: "sandbox with human approval", reason: "Reduce consequential reach while trust conditions are elevated.", advisoryOnly: true });
  return paths;
}

function twinEvents(input: TrustTwinEvaluationInput, pressure: TrustPressure, budget: TrustBudget, forecast: TrustForecast, evidenceReferences: string[]) {
  const previous = input.previousTwin;
  const events: TrustTwinMaterialEventType[] = [];
  const changed = new Set(forecast.materialChanges);
  if (changed.has("AUTHORITY_CHANGED") || state(input.forecastInput.conditions, "AUTHORITY_STABILITY") !== previous?.authorityState && previous) events.push("TWIN_AUTHORITY_CHANGED");
  if (previous && ["ELEVATED", "SEVERE"].includes(state(input.forecastInput.conditions, "MONITORING_COVERAGE")) && previous.monitoringState !== state(input.forecastInput.conditions, "MONITORING_COVERAGE")) events.push("TWIN_MONITORING_DEGRADED");
  if (previous && previous.identityState !== state(input.forecastInput.conditions, "IDENTITY_STABILITY")) events.push("TWIN_IDENTITY_CHANGED");
  if (previous && previous.runtimeState !== state(input.forecastInput.conditions, "RUNTIME_ASSURANCE")) events.push("TWIN_RUNTIME_CHANGED");
  if (previous && previous.destinationState !== state(input.forecastInput.conditions, "DESTINATION_EXPOSURE")) events.push("TWIN_DESTINATION_CHANGED");
  if (pressure.trend === "SPIKING") events.push("TWIN_PRESSURE_SPIKE");
  if (budget.status === "NEAR_LIMIT") events.push("TWIN_BUDGET_NEAR_LIMIT");
  if (budget.status === "EXCEEDED") events.push("TWIN_BUDGET_EXCEEDED");
  if (forecast.conditionDirection === "TRUST_CONDITIONS_DETERIORATED") events.push("TWIN_FORECAST_DETERIORATED");
  if (forecast.conditionDirection === "TRUST_CONDITIONS_IMPROVED") events.push("TWIN_FORECAST_IMPROVED");
  return unique(events).map((eventType) => ({ eventId: hashCanonical([input.entity.id, eventType, input.evaluatedAt]), eventType: eventType as TrustTwinMaterialEventType, occurredAt: input.evaluatedAt, evidenceReferences }));
}

function twinGraph(input: TrustTwinEvaluationInput, twinId: string, forecast: TrustForecast, pressure: TrustPressure, budget: TrustBudget, controls: TrustControlRecommendation[], adaptiveVerification: AdaptiveVerificationRequirement): TrustForecastGraphProjection {
  const nodes: TrustForecastGraphProjection["nodes"] = [
    { nodeType: "ENTITY", externalId: input.entity.id, domainKey: "IDENTITY", label: input.entity.type, metadata: {} },
    { nodeType: "TRUST_TWIN", externalId: twinId, domainKey: "GOVERNANCE", label: "Derived Trust Twin", metadata: { source: "CANONICAL_EVIDENCE_PROJECTION" } },
    { nodeType: "PRESSURE", externalId: `${twinId}:pressure`, domainKey: "GOVERNANCE", label: pressure.level, metadata: { value: pressure.value, trend: pressure.trend } },
    { nodeType: "BUDGET", externalId: `${twinId}:budget`, domainKey: "GOVERNANCE", label: budget.status, metadata: { total: budget.total, consumed: budget.consumed, remaining: budget.remaining } },
    ...forecast.graphProjection.nodes,
    ...adaptiveVerification.graphProjection.nodes,
  ];
  const edges: TrustForecastGraphProjection["edges"] = [
    { fromNodeType: "ENTITY", fromExternalId: input.entity.id, toNodeType: "TRUST_TWIN", toExternalId: twinId, edgeType: "DERIVED_FROM" },
    { fromNodeType: "TRUST_TWIN", fromExternalId: twinId, toNodeType: "PRESSURE", toExternalId: `${twinId}:pressure`, edgeType: "ASSERTS" },
    { fromNodeType: "TRUST_TWIN", fromExternalId: twinId, toNodeType: "BUDGET", toExternalId: `${twinId}:budget`, edgeType: "ASSERTS" },
    { fromNodeType: "PRESSURE", fromExternalId: `${twinId}:pressure`, toNodeType: "FORECAST", toExternalId: forecast.forecastId, edgeType: "APPLIES_TO" },
    { fromNodeType: "BUDGET", fromExternalId: `${twinId}:budget`, toNodeType: "FORECAST", toExternalId: forecast.forecastId, edgeType: "APPLIES_TO" },
    ...forecast.graphProjection.edges,
    ...adaptiveVerification.graphProjection.edges,
  ];
  for (const condition of forecast.conditions) edges.push({ fromNodeType: "TRUST_TWIN", fromExternalId: twinId, toNodeType: "TRUST_CONDITION", toExternalId: `${forecast.forecastId}:condition:${condition.dimension}`, edgeType: "ASSERTS" });
  for (const control of controls) {
    const id = `${twinId}:minimum-control:${control.code}`;
    nodes.push({ nodeType: "RECOMMENDATION", externalId: id, domainKey: "GOVERNANCE", label: control.code, metadata: { rank: control.rank, expectedRestoration: control.expectedRestoration } });
    edges.push({ fromNodeType: "BUDGET", fromExternalId: `${twinId}:budget`, toNodeType: "RECOMMENDATION", toExternalId: id, edgeType: "TRIGGERED" });
  }
  return { nodes, edges };
}

export function createTrustTwin(input: TrustTwinEvaluationInput): TrustTwin {
  assertSafe(input);
  if (!uuidPattern.test(input.enterpriseId) || input.forecastInput.enterpriseId !== input.enterpriseId) throw new Error("TRUST_TWIN_TENANT_SCOPE_MISMATCH");
  if (!TRUST_TWIN_ENTITY_TYPES.includes(input.entity.type) || input.forecastInput.subject.id !== input.entity.id || input.forecastInput.subject.type !== input.entity.type) throw new Error("TRUST_TWIN_SUBJECT_SCOPE_MISMATCH");
  if (!referencePattern.test(input.entity.id) || !Number.isFinite(Date.parse(input.evaluatedAt))) throw new TypeError("Trust Twin entity or timestamp is invalid.");
  if (input.previousTwin && (input.previousTwin.enterpriseId !== input.enterpriseId || input.previousTwin.entityId !== input.entity.id)) throw new Error("TRUST_TWIN_PREVIOUS_SCOPE_MISMATCH");
  if (input.modelStateIntegrity && (input.modelStateIntegrity.enterpriseId !== input.enterpriseId || input.modelStateIntegrity.agentId !== input.entity.id)) throw new Error("TRUST_TWIN_MODEL_STATE_SCOPE_MISMATCH");
  if (input.authorityIntegrity && input.authorityIntegrity.actionTimeEvidence.enterpriseId !== input.enterpriseId) throw new Error("TRUST_TWIN_AUTHORITY_INTEGRITY_SCOPE_MISMATCH");
  if (input.modelStateIntegrity) {
    input = {
      ...input,
      forecastInput: {
        ...input.forecastInput,
        conditions: [
          ...input.forecastInput.conditions.filter((condition) => condition.dimension !== "MODEL_STATE_INTEGRITY"),
          ...input.modelStateIntegrity.trustConditions,
        ],
        authorityIntegrityFindings: unique([...(input.forecastInput.authorityIntegrityFindings ?? []), ...input.modelStateIntegrity.findings.map((item) => item.code)]),
      },
      proposedChanges: unique([...(input.proposedChanges ?? []), ...input.modelStateIntegrity.findings.map((item) => item.code)]),
      verificationEvidence: [
        ...(input.verificationEvidence ?? []),
        ...input.modelStateIntegrity.providerNeutralEvidence.map((item) => ({ challenge: "VERIFY_MODEL_STATE" as const, evidenceType: item.evidenceType, providerClass: item.providerClass ?? "RUNTIME_SECURITY_PROVIDER", providerKey: item.providerKey ?? item.providerId, observedAt: item.observedAt, expiresAt: input.modelStateIntegrity!.observedModelState.expiresAt ?? null, outcome: item.outcome, evidenceReferences: [item.evidenceDigest], assurance: item.assurance, retestReference: item.retestReference })),
      ],
    };
  }
  const reach = deriveReach(input.consequenceReach);
  const pressure = derivePressure(input.forecastInput.conditions, input.evaluatedAt, input.previousTwin);
  const budgetWithoutRestorers = deriveBudget(pressure, input);
  const controls = recommendControls(pressure, budgetWithoutRestorers.contextualConstraints);
  const budget: TrustBudget = {
    ...budgetWithoutRestorers,
    restorers: controls.map((item) => ({ code: item.code, expectedRestoration: item.expectedRestoration, explanation: item.reason })),
  };
  const forecast = evaluateTrustForecast({
    ...input.forecastInput,
    previousForecast: input.previousTwin?.trustForecast ?? input.forecastInput.previousForecast ?? null,
    trustTwinContext: {
      source: "DERIVED_TRUST_TWIN_INPUT",
      trustPressure: { value: pressure.value, level: pressure.level, trend: pressure.trend, contributorCodes: pressure.primaryContributors.map((item) => item.code) },
      trustBudget: { total: budget.total, consumed: budget.consumed, remaining: budget.remaining, status: budget.status, contextualConstraintCodes: budget.contextualConstraints.map((item) => item.code) },
      consequenceReach: { systemCount: reach.systemCount, dimensionCount: reach.dimensionCount, level: reach.level },
      advisoryOnly: true,
    },
  });
  const conditions = forecast.conditions;
  const evidenceReferences = unique(conditions.flatMap((item) => item.evidenceReferences));
  const adaptiveVerification = evaluateAdaptiveVerification({
    enterpriseId: input.enterpriseId,
    entity: input.entity,
    action: input.actionContext ?? { type: input.purpose, purpose: input.purpose, environment: reach.productionResources.length ? "production" : "unknown" },
    authorityReference: input.authorityContext?.reference ?? input.forecastInput.authorityReference ?? input.forecastInput.policyReference,
    authorityScopeValid: input.authorityContext?.scopeValid ?? state(conditions, "AUTHORITY_STABILITY") !== "SEVERE",
    evaluatedAt: input.evaluatedAt,
    policy: { ...input.verificationPolicy, policyReference: input.verificationPolicy?.policyReference ?? input.forecastInput.policyReference, policyVersion: input.verificationPolicy?.policyVersion ?? "1.0" },
    forecast,
    trustPressure: pressure,
    trustBudget: { ...budget, context: { ...budget.context } },
    consequenceReach: reach,
    evidence: input.verificationEvidence ?? [],
    materialChanges: unique([...(input.proposedChanges ?? []), ...forecast.materialChanges]),
    previousVerification: input.previousTwin?.adaptiveVerification ?? null,
  });
  const twinId = deterministicUuid({ enterpriseId: input.enterpriseId, entity: input.entity, evaluatedAt: input.evaluatedAt, evidenceReferences, forecastDigest: forecast.forecastDigest });
  const materialEvents = twinEvents(input, pressure, budget, forecast, evidenceReferences);
  const twinProjection = twinGraph(input, twinId, forecast, pressure, budget, controls, adaptiveVerification);
  const graphProjection: TrustForecastGraphProjection = input.modelStateIntegrity ? {
    nodes: [...twinProjection.nodes, ...input.modelStateIntegrity.graphProjection.nodes],
    edges: [...twinProjection.edges, ...input.modelStateIntegrity.graphProjection.edges],
  } : twinProjection;
  const replayEvents = [
    { eventType: "TRUST_TWIN_PROJECTED", occurredAt: input.evaluatedAt, evidenceReferences, details: { twinId, source: "CANONICAL_EVIDENCE_PROJECTION" } },
    { eventType: "TRUST_PRESSURE_EVALUATED", occurredAt: input.evaluatedAt, evidenceReferences, details: { value: pressure.value, level: pressure.level, trend: pressure.trend, contributors: pressure.primaryContributors.map((item) => item.code) } },
    { eventType: "TRUST_BUDGET_EVALUATED", occurredAt: input.evaluatedAt, evidenceReferences, details: { total: budget.total, consumed: budget.consumed, remaining: budget.remaining, status: budget.status } },
    ...forecast.replayEvents.map((event) => ({ eventType: event.eventType, occurredAt: event.occurredAt, evidenceReferences: event.evidenceReferences, details: event.details })),
    ...adaptiveVerification.replayEvents,
    ...(input.modelStateIntegrity?.replayEvents ?? []),
    ...materialEvents.map((event) => ({ eventType: event.eventType, occurredAt: event.occurredAt, evidenceReferences: event.evidenceReferences, details: { twinId } })),
  ];
  const materialMemoryTypes = unique([
    ...materialEvents.map((item) => item.eventType),
    ...(pressure.trend === "SPIKING" ? ["PRESSURE_SPIKE"] : []),
    ...(budget.status === "EXCEEDED" ? ["BUDGET_EXCEEDED"] : []),
    ...(input.previousTwin && reach.systemCount > input.previousTwin.consequenceReach.systemCount ? ["BLAST_RADIUS_MATERIALLY_INCREASED"] : []),
    ...(input.previousTwin && reach.systemCount < input.previousTwin.consequenceReach.systemCount ? ["BLAST_RADIUS_MATERIALLY_REDUCED"] : []),
    ...((input.proposedChanges ?? []).includes("REDUCE_AUTHORITY") ? ["AUTHORITY_REDUCED"] : []),
    ...((input.proposedChanges ?? []).includes("RESTORE_MONITORING") ? ["MONITORING_RESTORED"] : []),
    ...((input.proposedChanges ?? []).includes("PIN_DESTINATION") ? ["DESTINATION_PINNED"] : []),
    ...(input.previousTwin && ["NEAR_LIMIT", "EXCEEDED"].includes(input.previousTwin.trustBudget.status) && budget.status === "HEALTHY" ? ["CONTROL_RESTORED_TRUST"] : []),
  ]);
  const trustMemoryEvents = [
    ...forecast.trustMemoryEvents,
    ...adaptiveVerification.trustMemoryEvents,
    ...(input.modelStateIntegrity?.trustMemoryEvents ?? []),
    ...materialMemoryTypes.map((eventType) => ({ eventId: hashCanonical([twinId, eventType]), eventType, occurredAt: input.evaluatedAt, evidenceReferences })),
  ].filter((item, index, events) => events.findIndex((candidate) => candidate.eventType === item.eventType) === index);
  const core = {
    twinVersion: "1.0" as const,
    twinId,
    label: "DERIVED_TRUST_TWIN" as const,
    enterpriseId: input.enterpriseId,
    entityId: input.entity.id,
    entityType: input.entity.type,
    policyReference: input.forecastInput.policyReference,
    identityState: state(conditions, "IDENTITY_STABILITY"),
    owner: input.owner,
    purpose: input.purpose,
    authorityState: state(conditions, "AUTHORITY_STABILITY"),
    intentState: state(conditions, "INTENT_ALIGNMENT"),
    toolState: state(conditions, "TOOL_EXPOSURE"),
    runtimeState: state(conditions, "RUNTIME_ASSURANCE"),
    monitoringState: state(conditions, "MONITORING_COVERAGE"),
    destinationState: state(conditions, "DESTINATION_EXPOSURE"),
    dataExposure: state(conditions, "DATA_EXPOSURE"),
    humanOversight: state(conditions, "HUMAN_OVERSIGHT"),
    providerConfidence: forecast.confidence,
    evidenceFreshness: conditions.some((item) => item.freshness === "EXPIRED") ? "EXPIRED" as const : conditions.some((item) => item.freshness === "STALE") ? "STALE" as const : conditions.some((item) => item.freshness === "AGING") ? "AGING" as const : conditions.some((item) => item.freshness === "UNAVAILABLE") ? "UNAVAILABLE" as const : "CURRENT" as const,
    authorizationPropagation: state(conditions, "AUTHORIZATION_PROPAGATION"),
    declaredAuthority: input.authorityIntegrity?.runtimeAuthority?.declaredAuthority ?? [],
    runtimeEffectiveAuthority: input.authorityIntegrity?.runtimeAuthority?.runtimeEffectiveAuthority ?? [],
    destinationEffectiveAuthority: input.authorityIntegrity?.runtimeAuthority?.destinationEffectiveAuthority ?? null,
    authorityPropagationState: input.authorityIntegrity?.authorizationPropagation.state ?? "NOT_OBSERVED" as const,
    parameterAuthorityBindings: input.authorityIntegrity?.parameterAuthority ?? [],
    parameterProvenance: input.authorityIntegrity?.parameterAuthority.map((item) => ({ parameterName: item.parameterName, provenance: item.observedProvenance, state: item.state })) ?? [],
    authorityEvidenceFreshness: !input.authorityIntegrity?.runtimeAuthority ? "UNAVAILABLE" as const : Date.parse(input.evaluatedAt) - Date.parse(input.authorityIntegrity.runtimeAuthority.measurementTime) > 86_400_000 ? "STALE" as const : "CURRENT" as const,
    staleAuthorityRisk: ["STALE_AUTHORITY_POSSIBLE", "STALE_AUTHORITY_CONFIRMED"].includes(input.authorityIntegrity?.authorizationPropagation.state ?? ""),
    authorityConflicts: input.authorityIntegrity?.findings.filter((item) => /CONFLICT|MISMATCH/.test(item.code)).map((item) => item.code) ?? [],
    authorityIntegrity: input.authorityIntegrity ?? null,
    approvedModelState: input.modelStateIntegrity?.approvedModelState ?? null,
    observedModelState: input.modelStateIntegrity?.observedModelState ?? null,
    modelIntegrityState: input.modelStateIntegrity?.modelIntegrityState ?? "NOT_OBSERVED" as const,
    templateIntegrity: input.modelStateIntegrity?.templateIntegrity ?? null,
    artifactIntegrity: input.modelStateIntegrity?.artifactIntegrity ?? null,
    runtimeIntegrity: input.modelStateIntegrity?.runtimeIntegrity ?? null,
    endpointIntegrity: input.modelStateIntegrity?.endpointIntegrity ?? null,
    stateChangeProvenance: input.modelStateIntegrity?.stateChangeProvenance ?? null,
    lastModelStateMeasurement: input.modelStateIntegrity?.lastModelStateMeasurement ?? null,
    modelStateEvidenceFreshness: input.modelStateIntegrity?.modelStateEvidenceFreshness ?? "UNAVAILABLE" as const,
    modelStateIntegrity: input.modelStateIntegrity ?? null,
    adaptiveVerification,
    trustForecast: forecast,
    forecastTrend: forecast.trend,
    trustPressure: pressure,
    trustBudget: budget,
    consequenceReach: reach,
    lastMaterialChange: materialEvents.length || adaptiveVerification.trustMemoryEvents.length ? input.evaluatedAt : input.previousTwin?.lastMaterialChange ?? null,
    recommendedControl: controls[0] ?? null,
    recommendedControls: controls,
    recommendedTrustPath: recommendedPaths(input, pressure),
    knownLimitations: unique([
      ...forecast.knownLimitations,
      ...reach.knownLimitations,
      ...adaptiveVerification.knownLimitations,
      ...(input.modelStateIntegrity?.trustConditions.flatMap((condition) => condition.knownLimitations) ?? []),
      "Trust Pressure and Trust Budget are normalized, explainable heuristics and do not claim exact incident or loss probability.",
      "The Trust Twin is derived from canonical evidence and is not a canonical data store.",
    ]),
    evidenceReferences,
    materialEvents,
    graphProjection,
    replayEvents,
    trustMemoryEvents,
    mlReadiness: {
      eligibleEpisode: {
        twinStateBefore: input.previousTwin?.twinId ?? null,
        pressure: pressure.value,
        budget: budget.remaining,
        forecast: forecast.state,
        proposedChange: unique(input.proposedChanges ?? forecast.materialChanges),
        counterfactualProjection: null,
        controlRecommended: controls[0]?.code ?? null,
        controlApplied: null,
        canonicalDecision: null,
        executionOutcome: null,
        destinationOutcome: null,
        laterResult: null,
      },
      modelUsed: false as const,
      trainingPerformed: false as const,
    },
    canonicalDecisionBoundary: { decisionAuthority: "CANONICAL_TRUST_FABRIC_ONLY" as const, pressureCanDeny: false as const, budgetCanDeny: false as const, twinCanExecute: false as const, verificationCanGrantAuthority: false as const },
    source: "CANONICAL_EVIDENCE_PROJECTION" as const,
    updatedAt: input.evaluatedAt,
  };
  return deepFreeze({ ...core, twinDigest: hashCanonical(core) }) as TrustTwin;
}

function updatedCondition(conditions: TrustConditionInput[], target: TrustConditionInput["dimension"], patch: Partial<TrustConditionInput>) {
  const index = conditions.findIndex((item) => item.dimension === target);
  if (index < 0) return;
  conditions[index] = {
    ...conditions[index],
    ...patch,
    evidenceReferences: unique([...(conditions[index].evidenceReferences ?? []), ...((patch.evidenceReferences as string[] | undefined) ?? [])]),
    signals: patch.signals?.length === 0 ? [] : unique([...(conditions[index].signals ?? []), ...((patch.signals as string[] | undefined) ?? [])]),
  };
}

function addReachSystems(reach: ConsequenceReachInput, prefix: string, count: number) {
  for (let index = 1; index <= count; index += 1) reach.systems.push(`simulation:${prefix}:system-${index}`);
}

function removeReachSystems(reach: ConsequenceReachInput, prefixes: string[]) {
  reach.systems = reach.systems.filter((item) => !prefixes.some((prefix) => item.startsWith(`simulation:${prefix}:`)));
}

function counterfactualVerificationEvidence(changes: CounterfactualChange[], evaluatedAt: string): VerificationEvidenceInput[] {
  const evidenceByChange: Partial<Record<CounterfactualChangeType, Array<{ challenge: VerificationEvidenceInput["challenge"]; providerClass: string }>>> = {
    REDUCE_AUTHORITY: [
      { challenge: "VERIFY_AUTHORITY", providerClass: "APPLICATION_SIGNAL" },
      { challenge: "VERIFY_AGENT_CONFIGURATION", providerClass: "AI_ASSURANCE_PROVIDER" },
    ],
    PIN_DESTINATION: [{ challenge: "VERIFY_DESTINATION", providerClass: "APPLICATION_SIGNAL" }],
    RESTORE_MONITORING: [{ challenge: "VERIFY_MONITORING", providerClass: "APPLICATION_SIGNAL" }],
    REFRESH_RUNTIME_ATTESTATION: [{ challenge: "VERIFY_RUNTIME", providerClass: "RUNTIME_SECURITY_PROVIDER" }],
  };
  return changes.flatMap((change) => (evidenceByChange[change.changeType] ?? []).map(({ challenge, providerClass }) => ({
    challenge,
    evidenceType: `SIMULATED_${challenge}`,
    providerClass,
    providerKey: "counterfactual-control-projection",
    observedAt: evaluatedAt,
    expiresAt: null,
    outcome: "PASSED_IN_SIMULATION",
    evidenceReferences: [`simulation:${change.changeType.toLowerCase()}`],
    assurance: 0.9,
    retestReference: `simulation:retest:${change.changeType.toLowerCase()}`,
  })));
}

function projectChange(conditions: TrustConditionInput[], reach: ConsequenceReachInput, change: CounterfactualChange, evaluatedAt: string) {
  const reference = `simulation:${change.changeType.toLowerCase()}`;
  if (change.changeType === "GRANT_WRITE_REPOSITORY" || change.changeType === "INCREASE_PRIVILEGE") {
    updatedCondition(conditions, "AUTHORITY_STABILITY", { status: "ELEVATED", trend: "DETERIORATING", summary: "Counterfactual authority expands from read to write.", signals: ["PRIVILEGE_INCREASED"], evidenceReferences: [reference] });
    updatedCondition(conditions, "AUTHORITY_EXPOSURE", { status: "ELEVATED", trend: "DETERIORATING", signals: ["PRIVILEGE_INCREASED"], evidenceReferences: [reference] });
    addReachSystems(reach, "write", 6);
    reach.productionResources.push(change.target ?? "repository:production-write");
  }
  if (change.changeType === "ADD_MCP_TOOL") {
    updatedCondition(conditions, "TOOL_EXPOSURE", { status: "ELEVATED", trend: "DETERIORATING", summary: "A new MCP tool is present in the counterfactual state.", signals: ["TOOLSET_CHANGED"], evidenceReferences: [reference] });
    updatedCondition(conditions, "MONITORING_COVERAGE", { status: "PARTIAL", trend: "DETERIORATING", summary: "Existing monitoring does not yet cover the new MCP write path.", signals: ["MONITORING_COVERAGE_GAP"], evidenceReferences: [reference] });
    addReachSystems(reach, "mcp", 4);
    reach.tools.push(change.target ?? "tool:new-mcp");
  }
  if (change.changeType === "REMOVE_MONITORING") updatedCondition(conditions, "MONITORING_COVERAGE", { status: "ELEVATED", trend: "RAPIDLY_DETERIORATING", summary: "Required monitoring is removed in the counterfactual state.", signals: ["MONITORING_COVERAGE_GAP"], evidenceReferences: [reference] });
  if (change.changeType === "CHANGE_DESTINATION" || change.changeType === "WEAKEN_DESTINATION_BINDING") {
    updatedCondition(conditions, "DESTINATION_EXPOSURE", { status: "ELEVATED", trend: "RAPIDLY_DETERIORATING", summary: "Destination binding is changed or weakened in the counterfactual state.", signals: ["DESTINATION_CHANGED", "MODEL_CONTROLLED_SECURITY_BOUNDARY"], evidenceReferences: [reference] });
    addReachSystems(reach, "destination", 2);
    reach.destinations.push(change.target ?? "destination:unverified");
  }
  if (change.changeType === "CHANGE_MODEL") updatedCondition(conditions, "MODEL_CHANGE_RISK", { status: "ELEVATED", trend: "DETERIORATING", signals: ["MODEL_VERSION_CHANGED"], evidenceReferences: [reference] });
  if (change.changeType === "REMOVE_HUMAN_APPROVAL") updatedCondition(conditions, "INTENT_ALIGNMENT", { status: "ELEVATED", trend: "DETERIORATING", signals: ["SIGNED_INTENT_MISMATCH"], evidenceReferences: [reference] });
  if (change.changeType === "CHANGE_RUNTIME") updatedCondition(conditions, "RUNTIME_ASSURANCE", { status: "ELEVATED", trend: "DETERIORATING", signals: ["RUNTIME_CHANGED"], evidenceReferences: [reference] });
  if (change.changeType === "REVOKE_CREDENTIAL") updatedCondition(conditions, "AUTHORIZATION_PROPAGATION", { status: "ELEVATED", trend: "DETERIORATING", signals: ["AUTHORIZATION_PROPAGATION_INCOMPLETE"], evidenceReferences: [reference] });
  if (change.changeType === "REDUCE_AUTHORITY") {
    updatedCondition(conditions, "AUTHORITY_STABILITY", { status: "STABLE", trend: "IMPROVING", summary: "Authority is reduced to the qualified read-only baseline.", signals: [], evidenceReferences: [reference] });
    updatedCondition(conditions, "AUTHORITY_EXPOSURE", { status: "STABLE", trend: "IMPROVING", signals: [], evidenceReferences: [reference] });
    updatedCondition(conditions, "TOOL_EXPOSURE", { status: "WATCH", trend: "IMPROVING", summary: "The added tool remains visible but cannot exercise write authority.", signals: [], evidenceReferences: [reference] });
    updatedCondition(conditions, "CHANGE_VELOCITY", { status: "WATCH", trend: "IMPROVING", summary: "Recent controls leave a small residual requalification window.", evidenceReferences: [reference] });
    removeReachSystems(reach, ["write"]);
    reach.productionResources = reach.productionResources.filter((item) => !/repository:production|production-write/i.test(item));
  }
  if (change.changeType === "PIN_DESTINATION") {
    updatedCondition(conditions, "DESTINATION_EXPOSURE", { status: "STABLE", trend: "IMPROVING", summary: "Destination is pinned outside model control.", signals: [], evidenceReferences: [reference] });
    removeReachSystems(reach, ["destination"]);
    reach.destinations = reach.destinations.filter((item) => item !== "destination:unverified");
  }
  if (change.changeType === "RESTORE_MONITORING") updatedCondition(conditions, "MONITORING_COVERAGE", { status: "COMPLETE", trend: "IMPROVING", summary: "Monitoring coverage is restored and verified.", signals: [], evidenceReferences: [reference] });
  if (change.changeType === "REFRESH_RUNTIME_ATTESTATION") updatedCondition(conditions, "RUNTIME_ASSURANCE", { status: "STABLE", trend: "IMPROVING", summary: "Runtime attestation is current for the projected context.", lastVerifiedAt: evaluatedAt, freshness: "CURRENT", signals: [], evidenceReferences: [reference] });
  if (change.changeType === "WIDEN_AUTHORITY") updatedCondition(conditions, "AUTHORITY_EXPOSURE", { status: "SEVERE", trend: "RAPIDLY_DETERIORATING", summary: "Authority is widened in the isolated counterfactual state.", signals: ["AUTHORITY_CHANGED", "PRIVILEGE_INCREASED"], evidenceReferences: [reference] });
  if (change.changeType === "MODEL_CONTROL_DESTINATION") updatedCondition(conditions, "DESTINATION_EXPOSURE", { status: "ELEVATED", trend: "RAPIDLY_DETERIORATING", summary: "Destination selection becomes model-controlled in the isolated counterfactual state.", signals: ["MODEL_CONTROLLED_SECURITY_BOUNDARY", "DESTINATION_BINDING_LOST"], evidenceReferences: [reference] });
  if (change.changeType === "DELAY_RUNTIME_AUTHORITY_REFRESH") {
    updatedCondition(conditions, "AUTHORIZATION_PROPAGATION", { status: "SEVERE", trend: "RAPIDLY_DETERIORATING", summary: "Runtime-effective authority does not refresh after the simulated control-plane change.", signals: ["AUTHORITY_PROPAGATION_UNRESOLVED", "STALE_AUTHORITY_POSSIBLE"], evidenceReferences: [reference] });
    updatedCondition(conditions, "STALE_AUTHORITY_RISK", { status: "ELEVATED", trend: "DETERIORATING", summary: "Delayed runtime refresh creates a simulated stale-authority risk.", signals: ["STALE_AUTHORITY_POSSIBLE"], evidenceReferences: [reference] });
  }
  if (change.changeType === "DELAY_CREDENTIAL_ROTATION") updatedCondition(conditions, "STALE_AUTHORITY_RISK", { status: "ELEVATED", trend: "DETERIORATING", summary: "Credential rotation is delayed in the isolated counterfactual state.", signals: ["STALE_AUTHORITY_POSSIBLE", "CREDENTIAL_ROTATION_DELAYED"], evidenceReferences: [reference] });
  if (change.changeType === "PIN_PARAMETER_TO_AUTHORITY") updatedCondition(conditions, "TOOL_PARAMETER_PROVENANCE", { status: "STABLE", trend: "IMPROVING", summary: "The security-critical parameter is pinned to the authority contract in the isolated counterfactual state.", signals: [], evidenceReferences: [reference] });
}

export function simulateCounterfactualTrust(input: { enterpriseId: string; currentTwin: TrustTwin; changes: CounterfactualChange[]; evaluatedAt: string }): CounterfactualTrustSimulation {
  assertSafe(input);
  if (input.enterpriseId !== input.currentTwin.enterpriseId) throw new Error("COUNTERFACTUAL_TENANT_SCOPE_MISMATCH");
  if (!Number.isFinite(Date.parse(input.evaluatedAt)) || !input.changes.length || input.changes.some((item) => !COUNTERFACTUAL_CHANGE_TYPES.includes(item.changeType))) throw new TypeError("Counterfactual simulation input is invalid.");
  const conditions = structuredClone(input.currentTwin.trustForecast.conditions);
  const reach: ConsequenceReachInput = structuredClone({
    systems: input.currentTwin.consequenceReach.systems,
    credentials: input.currentTwin.consequenceReach.credentials,
    tools: input.currentTwin.consequenceReach.tools,
    dataClasses: input.currentTwin.consequenceReach.dataClasses,
    destinations: input.currentTwin.consequenceReach.destinations,
    downstreamAgents: input.currentTwin.consequenceReach.downstreamAgents,
    productionResources: input.currentTwin.consequenceReach.productionResources,
    financialExposure: input.currentTwin.consequenceReach.financialExposure,
    humanImpactingSystems: input.currentTwin.consequenceReach.humanImpactingSystems,
  });
  for (const change of input.changes) projectChange(conditions, reach, change, input.evaluatedAt);
  const changeTypes = input.changes.map((item) => item.changeType);
  const projectedTwin = createTrustTwin({
    enterpriseId: input.enterpriseId,
    entity: { id: input.currentTwin.entityId, type: input.currentTwin.entityType },
    owner: input.currentTwin.owner,
    purpose: input.currentTwin.purpose,
    evaluatedAt: input.evaluatedAt,
    forecastInput: {
      ...structuredClone(input.currentTwin.trustForecast),
      evaluatedAt: input.evaluatedAt,
      policyReference: input.currentTwin.policyReference,
      conditions,
      previousForecast: input.currentTwin.trustForecast,
      approvedManifest: null,
      currentManifest: null,
      authorityIntegrityFindings: unique(conditions.flatMap((item) => item.signals ?? [])),
    },
    consequenceReach: reach,
    budgetContext: input.currentTwin.trustBudget.context,
    previousTwin: input.currentTwin,
    proposedChanges: changeTypes,
    verificationEvidence: counterfactualVerificationEvidence(input.changes, input.evaluatedAt),
    modelStateIntegrity: input.currentTwin.modelStateIntegrity,
    authorityIntegrity: input.currentTwin.authorityIntegrity,
  });
  const simulationId = deterministicUuid({ type: "COUNTERFACTUAL_TRUST_SIMULATION", sourceTwinDigest: input.currentTwin.twinDigest, evaluatedAt: input.evaluatedAt, changes: input.changes });
  const evidenceReferences = unique(projectedTwin.evidenceReferences);
  const graphProjection: TrustForecastGraphProjection = {
    nodes: [
      ...projectedTwin.graphProjection.nodes,
      { nodeType: "COUNTERFACTUAL", externalId: simulationId, domainKey: "GOVERNANCE", label: "Counterfactual Trust Simulation", metadata: { simulated: true, executionPerformed: false } },
    ],
    edges: [
      ...projectedTwin.graphProjection.edges,
      { fromNodeType: "TRUST_TWIN", fromExternalId: input.currentTwin.twinId, toNodeType: "COUNTERFACTUAL", toExternalId: simulationId, edgeType: "TRIGGERED" },
      { fromNodeType: "COUNTERFACTUAL", fromExternalId: simulationId, toNodeType: "TRUST_TWIN", toExternalId: projectedTwin.twinId, edgeType: "RESULTED_IN" },
    ],
  };
  const core = {
    simulationVersion: "1.0" as const,
    simulationId,
    type: "COUNTERFACTUAL_TRUST_SIMULATION" as const,
    simulated: true as const,
    isolated: true as const,
    executionPerformed: false as const,
    persistedAsCanonicalExecution: false as const,
    enterpriseId: input.enterpriseId,
    entityId: input.currentTwin.entityId,
    evaluatedAt: input.evaluatedAt,
    sourceTwinId: input.currentTwin.twinId,
    sourceTwinDigest: input.currentTwin.twinDigest,
    proposedChanges: structuredClone(input.changes),
    currentTwin: input.currentTwin,
    projectedTwin,
    delta: {
      forecast: { from: input.currentTwin.trustForecast.state, to: projectedTwin.trustForecast.state },
      pressure: { from: input.currentTwin.trustPressure.value, to: projectedTwin.trustPressure.value, change: projectedTwin.trustPressure.value - input.currentTwin.trustPressure.value },
      budgetRemaining: { from: input.currentTwin.trustBudget.remaining, to: projectedTwin.trustBudget.remaining, change: projectedTwin.trustBudget.remaining - input.currentTwin.trustBudget.remaining },
      projectedBlastRadius: { from: input.currentTwin.consequenceReach.systemCount, to: projectedTwin.consequenceReach.systemCount, change: projectedTwin.consequenceReach.systemCount - input.currentTwin.consequenceReach.systemCount },
    },
    primaryContributors: projectedTwin.trustPressure.primaryContributors,
    newEvidenceGaps: projectedTwin.trustForecast.evidenceGaps.filter((item) => !input.currentTwin.trustForecast.evidenceGaps.includes(item)),
    recommendedControls: projectedTwin.recommendedControls,
    deploymentRecommendation: projectedTwin.trustForecast.deploymentRecommendation,
    recommendedTrustPath: projectedTwin.recommendedTrustPath,
    graphProjection,
    replayEvents: [{ eventType: "COUNTERFACTUAL_TRUST_SIMULATION" as const, occurredAt: input.evaluatedAt, simulated: true as const, persistedAsCanonicalExecution: false as const, evidenceReferences, details: { simulationId, proposedChanges: changeTypes, projectedTwinId: projectedTwin.twinId, executionPerformed: false } }],
    mlReadiness: {
      episode: {
        twinStateBefore: input.currentTwin.twinId,
        pressure: projectedTwin.trustPressure.value,
        budget: projectedTwin.trustBudget.remaining,
        forecast: projectedTwin.trustForecast.state,
        proposedChange: changeTypes,
        counterfactualProjection: projectedTwin.twinId,
        controlRecommended: projectedTwin.recommendedControl?.code ?? null,
        controlApplied: null,
        canonicalDecision: null,
        executionOutcome: null,
        destinationOutcome: null,
        laterResult: null,
      },
      modelUsed: false as const,
      trainingPerformed: false as const,
    },
    knownLimitations: unique([...projectedTwin.knownLimitations, "Simulation changes only the isolated derived projection; it does not execute or persist the consequential action."]),
  };
  return deepFreeze({ ...core, simulationDigest: hashCanonical(core) }) as CounterfactualTrustSimulation;
}

export function createCounterfactualOutcomeFeedback(input: {
  simulation: CounterfactualTrustSimulation;
  enterpriseId: string;
  controlApplied?: TrustControlCode | null;
  canonicalDecision: "ALLOW" | "REVIEW" | "DENY";
  executionOutcome: "EXECUTED" | "NOT_EXECUTED" | "UNKNOWN";
  destinationOutcome: string;
  laterResult: string;
  occurredAt: string;
}): CounterfactualOutcomeFeedback {
  assertSafe(input);
  if (input.enterpriseId !== input.simulation.enterpriseId) throw new Error("COUNTERFACTUAL_FEEDBACK_TENANT_SCOPE_MISMATCH");
  if (!Number.isFinite(Date.parse(input.occurredAt))) throw new TypeError("Counterfactual feedback timestamp is invalid.");
  const evidenceReferences = unique(input.simulation.projectedTwin.evidenceReferences);
  const eventTypes: CounterfactualOutcomeFeedback["trustMemoryEvents"][number]["eventType"][] = [];
  if (["REVIEW", "DENY"].includes(input.canonicalDecision) && input.executionOutcome === "NOT_EXECUTED") eventTypes.push("COUNTERFACTUAL_PREVENTED_UNSAFE_RELEASE");
  if (input.controlApplied && /RESTORED|SUCCESS|QUALIFIED|STABLE/.test(input.laterResult.toUpperCase())) eventTypes.push("CONTROL_RESTORED_TRUST");
  const feedbackId = deterministicUuid({ simulationId: input.simulation.simulationId, occurredAt: input.occurredAt, canonicalDecision: input.canonicalDecision, laterResult: input.laterResult });
  const trustMemoryEvents = unique(eventTypes).map((eventType) => ({ eventId: hashCanonical([feedbackId, eventType]), eventType: eventType as CounterfactualOutcomeFeedback["trustMemoryEvents"][number]["eventType"], occurredAt: input.occurredAt, evidenceReferences }));
  const core = {
    feedbackVersion: "1.0" as const,
    feedbackId,
    simulationId: input.simulation.simulationId,
    enterpriseId: input.enterpriseId,
    controlApplied: input.controlApplied ?? null,
    canonicalDecision: input.canonicalDecision,
    executionOutcome: input.executionOutcome,
    destinationOutcome: input.destinationOutcome,
    laterResult: input.laterResult,
    occurredAt: input.occurredAt,
    replayEvents: [{ eventType: "COUNTERFACTUAL_OUTCOME_RECORDED", occurredAt: input.occurredAt, simulated: false as const, evidenceReferences, details: { feedbackId, simulationId: input.simulation.simulationId, canonicalDecision: input.canonicalDecision, controlApplied: input.controlApplied ?? null, executionOutcome: input.executionOutcome, destinationOutcome: input.destinationOutcome, laterResult: input.laterResult } }],
    trustMemoryEvents,
    mlEpisode: {
      twinStateBefore: input.simulation.sourceTwinId,
      pressure: input.simulation.projectedTwin.trustPressure.value,
      budget: input.simulation.projectedTwin.trustBudget.remaining,
      forecast: input.simulation.projectedTwin.trustForecast.state,
      proposedChange: input.simulation.proposedChanges.map((item) => item.changeType),
      counterfactualProjection: input.simulation.projectedTwin.twinId,
      controlRecommended: input.simulation.recommendedControls[0]?.code ?? null,
      controlApplied: input.controlApplied ?? null,
      canonicalDecision: input.canonicalDecision,
      executionOutcome: input.executionOutcome,
      destinationOutcome: input.destinationOutcome,
      laterResult: input.laterResult,
    },
    automaticTrainingStarted: false as const,
  };
  return deepFreeze(core) as CounterfactualOutcomeFeedback;
}

function demoCondition(dimensionName: TrustConditionInput["dimension"], status: TrustConditionInput["status"], summary: string): TrustConditionInput {
  return {
    dimension: dimensionName,
    status,
    confidence: 0.9,
    evidenceReferences: [`demo-evidence:${dimensionName.toLowerCase()}`],
    lastVerifiedAt: "2026-08-24T09:00:00.000Z",
    freshness: "CURRENT",
    trend: "UNCHANGED",
    materiality: ["AUTHORITY_STABILITY", "DESTINATION_EXPOSURE", "MONITORING_COVERAGE", "CONSEQUENCE_EXPOSURE"].includes(dimensionName) ? "CRITICAL" : "HIGH",
    knownLimitations: [],
    summary,
    signals: [],
    providerIds: ["canonical_demo_evidence"],
  };
}

export function createAgentAlphaTrustTwinDemo() {
  const enterpriseId = "7c60bb54-a74c-4ea4-b137-50cb1bc92f4b";
  const systems = Array.from({ length: 7 }, (_, index) => `system:approved-${index + 1}`);
  const baseline = createTrustTwin({
    enterpriseId,
    entity: { id: "agent-alpha", type: "AI_AGENT" },
    owner: "owner:security-platform",
    purpose: "read_repository",
    evaluatedAt: "2026-08-24T09:00:00.000Z",
    forecastInput: {
      enterpriseId,
      subject: { id: "agent-alpha", type: "AI_AGENT" },
      horizon: "PRE_DEPLOYMENT",
      evaluatedAt: "2026-08-24T09:00:00.000Z",
      policyReference: "policy:repository-read-v1",
      conditions: [
        demoCondition("IDENTITY_STABILITY", "STRONG", "Agent identity and accountable owner are continuous."),
        demoCondition("AUTHORITY_STABILITY", "STABLE", "Authority is limited to read_repository."),
        demoCondition("AUTHORITY_EXPOSURE", "STABLE", "Authority exposure is bounded to read-only access."),
        demoCondition("INTENT_ALIGNMENT", "STRONG", "Signed intent covers repository reading."),
        demoCondition("TOOL_EXPOSURE", "STABLE", "Only the qualified repository reader is enabled."),
        demoCondition("RUNTIME_ASSURANCE", "STABLE", "Runtime is pinned and attested."),
        demoCondition("MONITORING_COVERAGE", "COMPLETE", "Repository monitoring is complete."),
        demoCondition("DESTINATION_EXPOSURE", "STABLE", "Destination is pinned to the approved organization."),
        demoCondition("DATA_EXPOSURE", "STABLE", "Exposure is limited to approved source repositories."),
        demoCondition("HUMAN_OVERSIGHT", "STRONG", "Human oversight is available."),
        demoCondition("PROVIDER_CONFIDENCE", "STABLE", "Provider evidence is consistent."),
        demoCondition("EVIDENCE_FRESHNESS", "STABLE", "Decision-time evidence is current."),
        demoCondition("AUTHORIZATION_PROPAGATION", "STABLE", "Authority state is consistent downstream."),
        demoCondition("CONSEQUENCE_EXPOSURE", "WATCH", "Seven connected systems are within known reach."),
        demoCondition("CHANGE_VELOCITY", "STABLE", "No recent material change is active."),
      ],
    },
    consequenceReach: { systems, credentials: ["credential:repository-read"], tools: ["tool:repository-reader"], dataClasses: ["source-code"], destinations: ["github:approved-organization"], downstreamAgents: [], productionResources: [], financialExposure: [], humanImpactingSystems: [] },
    budgetContext: { consequenceSeverity: "MODERATE", dataSensitivity: "INTERNAL", privilegeLevel: "READ_ONLY", reversibility: "HIGH", regulatorySensitivity: "STANDARD", humanSafetyImpact: "NONE_OBSERVED", monitoringConfidence: 0.95 },
  });
  const projected = simulateCounterfactualTrust({
    enterpriseId,
    currentTwin: baseline,
    evaluatedAt: "2026-08-24T09:20:00.000Z",
    changes: [
      { changeType: "GRANT_WRITE_REPOSITORY", target: "repository:production" },
      { changeType: "ADD_MCP_TOOL", target: "tool:mcp-repository-writer" },
      { changeType: "WEAKEN_DESTINATION_BINDING", target: "destination:model-selected" },
    ],
  });
  const controlled = simulateCounterfactualTrust({
    enterpriseId,
    currentTwin: projected.projectedTwin,
    evaluatedAt: "2026-08-24T09:40:00.000Z",
    changes: [
      { changeType: "REDUCE_AUTHORITY", explanation: "Retain read-only authority." },
      { changeType: "PIN_DESTINATION", target: "github:approved-organization" },
      { changeType: "RESTORE_MONITORING", explanation: "Verify repository monitoring." },
      { changeType: "REFRESH_RUNTIME_ATTESTATION", explanation: "Supply current runtime assurance." },
    ],
  });
  return deepFreeze({ baseline, projected, controlled, canonicalRuntimeRequest: { action: "write_repository", decision: "DENY" as const, reasonCode: "AUTHORITY_SCOPE_INVALID" as const, executionPerformed: false as const } });
}
