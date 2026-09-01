import { deterministicUuid, hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { CanonicalTransactionDecision } from "../../src/lib/trust-transaction/canonical.ts";
import type { WorkflowIntervention } from "../../src/lib/protected-workflows/model.ts";

export const TRUST_CONDITION_DIMENSIONS = [
  "IDENTITY_STABILITY",
  "AUTHORITY_STABILITY",
  "AUTHORITY_EXPOSURE",
  "INTENT_ALIGNMENT",
  "TOOL_EXPOSURE",
  "TOOL_PARAMETER_PROVENANCE",
  "DATA_EXPOSURE",
  "DESTINATION_EXPOSURE",
  "RUNTIME_ASSURANCE",
  "MONITORING_COVERAGE",
  "HUMAN_OVERSIGHT",
  "PROVIDER_CONFIDENCE",
  "EVIDENCE_FRESHNESS",
  "CHANGE_VELOCITY",
  "MODEL_STATE_INTEGRITY",
  "MODEL_CHANGE_RISK",
  "POLICY_CHANGE_RISK",
  "PRIVILEGE_CHANGE_RISK",
  "CONSEQUENCE_EXPOSURE",
  "TRUST_MEMORY_HISTORY",
  "AUTHORIZATION_PROPAGATION",
  "STALE_AUTHORITY_RISK",
] as const;

export const TRUST_FORECAST_STATES = ["STABLE", "WATCH", "ELEVATED", "SEVERE", "INSUFFICIENT_EVIDENCE"] as const;
export const DEPLOYMENT_RECOMMENDATIONS = ["QUALIFY", "QUALIFY_WITH_CONTROLS", "REVIEW_REQUIRED", "HOLD", "DO_NOT_RELEASE"] as const;
export const TRUST_FORECAST_HORIZONS = ["PRE_DEPLOYMENT", "DEPLOYMENT", "NEXT_CONSEQUENTIAL_ACTION", "NEXT_SESSION", "SHORT_TERM_OPERATIONAL", "ONGOING_CONTINUITY"] as const;
export const TRUST_CONDITION_TRENDS = ["IMPROVING", "UNCHANGED", "DETERIORATING", "RAPIDLY_DETERIORATING", "UNKNOWN"] as const;
export const FORECAST_SUBJECT_TYPES = ["HUMAN", "AI_AGENT", "SOFTWARE_AGENT", "MACHINE", "ROBOT", "WORKLOAD"] as const;

export type TrustConditionDimension = (typeof TRUST_CONDITION_DIMENSIONS)[number];
export type TrustForecastState = (typeof TRUST_FORECAST_STATES)[number];
export type DeploymentRecommendation = (typeof DEPLOYMENT_RECOMMENDATIONS)[number];
export type TrustForecastHorizon = (typeof TRUST_FORECAST_HORIZONS)[number];
export type TrustConditionTrend = (typeof TRUST_CONDITION_TRENDS)[number];
export type ForecastSubjectType = (typeof FORECAST_SUBJECT_TYPES)[number];
export type TrustConditionStatus = "STRONG" | "COMPLETE" | "STABLE" | "WATCH" | "PARTIAL" | "ELEVATED" | "SEVERE" | "UNKNOWN";
export type TrustEvidenceFreshness = "CURRENT" | "AGING" | "STALE" | "EXPIRED" | "UNAVAILABLE";
export type TrustMateriality = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TrustConditionDirection = "TRUST_CONDITIONS_IMPROVED" | "TRUST_CONDITIONS_DETERIORATED" | "TRUST_CONDITIONS_UNCHANGED" | "TRUST_CONDITIONS_UNKNOWN";
export type TrustBaselineAction = "REQUALIFICATION_REQUIRED" | "REAUTHORIZATION_REQUIRED" | "NO_ACTION_REQUIRED";
export type PreventativeControlCode =
  | "step_up_verification"
  | "human_approval_required"
  | "reduce_authority"
  | "pin_destination"
  | "restore_monitoring"
  | "revalidate_identity"
  | "requalify_tool"
  | "revoke_stale_credential"
  | "refresh_policy_evidence"
  | "hold_deployment"
  | "disable_capability"
  | "reauthorize"
  | "no_action";

export type TrustConditionInput = {
  dimension: TrustConditionDimension;
  status: TrustConditionStatus;
  confidence: number;
  evidenceReferences: string[];
  lastVerifiedAt: string | null;
  freshness: TrustEvidenceFreshness;
  trend: TrustConditionTrend;
  materiality: TrustMateriality;
  knownLimitations: string[];
  summary: string;
  signals?: string[];
  providerIds?: string[];
};

export type ProductionTrustManifestBindings = {
  who: string;
  what: string;
  why: string;
  authority: string;
  tools: string[];
  data: string[];
  destinations: string[];
  runtime: string;
  monitoring: string[];
  model: string;
  policy: string;
  humanControl: string;
  evidenceVersion: string;
};

export type ProductionTrustManifest = {
  manifestVersion: "1.0";
  manifestId: string;
  enterpriseId: string;
  subjectId: string;
  approvedAt: string;
  canonicalTransactionReference: string;
  deploymentGateReference: string;
  bindings: ProductionTrustManifestBindings;
  manifestDigest: string;
};

export type TrustBaseline = ProductionTrustManifest;

export type TrustForecastControlCode =
  | "REQUIRE_STEP_UP_VERIFICATION"
  | "REQUIRE_HUMAN_APPROVAL"
  | "PIN_DESTINATION"
  | "REDUCE_AUTHORITY"
  | "RESTORE_MONITORING"
  | "REVALIDATE_IDENTITY"
  | "REQUALIFY_TOOL"
  | "DISABLE_NEW_CAPABILITY"
  | "HOLD_DEPLOYMENT"
  | "ROTATE_CREDENTIAL"
  | "REFRESH_POLICY_EVIDENCE"
  | "RERUN_DEPLOYMENT_QUALIFICATION"
  | "REVOKE_STALE_CREDENTIAL"
  | "REAUTHORIZE"
  | "NO_ACTION";

export type TrustForecastControlRecommendation = {
  code: TrustForecastControlCode;
  control: PreventativeControlCode;
  intervention: WorkflowIntervention;
  reason: string;
  rank: number;
  disruption: 0 | 1 | 2 | 3;
  targeted: boolean;
  sufficientFor: string[];
};

export type TrustForecastContributor = {
  dimension: TrustConditionDimension;
  status: TrustConditionStatus;
  contribution: number;
  explanation: string;
  evidenceReferences: string[];
};

export type TrustForecastGraphProjection = {
  nodes: Array<{ nodeType: string; externalId: string; domainKey: string; label: string; metadata: Record<string, unknown> }>;
  edges: Array<{ fromNodeType: string; fromExternalId: string; toNodeType: string; toExternalId: string; edgeType: "ASSERTS" | "DERIVED_FROM" | "SUPPORTED" | "CHALLENGED" | "APPLIES_TO" | "TRIGGERED" | "RESULTED_IN" | "CORRELATED_WITH" }>;
};

export type TrustForecastEvaluationInput = {
  enterpriseId: string;
  subject: { type: ForecastSubjectType; id: string };
  horizon: TrustForecastHorizon;
  evaluatedAt: string;
  policyReference: string;
  conditions: TrustConditionInput[];
  authorityIntegrityFindings?: string[];
  approvedManifest?: ProductionTrustManifest | null;
  currentManifest?: ProductionTrustManifest | null;
  previousForecast?: Pick<TrustForecast, "forecastId" | "state" | "evaluatedAt"> | null;
  canonicalTransactionReference?: string | null;
  authorityReference?: string | null;
  actionReference?: string | null;
  outcomeReference?: string | null;
  forecastUpdateReference?: string | null;
  executionOutcomeReferences?: string[];
  trustTwinContext?: TrustTwinForecastContext | null;
};

export type TrustTwinForecastContext = {
  source: "DERIVED_TRUST_TWIN_INPUT";
  trustPressure: {
    value: number;
    level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNKNOWN";
    trend: "RISING" | "FALLING" | "STABLE" | "SPIKING" | "UNKNOWN";
    contributorCodes: string[];
  };
  trustBudget: {
    total: number;
    consumed: number;
    remaining: number;
    status: "HEALTHY" | "CONSTRAINED" | "NEAR_LIMIT" | "EXCEEDED" | "UNKNOWN";
    contextualConstraintCodes: string[];
  };
  consequenceReach: {
    systemCount: number;
    dimensionCount: number;
    level: "LIMITED" | "BOUNDED" | "BROAD" | "EXTENSIVE" | "UNKNOWN";
  };
  advisoryOnly: true;
};

export type TrustForecast = {
  forecastVersion: "1.0";
  forecastId: string;
  label: "EVIDENCE_BASED_TRUST_FORECAST";
  enterpriseId: string;
  subject: TrustForecastEvaluationInput["subject"];
  evaluatedAt: string;
  horizon: TrustForecastHorizon;
  snapshotType: "PRE_ACTION_TRUST_FORECAST" | "PRE_DEPLOYMENT_TRUST_FORECAST" | "CONTINUOUS_TRUST_FORECAST";
  state: TrustForecastState;
  deploymentRecommendation: DeploymentRecommendation;
  actionRecommendation: DeploymentRecommendation;
  trend: TrustConditionTrend;
  confidence: number;
  weightedEvidenceIndex: number;
  primaryContributors: TrustForecastContributor[];
  mitigatingConditions: TrustForecastContributor[];
  requiredControls: TrustForecastControlRecommendation[];
  recommendedControl: TrustForecastControlRecommendation;
  forecastSignals: string[];
  evidenceGaps: string[];
  materialChanges: string[];
  conditionDirection: TrustConditionDirection;
  reauthorizationRequired: boolean;
  conditions: TrustConditionInput[];
  explanation: string[];
  knownLimitations: string[];
  providerNeutralEvidence: Array<{ providerId: string; evidenceType: string; outcome: string; observedAt: string; evidenceDigest: string; metadata: Record<string, unknown> }>;
  graphProjection: TrustForecastGraphProjection;
  replayEvents: Array<{ eventType: string; occurredAt: string; attribution: "CYBER_SENTINELS_INTERPRETATION"; evidenceReferences: string[]; details: Record<string, unknown> }>;
  trustMemoryEvents: Array<{ eventId: string; eventType: string; occurredAt: string; evidenceReferences: string[] }>;
  trustTwinContext: TrustTwinForecastContext | null;
  canonicalDecisionBoundary: {
    decisionAuthority: "CANONICAL_TRUST_FABRIC_ONLY";
    forecastCanAllow: false;
    forecastCanDeny: false;
    mlCanDeny: false;
  };
  mlReadiness: {
    structuredEpisodeEligible: boolean;
    modelUsed: false;
    trainingPerformed: false;
    incidentProbabilityClaimed: false;
    sampleBasis: "DETERMINISTIC_RULES_V1";
  };
  forecastDigest: string;
};

export type TrustBaselineEvaluation = {
  changed: boolean;
  finding: "TRUST_CONDITIONS_CHANGED" | "TRUST_CONDITIONS_UNCHANGED";
  materialChanges: string[];
  action: TrustBaselineAction;
};

export type PreActionTrustContext = {
  enterpriseId: string;
  subject: { type: ForecastSubjectType; id: string };
  evaluatedAt: string;
  policyReference: string;
  actorReference: string;
  authorityReference: string;
  authorityScopeValid: boolean;
  actionReference: string;
  toolReference: string;
  parameterProvenanceReference: string | null;
  runtimeReference: string;
  monitoringCoverage: "covered" | "partial" | "not_observed" | "unknown";
  destinationReference: string;
  humanApproval: "provided" | "not_provided" | "pending" | "not_required";
  consequence: "non_consequential" | "unknown" | "low" | "moderate" | "high" | "critical";
  evidenceReferences: string[];
  evidenceFresh: boolean;
  evidenceComplete: boolean;
  recentChanges?: string[];
  authorityIntegrityFindings?: string[];
  canonicalTransactionReference?: string | null;
};

export type TrustForecastHistoryEntry = {
  historyId: string;
  forecastId: string;
  state: TrustForecastState;
  deploymentRecommendation: DeploymentRecommendation;
  occurredAt: string;
  reason: string;
  evidenceReferences: string[];
  intervention: WorkflowIntervention | null;
  subsequentOutcomeReference: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const referencePattern = /^[A-Za-z0-9_.:@/+\-]{1,300}$/;
const forbiddenSecretKey = /(?:^|_)(?:secret|password|private_key|access_token|refresh_token|credential_value|api_key)(?:$|_)/i;
const secretLikeValue = /(?:bearer\s+[A-Za-z0-9._~+/=-]{16,}|-----BEGIN [A-Z ]+PRIVATE KEY-----)/i;

const dimensionWeights: Record<TrustConditionDimension, number> = {
  IDENTITY_STABILITY: 1.2,
  AUTHORITY_STABILITY: 1.4,
  AUTHORITY_EXPOSURE: 1.4,
  INTENT_ALIGNMENT: 1.3,
  TOOL_EXPOSURE: 1,
  TOOL_PARAMETER_PROVENANCE: 1.4,
  DATA_EXPOSURE: 1.1,
  DESTINATION_EXPOSURE: 1.3,
  RUNTIME_ASSURANCE: 1.2,
  MONITORING_COVERAGE: 1.3,
  HUMAN_OVERSIGHT: 1,
  PROVIDER_CONFIDENCE: 0.8,
  EVIDENCE_FRESHNESS: 1,
  CHANGE_VELOCITY: 0.9,
  MODEL_STATE_INTEGRITY: 1.4,
  MODEL_CHANGE_RISK: 1,
  POLICY_CHANGE_RISK: 1.1,
  PRIVILEGE_CHANGE_RISK: 1.4,
  CONSEQUENCE_EXPOSURE: 1.4,
  TRUST_MEMORY_HISTORY: 0.8,
  AUTHORIZATION_PROPAGATION: 1.5,
  STALE_AUTHORITY_RISK: 1.6,
};

const statusRisk: Record<TrustConditionStatus, number> = {
  STRONG: 0,
  COMPLETE: 0,
  STABLE: 0.08,
  WATCH: 0.32,
  PARTIAL: 0.48,
  ELEVATED: 0.68,
  SEVERE: 1,
  UNKNOWN: 0.5,
};

const materialityMultiplier: Record<TrustMateriality, number> = { LOW: 0.7, MEDIUM: 1, HIGH: 1.2, CRITICAL: 1.4 };
const stateRank: Record<TrustForecastState, number> = { INSUFFICIENT_EVIDENCE: -1, STABLE: 0, WATCH: 1, ELEVATED: 2, SEVERE: 3 };

function assertSafe(value: unknown, path = "input") {
  if (typeof value === "string" && secretLikeValue.test(value)) throw new TypeError(`${path} appears to contain a raw secret.`);
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenSecretKey.test(key)) throw new TypeError(`${path}.${key} is not permitted; store a reference or digest instead.`);
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

function unique(values: string[]) { return [...new Set(values.filter(Boolean))].sort(); }
function round(value: number) { return Math.round(value * 1000) / 1000; }

function validateManifest(input: Omit<ProductionTrustManifest, "manifestVersion" | "manifestId" | "manifestDigest">) {
  if (!uuidPattern.test(input.enterpriseId)) throw new TypeError("Production Trust Manifest requires a valid enterprise tenant.");
  if (!referencePattern.test(input.subjectId) || !referencePattern.test(input.canonicalTransactionReference) || !referencePattern.test(input.deploymentGateReference)) throw new TypeError("Production Trust Manifest references are invalid.");
  if (!Number.isFinite(Date.parse(input.approvedAt))) throw new TypeError("Production Trust Manifest approval timestamp is invalid.");
  assertSafe(input);
}

export function createProductionTrustManifest(input: Omit<ProductionTrustManifest, "manifestVersion" | "manifestId" | "manifestDigest">): ProductionTrustManifest {
  validateManifest(input);
  const normalized = {
    ...structuredClone(input),
    bindings: {
      ...structuredClone(input.bindings),
      tools: unique(input.bindings.tools),
      data: unique(input.bindings.data),
      destinations: unique(input.bindings.destinations),
      monitoring: unique(input.bindings.monitoring),
    },
  };
  const manifestDigest = hashCanonical(normalized);
  return deepFreeze({ ...normalized, manifestVersion: "1.0", manifestId: deterministicUuid({ manifestDigest }), manifestDigest }) as ProductionTrustManifest;
}

export function createTrustBaseline(input: Omit<TrustBaseline, "manifestVersion" | "manifestId" | "manifestDigest">): TrustBaseline {
  return createProductionTrustManifest(input);
}

const manifestChangeCodes: Record<keyof ProductionTrustManifestBindings, string> = {
  who: "IDENTITY_CHANGED",
  what: "PURPOSE_SCOPE_CHANGED",
  why: "PURPOSE_CHANGED",
  authority: "AUTHORITY_CHANGED",
  tools: "TOOLSET_CHANGED",
  data: "DATA_SOURCE_CHANGED",
  destinations: "DESTINATION_CHANGED",
  runtime: "RUNTIME_CHANGED",
  monitoring: "MONITORING_CHANGED",
  model: "MODEL_VERSION_CHANGED",
  policy: "POLICY_CHANGED",
  humanControl: "HUMAN_APPROVAL_POLICY_CHANGED",
  evidenceVersion: "EVIDENCE_VERSION_CHANGED",
};

export function compareProductionTrustManifests(approved?: ProductionTrustManifest | null, current?: ProductionTrustManifest | null) {
  if (!approved && !current) return [];
  if (!approved || !current) return ["PRODUCTION_TRUST_MANIFEST_UNAVAILABLE"];
  if (approved.enterpriseId !== current.enterpriseId || approved.subjectId !== current.subjectId) throw new Error("PRODUCTION_TRUST_MANIFEST_TENANT_OR_SUBJECT_MISMATCH");
  return (Object.keys(manifestChangeCodes) as Array<keyof ProductionTrustManifestBindings>)
    .filter((key) => hashCanonical(approved.bindings[key]) !== hashCanonical(current.bindings[key]))
    .map((key) => manifestChangeCodes[key]);
}

const reauthorizationChanges = new Set(["AUTHORITY_CHANGED", "PRIVILEGE_CHANGED", "POLICY_CHANGED", "HUMAN_APPROVAL_POLICY_CHANGED"]);

export function evaluateTrustBaseline(approved?: ProductionTrustManifest | null, current?: ProductionTrustManifest | null): TrustBaselineEvaluation {
  const materialChanges = compareProductionTrustManifests(approved, current);
  const action: TrustBaselineAction = !materialChanges.length
    ? "NO_ACTION_REQUIRED"
    : materialChanges.some((change) => reauthorizationChanges.has(change))
      ? "REAUTHORIZATION_REQUIRED"
      : "REQUALIFICATION_REQUIRED";
  return deepFreeze({
    changed: materialChanges.length > 0,
    finding: materialChanges.length ? "TRUST_CONDITIONS_CHANGED" : "TRUST_CONDITIONS_UNCHANGED",
    materialChanges,
    action,
  }) as TrustBaselineEvaluation;
}

function normalizeCondition(condition: TrustConditionInput, evaluatedAt: string): TrustConditionInput {
  if (!TRUST_CONDITION_DIMENSIONS.includes(condition.dimension) || !TRUST_CONDITION_TRENDS.includes(condition.trend) || condition.confidence < 0 || condition.confidence > 1 || !Number.isFinite(condition.confidence)) throw new TypeError("Trust condition is invalid.");
  if (condition.lastVerifiedAt && (!Number.isFinite(Date.parse(condition.lastVerifiedAt)) || Date.parse(condition.lastVerifiedAt) > Date.parse(evaluatedAt))) throw new TypeError("Trust condition verification timestamp is invalid.");
  assertSafe(condition);
  return {
    ...structuredClone(condition),
    evidenceReferences: unique(condition.evidenceReferences),
    knownLimitations: unique(condition.knownLimitations),
    signals: unique(condition.signals ?? []),
    providerIds: unique(condition.providerIds ?? []),
  };
}

function stateFromEvidence(index: number, insufficient: boolean, severeFloor: boolean, elevatedFloor: boolean): TrustForecastState {
  if (insufficient) return "INSUFFICIENT_EVIDENCE";
  if (severeFloor || index >= 0.76) return "SEVERE";
  if (elevatedFloor || index >= 0.48) return "ELEVATED";
  if (index >= 0.2) return "WATCH";
  return "STABLE";
}

function recommendationFor(state: TrustForecastState): DeploymentRecommendation {
  if (state === "STABLE") return "QUALIFY";
  if (state === "WATCH") return "QUALIFY_WITH_CONTROLS";
  if (state === "INSUFFICIENT_EVIDENCE") return "REVIEW_REQUIRED";
  if (state === "ELEVATED") return "HOLD";
  return "DO_NOT_RELEASE";
}

function overallTrend(conditions: TrustConditionInput[]): TrustConditionTrend {
  if (conditions.some((item) => item.trend === "RAPIDLY_DETERIORATING")) return "RAPIDLY_DETERIORATING";
  const deteriorating = conditions.filter((item) => item.trend === "DETERIORATING").length;
  const improving = conditions.filter((item) => item.trend === "IMPROVING").length;
  if (deteriorating > improving) return "DETERIORATING";
  if (improving > deteriorating) return "IMPROVING";
  return conditions.some((item) => item.trend === "UNCHANGED") ? "UNCHANGED" : "UNKNOWN";
}

function controlsFor(conditions: TrustConditionInput[], changes: string[], findings: string[]): TrustForecastControlRecommendation[] {
  const controls = new Map<TrustForecastControlCode, TrustForecastControlRecommendation>();
  const add = (code: TrustForecastControlCode, control: PreventativeControlCode, intervention: WorkflowIntervention, disruption: 0 | 1 | 2 | 3, reason: string, sufficientFor: string[]) => controls.set(code, { code, control, intervention, disruption, targeted: true, reason, sufficientFor: unique(sufficientFor), rank: 0 });
  const signals = new Set([...findings, ...changes, ...conditions.flatMap((item) => item.signals ?? [])]);
  if (signals.has("MODEL_CONTROLLED_SECURITY_BOUNDARY") || signals.has("DESTINATION_CHANGED") || signals.has("DESTINATION_BINDING_LOST") || signals.has("DESTINATION_AUTHORITY_MISMATCH")) add("PIN_DESTINATION", "pin_destination", "PAUSE", 1, "Bind the destination outside model control before qualification.", ["MODEL_CONTROLLED_SECURITY_BOUNDARY", "DESTINATION_CHANGED", "DESTINATION_BINDING_LOST", "DESTINATION_AUTHORITY_MISMATCH"]);
  if (signals.has("STALE_AUTHORITY_STILL_ACTIVE") || signals.has("STALE_AUTHORITY_POSSIBLE")) add("REVOKE_STALE_CREDENTIAL", "revoke_stale_credential", "PAUSE", 1, "Revoke stale credentials and independently confirm downstream rejection.", ["STALE_AUTHORITY_STILL_ACTIVE", "STALE_AUTHORITY_POSSIBLE"]);
  if (signals.has("MONITORING_COVERAGE_GAP") || signals.has("MONITORING_CHANGED")) add("RESTORE_MONITORING", "restore_monitoring", "PAUSE", 1, "Restore and verify expected observation paths.", ["MONITORING_COVERAGE_GAP", "MONITORING_CHANGED"]);
  if (signals.has("STEP_UP_VERIFICATION_REQUIRED") || conditions.some((condition) => ["STALE", "EXPIRED"].includes(condition.freshness))) add("REQUIRE_STEP_UP_VERIFICATION", "step_up_verification", "STEP_UP_VERIFICATION", 1, "Obtain fresh verification before relying on stale decision-time evidence.", ["STEP_UP_VERIFICATION_REQUIRED", "EVIDENCE_STALE"]);
  if (signals.has("IDENTITY_DISCONTINUITY") || signals.has("IDENTITY_CHANGED")) add("REVALIDATE_IDENTITY", "revalidate_identity", "STEP_UP_VERIFICATION", 1, "Re-establish identity continuity before release.", ["IDENTITY_DISCONTINUITY", "IDENTITY_CHANGED"]);
  if (signals.has("SIGNED_INTENT_MISMATCH") || signals.has("HUMAN_APPROVAL_POLICY_CHANGED")) add("REQUIRE_HUMAN_APPROVAL", "human_approval_required", "REVIEW", 1, "Obtain fresh signed human approval for the material state.", ["SIGNED_INTENT_MISMATCH", "HUMAN_APPROVAL_POLICY_CHANGED"]);
  if (signals.has("TOOLSET_CHANGED") || signals.has("TOOL_SECURITY_SCHEMA_CHANGE")) add("REQUALIFY_TOOL", "requalify_tool", "REVIEW", 1, "Requalify the changed tool and its security-critical schema.", ["TOOLSET_CHANGED", "TOOL_SECURITY_SCHEMA_CHANGE"]);
  if (signals.has("AUTHORITY_PARAMETER_DRIFT") || signals.has("UNRESOLVED_PARAMETER_PROVENANCE")) add("REQUALIFY_TOOL", "requalify_tool", "REVIEW", 1, "Restore or verify the authority contract for security-critical tool parameters.", ["AUTHORITY_PARAMETER_DRIFT", "UNRESOLVED_PARAMETER_PROVENANCE"]);
  if (["MODEL_STATE_DRIFT", "RUNTIME_MODEL_ARTIFACT_MISMATCH", "MODEL_STATE_CHANGE_ORIGIN_UNRESOLVED", "MODEL_TEMPLATE_CHANGED", "MODEL_ENDPOINT_CHANGED", "MODEL_RUNTIME_AUTH_CHANGED", "MODEL_ROUTER_UNEXPECTED_SWITCH", "VALIDATION_REASSESSMENT_REQUIRED", "REVALIDATION_REQUIRED"].some((signal) => signals.has(signal))) add("RERUN_DEPLOYMENT_QUALIFICATION", "hold_deployment", "REVIEW", 2, "Re-run the existing deployment qualification with current model-state and validation evidence.", ["MODEL_STATE_DRIFT", "REVALIDATION_REQUIRED"]);
  if (signals.has("UNDECLARED_TOOL") || signals.has("TOOL_PERMISSION_INCREASED")) add("DISABLE_NEW_CAPABILITY", "disable_capability", "PAUSE", 2, "Disable the undeclared or expanded capability until it is qualified.", ["UNDECLARED_TOOL", "TOOL_PERMISSION_INCREASED"]);
  if (signals.has("AUTHORITY_CHANGED") || signals.has("PRIVILEGE_INCREASED") || signals.has("AUTHORITY_BOUNDARY_PRESSURE") || signals.has("RUNTIME_AUTHORITY_MISMATCH") || signals.has("AUTHORITY_PROPAGATION_UNRESOLVED")) add("REDUCE_AUTHORITY", "reduce_authority", "PAUSE", 2, "Reduce authority to the approved baseline or obtain reauthorization.", ["AUTHORITY_CHANGED", "PRIVILEGE_INCREASED", "AUTHORITY_BOUNDARY_PRESSURE", "RUNTIME_AUTHORITY_MISMATCH", "AUTHORITY_PROPAGATION_UNRESOLVED"]);
  if (signals.has("POLICY_CHANGED") || signals.has("POLICY_EVIDENCE_STALE")) add("REFRESH_POLICY_EVIDENCE", "refresh_policy_evidence", "REVIEW", 1, "Refresh policy-version evidence before qualification.", ["POLICY_CHANGED", "POLICY_EVIDENCE_STALE"]);
  if (changes.some((change) => reauthorizationChanges.has(change))) add("REAUTHORIZE", "reauthorize", "REVIEW", 2, "Obtain authorization for the materially changed authority or policy binding.", changes);
  if (changes.length) add("RERUN_DEPLOYMENT_QUALIFICATION", "hold_deployment", "REVIEW", 2, "Re-run the existing deployment qualification for material changes.", changes);
  return [...controls.values()]
    .sort((a, b) => a.disruption - b.disruption || Number(b.targeted) - Number(a.targeted) || a.code.localeCompare(b.code))
    .map((control, index) => ({ ...control, rank: index + 1 }));
}

function graphProjection(input: TrustForecastEvaluationInput, forecastId: string, conditions: TrustConditionInput[], contributors: TrustForecastContributor[], recommendation: DeploymentRecommendation, controls: TrustForecastControlRecommendation[]): TrustForecastGraphProjection {
  const authorityId = input.authorityReference ?? `${forecastId}:authority`;
  const actionId = input.actionReference ?? `${forecastId}:action`;
  const outcomeId = input.outcomeReference ?? `${forecastId}:outcome:pending`;
  const updateId = input.forecastUpdateReference ?? `${forecastId}:update`;
  const contributorItems = contributors.length ? contributors : [{ dimension: "TRUST_MEMORY_HISTORY" as const, status: "STABLE" as const, contribution: 0, explanation: "No adverse primary contributor.", evidenceReferences: [] }];
  const evidenceReferences = unique(conditions.flatMap((condition) => condition.evidenceReferences));
  const nodes: TrustForecastGraphProjection["nodes"] = [
    { nodeType: "FORECAST", externalId: forecastId, domainKey: "GOVERNANCE", label: "Evidence-based Trust Forecast", metadata: { horizon: input.horizon } },
    { nodeType: "RECOMMENDATION", externalId: `${forecastId}:recommendation`, domainKey: "GOVERNANCE", label: recommendation, metadata: {} },
    { nodeType: "AUTHORITY", externalId: authorityId, domainKey: "AUTHORITY", label: "Authority at forecast time", metadata: {} },
    { nodeType: "ACTION", externalId: actionId, domainKey: "ACTION", label: "Consequential action", metadata: { horizon: input.horizon } },
    { nodeType: "OUTCOME", externalId: outcomeId, domainKey: "OUTCOME", label: input.outcomeReference ? "Observed outcome" : "Outcome pending", metadata: { observed: Boolean(input.outcomeReference) } },
    { nodeType: "FORECAST_UPDATE", externalId: updateId, domainKey: "GOVERNANCE", label: "Forecast update", metadata: { currentForecastId: forecastId } },
  ];
  const edges: TrustForecastGraphProjection["edges"] = [];
  for (const condition of conditions) {
    const conditionId = `${forecastId}:condition:${condition.dimension}`;
    nodes.push({ nodeType: "TRUST_CONDITION", externalId: conditionId, domainKey: "GOVERNANCE", label: condition.dimension, metadata: { status: condition.status, confidence: condition.confidence, freshness: condition.freshness, trend: condition.trend } });
    edges.push({ fromNodeType: "TRUST_CONDITION", fromExternalId: conditionId, toNodeType: "FORECAST", toExternalId: forecastId, edgeType: contributors.some((item) => item.dimension === condition.dimension) ? "CHALLENGED" : "SUPPORTED" });
  }
  for (const [index, contributor] of contributorItems.entries()) {
    const contributorId = `${forecastId}:contributor:${index}:${contributor.dimension}`;
    nodes.push({ nodeType: "CONTRIBUTOR", externalId: contributorId, domainKey: "GOVERNANCE", label: contributor.dimension, metadata: { contribution: contributor.contribution, explanation: contributor.explanation } });
    edges.push({ fromNodeType: "FORECAST", fromExternalId: forecastId, toNodeType: "CONTRIBUTOR", toExternalId: contributorId, edgeType: "DERIVED_FROM" });
    edges.push({ fromNodeType: "CONTRIBUTOR", fromExternalId: contributorId, toNodeType: "AUTHORITY", toExternalId: authorityId, edgeType: "CORRELATED_WITH" });
  }
  const graphEvidence = evidenceReferences.length ? evidenceReferences : [`${forecastId}:evidence:unavailable`];
  for (const reference of graphEvidence) {
    nodes.push({ nodeType: "EVIDENCE", externalId: reference, domainKey: "EVIDENCE", label: reference, metadata: { available: evidenceReferences.includes(reference) } });
    edges.push({ fromNodeType: "AUTHORITY", fromExternalId: authorityId, toNodeType: "EVIDENCE", toExternalId: reference, edgeType: "DERIVED_FROM" });
    edges.push({ fromNodeType: "EVIDENCE", fromExternalId: reference, toNodeType: "RECOMMENDATION", toExternalId: `${forecastId}:recommendation`, edgeType: "SUPPORTED" });
  }
  const interventionIds: string[] = [];
  for (const control of controls) {
    const interventionId = `${forecastId}:intervention:${control.code}`;
    interventionIds.push(interventionId);
    nodes.push({ nodeType: "INTERVENTION", externalId: interventionId, domainKey: "GOVERNANCE", label: control.code, metadata: { existingIntervention: control.intervention } });
    edges.push({ fromNodeType: "RECOMMENDATION", fromExternalId: `${forecastId}:recommendation`, toNodeType: "INTERVENTION", toExternalId: interventionId, edgeType: "TRIGGERED" });
    edges.push({ fromNodeType: "INTERVENTION", fromExternalId: interventionId, toNodeType: "ACTION", toExternalId: actionId, edgeType: "APPLIES_TO" });
  }
  if (!interventionIds.length) edges.push({ fromNodeType: "RECOMMENDATION", fromExternalId: `${forecastId}:recommendation`, toNodeType: "ACTION", toExternalId: actionId, edgeType: "APPLIES_TO" });
  edges.push({ fromNodeType: "ACTION", fromExternalId: actionId, toNodeType: "OUTCOME", toExternalId: outcomeId, edgeType: "RESULTED_IN" });
  edges.push({ fromNodeType: "OUTCOME", fromExternalId: outcomeId, toNodeType: "FORECAST_UPDATE", toExternalId: updateId, edgeType: "RESULTED_IN" });
  return { nodes, edges };
}

export function evaluateTrustForecast(input: TrustForecastEvaluationInput): TrustForecast {
  assertSafe(input);
  if (!uuidPattern.test(input.enterpriseId)) throw new TypeError("Trust Forecast requires a valid enterprise tenant.");
  if (!FORECAST_SUBJECT_TYPES.includes(input.subject.type) || !referencePattern.test(input.subject.id) || !referencePattern.test(input.policyReference)) throw new TypeError("Trust Forecast subject or policy reference is invalid.");
  if (!Number.isFinite(Date.parse(input.evaluatedAt))) throw new TypeError("Trust Forecast evaluation timestamp is invalid.");
  if (input.approvedManifest && input.approvedManifest.enterpriseId !== input.enterpriseId) throw new Error("TRUST_FORECAST_TENANT_SCOPE_MISMATCH");
  if (input.currentManifest && input.currentManifest.enterpriseId !== input.enterpriseId) throw new Error("TRUST_FORECAST_TENANT_SCOPE_MISMATCH");
  const trustTwinContext = input.trustTwinContext ? structuredClone(input.trustTwinContext) : null;
  if (trustTwinContext && (
    trustTwinContext.source !== "DERIVED_TRUST_TWIN_INPUT"
    || trustTwinContext.advisoryOnly !== true
    || !Number.isFinite(trustTwinContext.trustPressure.value)
    || trustTwinContext.trustPressure.value < 0
    || trustTwinContext.trustPressure.value > 100
    || !Number.isFinite(trustTwinContext.trustBudget.total)
    || !Number.isFinite(trustTwinContext.trustBudget.consumed)
    || !Number.isFinite(trustTwinContext.trustBudget.remaining)
    || trustTwinContext.trustBudget.total < 0
    || trustTwinContext.trustBudget.total > 100
    || trustTwinContext.trustBudget.consumed < 0
    || trustTwinContext.trustBudget.consumed > 100
    || trustTwinContext.trustBudget.remaining < 0
    || trustTwinContext.trustBudget.remaining > 100
  )) throw new TypeError("Trust Twin forecast context is invalid.");
  const conditions = input.conditions.map((condition) => normalizeCondition(condition, input.evaluatedAt));
  if (new Set(conditions.map((item) => item.dimension)).size !== conditions.length) throw new TypeError("Trust Forecast condition dimensions must be unique.");
  const baselineEvaluation = evaluateTrustBaseline(input.approvedManifest, input.currentManifest);
  const materialChanges = baselineEvaluation.materialChanges;
  const findings = unique(input.authorityIntegrityFindings ?? []);
  const conditionSignals = unique(conditions.flatMap((condition) => condition.signals ?? []));
  const authorityPressureSignals = new Set(["AUTHORITY_CHANGED", "PRIVILEGE_INCREASED", "AUTHORITY_SOURCE_CHANGED", "DELEGATED_PRINCIPAL_LOST", "RUNTIME_SCOPE_WIDENED", "STALE_AUTHORITY_STILL_ACTIVE", "STALE_AUTHORITY_POSSIBLE", "AUTHORITY_PARAMETER_DRIFT", "RUNTIME_AUTHORITY_MISMATCH", "DESTINATION_AUTHORITY_MISMATCH", "AUTHORITY_PROPAGATION_UNRESOLVED"]);
  const forecastSignals = unique([
    ...findings,
    ...conditionSignals,
    ...materialChanges,
    ...([...findings, ...conditionSignals, ...materialChanges].some((signal) => authorityPressureSignals.has(signal)) ? ["AUTHORITY_BOUNDARY_PRESSURE"] : []),
    ...(trustTwinContext ? [
      `TRUST_PRESSURE_${trustTwinContext.trustPressure.level}`,
      `TRUST_BUDGET_${trustTwinContext.trustBudget.status}`,
      ...trustTwinContext.trustPressure.contributorCodes,
      ...trustTwinContext.trustBudget.contextualConstraintCodes,
    ] : []),
  ]);
  const calculations = conditions.map((condition) => {
    const weight = dimensionWeights[condition.dimension] * materialityMultiplier[condition.materiality];
    const freshnessPenalty = ["STALE", "EXPIRED", "UNAVAILABLE"].includes(condition.freshness) ? 0.15 : condition.freshness === "AGING" ? 0.05 : 0;
    const risk = Math.min(1, statusRisk[condition.status] + freshnessPenalty);
    return { condition, weight, contribution: risk * weight * Math.max(0.2, condition.confidence) };
  });
  const totalWeight = calculations.reduce((sum, item) => sum + item.weight, 0);
  const weightedEvidenceIndex = totalWeight ? round(calculations.reduce((sum, item) => sum + item.contribution, 0) / totalWeight) : 0;
  const confidence = totalWeight ? round(calculations.reduce((sum, item) => sum + item.condition.confidence * item.weight, 0) / totalWeight) : 0;
  const evidenceGaps = unique(conditions.flatMap((condition) => [
    ...(!condition.evidenceReferences.length ? [`${condition.dimension}:EVIDENCE_MISSING`] : []),
    ...(["EXPIRED", "UNAVAILABLE"].includes(condition.freshness) ? [`${condition.dimension}:EVIDENCE_${condition.freshness}`] : []),
    ...condition.knownLimitations,
  ]));
  const insufficient = !conditions.length || conditions.every((item) => item.status === "UNKNOWN") || confidence < 0.25 || conditions.every((item) => !item.evidenceReferences.length);
  const severeFloor = findings.includes("STALE_AUTHORITY_STILL_ACTIVE")
    || conditions.some((item) => item.dimension === "STALE_AUTHORITY_RISK" && item.status === "SEVERE")
    || (trustTwinContext?.trustPressure.level === "CRITICAL" && trustTwinContext.trustBudget.status === "EXCEEDED");
  const elevatedSignals = new Set(["MODEL_CONTROLLED_SECURITY_BOUNDARY", "AUTHORITY_PARAMETER_DRIFT", "UNRESOLVED_PARAMETER_PROVENANCE", "DESTINATION_BINDING_LOST", "RUNTIME_AUTHORITY_MISMATCH", "DESTINATION_AUTHORITY_MISMATCH", "AUTHORITY_PROPAGATION_UNRESOLVED", "MONITORING_COVERAGE_GAP", "IDENTITY_DISCONTINUITY", "SIGNED_INTENT_MISMATCH", "RUNTIME_MODEL_ARTIFACT_MISMATCH", "MODEL_RUNTIME_AUTH_CHANGED", "MODEL_NETWORK_EXPOSURE_CHANGED", "MODEL_ROUTER_UNEXPECTED_SWITCH"]);
  const elevatedFloor = findings.some((finding) => elevatedSignals.has(finding))
    || conditions.some((item) => item.status === "ELEVATED" && ["HIGH", "CRITICAL"].includes(item.materiality))
    || Boolean(trustTwinContext && (["HIGH", "CRITICAL"].includes(trustTwinContext.trustPressure.level) || ["NEAR_LIMIT", "EXCEEDED"].includes(trustTwinContext.trustBudget.status)));
  const state = stateFromEvidence(weightedEvidenceIndex, insufficient, severeFloor, elevatedFloor);
  const deploymentRecommendation = recommendationFor(state);
  const primaryContributors = calculations
    .filter((item) => statusRisk[item.condition.status] >= statusRisk.WATCH)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 6)
    .map((item) => ({ dimension: item.condition.dimension, status: item.condition.status, contribution: round(item.contribution), explanation: item.condition.summary, evidenceReferences: item.condition.evidenceReferences }));
  const mitigatingConditions = calculations
    .filter((item) => ["STRONG", "COMPLETE", "STABLE"].includes(item.condition.status) && item.condition.confidence >= 0.6)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)
    .map((item) => ({ dimension: item.condition.dimension, status: item.condition.status, contribution: round(item.contribution), explanation: item.condition.summary, evidenceReferences: item.condition.evidenceReferences }));
  const requiredControls = controlsFor(conditions, materialChanges, forecastSignals);
  if (["ELEVATED", "SEVERE"].includes(state) && !requiredControls.some((item) => item.code === "HOLD_DEPLOYMENT")) requiredControls.push({ code: "HOLD_DEPLOYMENT", control: "hold_deployment", intervention: "PAUSE", reason: "Hold release while material trust conditions are unresolved.", rank: requiredControls.length + 1, disruption: 2, targeted: false, sufficientFor: [state] });
  if (!requiredControls.length) requiredControls.push({ code: "NO_ACTION", control: "no_action", intervention: "MONITOR", reason: "Current evidence supports the approved baseline; no preventative intervention is required.", rank: 1, disruption: 0, targeted: true, sufficientFor: ["STABLE"] });
  const rankedControls = requiredControls
    .sort((a, b) => a.disruption - b.disruption || Number(b.targeted) - Number(a.targeted) || a.rank - b.rank)
    .map((control, index) => ({ ...control, rank: index + 1 }));
  const forecastId = deterministicUuid({ enterpriseId: input.enterpriseId, subject: input.subject, horizon: input.horizon, evaluatedAt: input.evaluatedAt, conditionDigest: hashCanonical(conditions), manifestDigest: input.currentManifest?.manifestDigest ?? null, trustTwinContextDigest: trustTwinContext ? hashCanonical(trustTwinContext) : null });
  const conditionDirection: TrustConditionDirection = !input.previousForecast || input.previousForecast.state === "INSUFFICIENT_EVIDENCE" || state === "INSUFFICIENT_EVIDENCE"
    ? "TRUST_CONDITIONS_UNKNOWN"
    : stateRank[state] > stateRank[input.previousForecast.state]
      ? "TRUST_CONDITIONS_DETERIORATED"
      : stateRank[state] < stateRank[input.previousForecast.state]
        ? "TRUST_CONDITIONS_IMPROVED"
        : "TRUST_CONDITIONS_UNCHANGED";
  const allEvidenceReferences = unique([...conditions.flatMap((item) => item.evidenceReferences), ...(input.executionOutcomeReferences ?? [])]);
  const graph = graphProjection(input, forecastId, conditions, primaryContributors, deploymentRecommendation, rankedControls);
  const replayEvents = [
    { eventType: "TRUST_FORECAST_EVALUATED", occurredAt: input.evaluatedAt, attribution: "CYBER_SENTINELS_INTERPRETATION" as const, evidenceReferences: allEvidenceReferences, details: { forecastId, state, deploymentRecommendation, horizon: input.horizon, trustTwinContextApplied: Boolean(trustTwinContext) } },
    ...(input.previousForecast && input.previousForecast.state !== state ? [{ eventType: "TRUST_FORECAST_CHANGED", occurredAt: input.evaluatedAt, attribution: "CYBER_SENTINELS_INTERPRETATION" as const, evidenceReferences: allEvidenceReferences, details: { from: input.previousForecast.state, to: state, direction: conditionDirection } }] : []),
    ...rankedControls.filter((control) => control.control !== "no_action").map((control) => ({ eventType: "TRUST_FORECAST_CONTROL_RECOMMENDED", occurredAt: input.evaluatedAt, attribution: "CYBER_SENTINELS_INTERPRETATION" as const, evidenceReferences: allEvidenceReferences, details: { code: control.code, control: control.control, rank: control.rank, intervention: control.intervention } })),
  ];
  const materialMemoryTypes = [
    ...(state === "ELEVATED" ? ["FORECAST_ENTERED_ELEVATED"] : []),
    ...(state === "SEVERE" ? ["FORECAST_ENTERED_SEVERE"] : []),
    ...(deploymentRecommendation === "HOLD" || deploymentRecommendation === "DO_NOT_RELEASE" ? ["DEPLOYMENT_HELD"] : []),
    ...(conditionDirection === "TRUST_CONDITIONS_IMPROVED" ? ["TRUST_CONDITIONS_IMPROVED"] : []),
    ...(state === "STABLE" && input.previousForecast && input.previousForecast.state !== "STABLE" ? ["TRUST_FORECAST_CLEARED"] : []),
  ];
  const trustMemoryEvents = unique(materialMemoryTypes).map((eventType) => ({ eventId: hashCanonical([forecastId, eventType]), eventType, occurredAt: input.evaluatedAt, evidenceReferences: allEvidenceReferences }));
  const core = {
    forecastVersion: "1.0" as const,
    forecastId,
    label: "EVIDENCE_BASED_TRUST_FORECAST" as const,
    enterpriseId: input.enterpriseId,
    subject: structuredClone(input.subject),
    evaluatedAt: input.evaluatedAt,
    horizon: input.horizon,
    snapshotType: input.horizon === "PRE_DEPLOYMENT" || input.horizon === "DEPLOYMENT" ? "PRE_DEPLOYMENT_TRUST_FORECAST" as const : input.horizon === "NEXT_CONSEQUENTIAL_ACTION" ? "PRE_ACTION_TRUST_FORECAST" as const : "CONTINUOUS_TRUST_FORECAST" as const,
    state,
    deploymentRecommendation,
    actionRecommendation: deploymentRecommendation,
    trend: overallTrend(conditions),
    confidence,
    weightedEvidenceIndex,
    primaryContributors,
    mitigatingConditions,
    requiredControls: rankedControls,
    recommendedControl: rankedControls[0],
    forecastSignals,
    evidenceGaps,
    materialChanges,
    conditionDirection,
    reauthorizationRequired: baselineEvaluation.action === "REAUTHORIZATION_REQUIRED",
    conditions,
    explanation: [
      `Deterministic rules evaluated ${conditions.length} explicit trust condition(s) within the ${input.horizon} horizon.`,
      `The forecast is ${state}; the existing deployment lifecycle recommendation is ${deploymentRecommendation}.`,
      ...(trustTwinContext ? [`The derived Trust Twin supplied pressure ${trustTwinContext.trustPressure.value} (${trustTwinContext.trustPressure.level}) and contextual budget ${trustTwinContext.trustBudget.remaining}/${trustTwinContext.trustBudget.total} (${trustTwinContext.trustBudget.status}) as advisory forecast inputs.`] : []),
      ...(materialChanges.length ? [`${materialChanges.length} material change(s) differ from the approved Production Trust Manifest.`] : []),
      "This forecast is evidence and recommendation only; the canonical Trust Fabric retains ALLOW / REVIEW / DENY authority.",
    ],
    knownLimitations: unique([...conditions.flatMap((item) => item.knownLimitations), "V1 uses deterministic evidence rules; no machine-learning model or incident probability is used.", ...(trustTwinContext ? ["Trust Pressure and Trust Budget are normalized contextual heuristics, not actuarial or exact risk measurements."] : [])]),
    providerNeutralEvidence: conditions.map((condition) => ({
      providerId: condition.providerIds?.[0] ?? "cyber_sentinels_trust_forecast",
      evidenceType: `TRUST_CONDITION_${condition.dimension}`,
      outcome: condition.status,
      observedAt: condition.lastVerifiedAt ?? input.evaluatedAt,
      evidenceDigest: hashCanonical(condition),
      metadata: { forecastId, confidence: condition.confidence, freshness: condition.freshness, trend: condition.trend, evidenceReferences: condition.evidenceReferences },
    })),
    graphProjection: graph,
    replayEvents,
    trustMemoryEvents,
    trustTwinContext,
    canonicalDecisionBoundary: { decisionAuthority: "CANONICAL_TRUST_FABRIC_ONLY" as const, forecastCanAllow: false as const, forecastCanDeny: false as const, mlCanDeny: false as const },
    mlReadiness: { structuredEpisodeEligible: conditions.length > 0 && allEvidenceReferences.length > 0, modelUsed: false as const, trainingPerformed: false as const, incidentProbabilityClaimed: false as const, sampleBasis: "DETERMINISTIC_RULES_V1" as const },
  };
  return deepFreeze({ ...core, forecastDigest: hashCanonical(core) }) as TrustForecast;
}

export function createPreActionTrustForecastInput(context: PreActionTrustContext): TrustForecastEvaluationInput {
  assertSafe(context);
  const evidenceReferences = unique(context.evidenceReferences);
  const evidence = (suffix: string) => evidenceReferences.length ? evidenceReferences : [`pre-action:${context.actionReference}:${suffix}`];
  const common = (dimension: TrustConditionDimension, status: TrustConditionStatus, summary: string, options?: Partial<TrustConditionInput>): TrustConditionInput => ({
    dimension,
    status,
    confidence: context.evidenceComplete ? 0.9 : 0.62,
    evidenceReferences: evidence(dimension.toLowerCase()),
    lastVerifiedAt: context.evaluatedAt,
    freshness: context.evidenceFresh ? "CURRENT" : "STALE",
    trend: "UNCHANGED",
    materiality: "HIGH",
    knownLimitations: [],
    summary,
    signals: [],
    providerIds: ["canonical_trust_fabric"],
    ...options,
  });
  const findings = unique([
    ...(context.authorityIntegrityFindings ?? []),
    ...(context.authorityScopeValid ? [] : ["AUTHORITY_BOUNDARY_PRESSURE"]),
    ...(context.monitoringCoverage === "not_observed" ? ["MONITORING_COVERAGE_GAP"] : []),
  ]);
  const staleAuthority = findings.includes("STALE_AUTHORITY_STILL_ACTIVE");
  const staleAuthorityPossible = findings.includes("STALE_AUTHORITY_POSSIBLE");
  const propagationUnresolved = findings.some((item) => ["AUTHORITY_PROPAGATION_UNRESOLVED", "PROPAGATION_PENDING", "PARTIAL_PROPAGATION"].includes(item));
  const parameterBoundaryWeak = findings.some((item) => ["MODEL_CONTROLLED_SECURITY_BOUNDARY", "AUTHORITY_PARAMETER_DRIFT", "UNRESOLVED_PARAMETER_PROVENANCE", "PROVIDER_CONFLICT"].includes(item));
  const destinationBoundaryWeak = findings.some((item) => ["MODEL_CONTROLLED_SECURITY_BOUNDARY", "DESTINATION_BINDING_LOST", "DESTINATION_AUTHORITY_MISMATCH"].includes(item));
  const runtimeAuthorityWeak = findings.some((item) => ["RUNTIME_AUTHORITY_MISMATCH", "AUTHORITY_PROPAGATION_UNRESOLVED"].includes(item));
  const conditions: TrustConditionInput[] = [
    common("IDENTITY_STABILITY", "STRONG", `Identity and accountable subject were resolved for ${context.actorReference}.`, { materiality: "CRITICAL" }),
    common("AUTHORITY_STABILITY", context.authorityScopeValid ? "STABLE" : "SEVERE", context.authorityScopeValid ? "Requested action is within the resolved authority contract." : "Requested action exceeds the resolved authority contract.", { trend: context.authorityScopeValid ? "UNCHANGED" : "RAPIDLY_DETERIORATING", materiality: "CRITICAL", signals: context.authorityScopeValid ? [] : ["AUTHORITY_BOUNDARY_PRESSURE"] }),
    common("AUTHORITY_EXPOSURE", ["high", "critical"].includes(context.consequence) ? "WATCH" : "STABLE", `Authority exposure is evaluated for ${context.consequence} consequence.`, { materiality: "CRITICAL" }),
    common("INTENT_ALIGNMENT", context.humanApproval === "provided" ? "STRONG" : context.humanApproval === "not_required" ? "STABLE" : "WATCH", `Human-control state is ${context.humanApproval}.`, { confidence: context.humanApproval === "not_provided" ? 0.5 : 0.85, knownLimitations: context.humanApproval === "not_provided" ? ["HUMAN_APPROVAL_EVIDENCE_NOT_PROVIDED"] : [] }),
    common("TOOL_EXPOSURE", "STABLE", `Requested tool or action is ${context.toolReference}.`),
    common("TOOL_PARAMETER_PROVENANCE", parameterBoundaryWeak ? "ELEVATED" : context.parameterProvenanceReference ? "STABLE" : "UNKNOWN", parameterBoundaryWeak ? "At least one security-critical parameter binding is drifted, conflicting, model-controlled contrary to policy, or unresolved." : context.parameterProvenanceReference ? "Tool parameters retain a digest or provenance reference." : "Tool parameter provenance is unavailable.", { confidence: context.parameterProvenanceReference ? 0.9 : 0.25, trend: parameterBoundaryWeak ? "DETERIORATING" : "UNCHANGED", evidenceReferences: context.parameterProvenanceReference ? [context.parameterProvenanceReference] : [], signals: parameterBoundaryWeak ? findings.filter((item) => /PARAMETER|MODEL_CONTROLLED_SECURITY_BOUNDARY|PROVIDER_CONFLICT/.test(item)) : [], knownLimitations: context.parameterProvenanceReference ? [] : ["TOOL_PARAMETER_PROVENANCE_UNAVAILABLE"] }),
    common("DATA_EXPOSURE", ["high", "critical"].includes(context.consequence) ? "WATCH" : "STABLE", `Data exposure is bounded by the ${context.consequence} consequence classification.`),
    common("DESTINATION_EXPOSURE", destinationBoundaryWeak ? "ELEVATED" : "STABLE", `Destination binding is ${context.destinationReference}.`, { trend: destinationBoundaryWeak ? "DETERIORATING" : "UNCHANGED", materiality: "CRITICAL", signals: destinationBoundaryWeak ? findings.filter((item) => /DESTINATION|MODEL_CONTROLLED_SECURITY_BOUNDARY/.test(item)) : [] }),
    common("RUNTIME_ASSURANCE", runtimeAuthorityWeak ? "ELEVATED" : "STABLE", `Runtime state is ${context.runtimeReference}.`, { trend: runtimeAuthorityWeak ? "DETERIORATING" : "UNCHANGED", materiality: "CRITICAL", signals: runtimeAuthorityWeak ? findings.filter((item) => /RUNTIME_AUTHORITY|AUTHORITY_PROPAGATION/.test(item)) : [] }),
    common("MONITORING_COVERAGE", context.monitoringCoverage === "covered" ? "COMPLETE" : context.monitoringCoverage === "partial" ? "PARTIAL" : context.monitoringCoverage === "not_observed" ? "ELEVATED" : "WATCH", `Expected observability is ${context.monitoringCoverage}.`, { confidence: context.monitoringCoverage === "unknown" ? 0.4 : 0.85, trend: ["partial", "not_observed"].includes(context.monitoringCoverage) ? "DETERIORATING" : "UNCHANGED", materiality: "CRITICAL", signals: ["partial", "not_observed"].includes(context.monitoringCoverage) ? ["MONITORING_COVERAGE_GAP"] : [], knownLimitations: context.monitoringCoverage === "unknown" ? ["MONITORING_COVERAGE_UNVERIFIED"] : [] }),
    common("EVIDENCE_FRESHNESS", context.evidenceFresh ? "STABLE" : "ELEVATED", context.evidenceFresh ? "Decision-time evidence is current." : "Decision-time evidence is stale or unavailable.", { trend: context.evidenceFresh ? "UNCHANGED" : "DETERIORATING", freshness: context.evidenceFresh ? "CURRENT" : "STALE" }),
    common("CHANGE_VELOCITY", context.recentChanges?.length ? "WATCH" : "STABLE", context.recentChanges?.length ? `${context.recentChanges.length} recent material change(s) require evaluation.` : "No recent material changes were supplied.", { trend: context.recentChanges?.length ? "DETERIORATING" : "UNCHANGED", signals: context.recentChanges ?? [] }),
    common("POLICY_CHANGE_RISK", "STABLE", `Policy evidence is bound to ${context.policyReference}.`),
    common("CONSEQUENCE_EXPOSURE", ["high", "critical"].includes(context.consequence) ? "WATCH" : "STABLE", `Consequence exposure is ${context.consequence}.`, { materiality: "CRITICAL" }),
    common("AUTHORIZATION_PROPAGATION", staleAuthority ? "SEVERE" : propagationUnresolved || staleAuthorityPossible ? "ELEVATED" : "STABLE", staleAuthority ? "Revoked or downgraded authority remains active downstream." : propagationUnresolved || staleAuthorityPossible ? "Authorization propagation is incomplete or not yet confirmed at runtime and destination." : "No stale downstream authority was observed.", { trend: staleAuthority ? "RAPIDLY_DETERIORATING" : propagationUnresolved || staleAuthorityPossible ? "DETERIORATING" : "UNCHANGED", materiality: "CRITICAL", signals: staleAuthority ? ["STALE_AUTHORITY_STILL_ACTIVE"] : findings.filter((item) => /PROPAGATION|STALE_AUTHORITY/.test(item)) }),
    common("STALE_AUTHORITY_RISK", staleAuthority ? "SEVERE" : staleAuthorityPossible ? "ELEVATED" : "STABLE", staleAuthority ? "Old authority still works downstream." : staleAuthorityPossible ? "Evidence supports stale-authority risk but does not yet prove post-change use." : "No active stale-authority evidence was observed.", { trend: staleAuthority ? "RAPIDLY_DETERIORATING" : staleAuthorityPossible ? "DETERIORATING" : "UNCHANGED", materiality: "CRITICAL", signals: staleAuthority ? ["STALE_AUTHORITY_STILL_ACTIVE"] : staleAuthorityPossible ? ["STALE_AUTHORITY_POSSIBLE"] : [] }),
  ];
  return deepFreeze({
    enterpriseId: context.enterpriseId,
    subject: structuredClone(context.subject),
    horizon: "NEXT_CONSEQUENTIAL_ACTION",
    evaluatedAt: context.evaluatedAt,
    policyReference: context.policyReference,
    conditions,
    authorityIntegrityFindings: findings,
    authorityReference: context.authorityReference,
    actionReference: context.actionReference,
    canonicalTransactionReference: context.canonicalTransactionReference ?? null,
  }) as TrustForecastEvaluationInput;
}

export type TrustForecastOutcomeFeedback = {
  feedbackVersion: "1.0";
  feedbackId: string;
  forecastId: string;
  canonicalDecision: CanonicalTransactionDecision;
  intervention: WorkflowIntervention | null;
  controlApplied: PreventativeControlCode | null;
  executionOutcome: string;
  destinationOutcome: string;
  laterResult: string;
  falsePositiveResolution: string | null;
  occurredAt: string;
  evidenceReferences: string[];
  replayEvents: TrustForecast["replayEvents"];
  trustMemoryEvents: TrustForecast["trustMemoryEvents"];
  graphProjection: TrustForecastGraphProjection;
  feedbackDigest: string;
};

export function createTrustForecastOutcomeFeedback(input: {
  forecast: TrustForecast;
  canonicalDecision: CanonicalTransactionDecision;
  intervention?: WorkflowIntervention | null;
  controlApplied?: PreventativeControlCode | null;
  executionOutcome: string;
  destinationOutcome: string;
  laterResult?: string;
  falsePositiveResolution?: string | null;
  occurredAt: string;
  evidenceReferences?: string[];
}): TrustForecastOutcomeFeedback {
  if (!Number.isFinite(Date.parse(input.occurredAt))) throw new TypeError("Trust Forecast outcome timestamp is invalid.");
  assertSafe(input);
  const evidenceReferences = unique([...(input.evidenceReferences ?? []), ...input.forecast.conditions.flatMap((condition) => condition.evidenceReferences)]);
  const materialTypes = unique([
    ...(["DENY", "REVIEW"].includes(input.canonicalDecision) ? [`CANONICAL_${input.canonicalDecision}`] : []),
    ...(input.controlApplied ? ["CONTROL_APPLIED"] : []),
    ...(input.falsePositiveResolution ? ["FALSE_POSITIVE_CLEARED"] : []),
    ...(input.laterResult === "SUCCESSFUL_REQUALIFICATION" ? ["SUCCESSFUL_REQUALIFICATION"] : []),
  ]);
  const feedbackId = deterministicUuid({ forecastId: input.forecast.forecastId, occurredAt: input.occurredAt, canonicalDecision: input.canonicalDecision, executionOutcome: input.executionOutcome, destinationOutcome: input.destinationOutcome });
  const outcomeId = `${feedbackId}:outcome`;
  const updateId = `${feedbackId}:forecast-update`;
  const replayEvents = [{ eventType: "TRUST_FORECAST_OUTCOME_RECORDED", occurredAt: input.occurredAt, attribution: "CYBER_SENTINELS_INTERPRETATION" as const, evidenceReferences, details: { forecastId: input.forecast.forecastId, canonicalDecision: input.canonicalDecision, intervention: input.intervention ?? null, controlApplied: input.controlApplied ?? null, executionOutcome: input.executionOutcome, destinationOutcome: input.destinationOutcome, laterResult: input.laterResult ?? "UNKNOWN" } }];
  const trustMemoryEvents = materialTypes.map((eventType) => ({ eventId: hashCanonical([feedbackId, eventType]), eventType, occurredAt: input.occurredAt, evidenceReferences }));
  const graphProjection: TrustForecastGraphProjection = {
    nodes: [
      { nodeType: "OUTCOME", externalId: outcomeId, domainKey: "OUTCOME", label: input.destinationOutcome, metadata: { executionOutcome: input.executionOutcome, canonicalDecision: input.canonicalDecision } },
      { nodeType: "FORECAST_UPDATE", externalId: updateId, domainKey: "GOVERNANCE", label: input.laterResult ?? "Outcome feedback recorded", metadata: { forecastId: input.forecast.forecastId } },
    ],
    edges: [{ fromNodeType: "OUTCOME", fromExternalId: outcomeId, toNodeType: "FORECAST_UPDATE", toExternalId: updateId, edgeType: "RESULTED_IN" }],
  };
  const core = { feedbackVersion: "1.0" as const, feedbackId, forecastId: input.forecast.forecastId, canonicalDecision: input.canonicalDecision, intervention: input.intervention ?? null, controlApplied: input.controlApplied ?? null, executionOutcome: input.executionOutcome, destinationOutcome: input.destinationOutcome, laterResult: input.laterResult ?? "UNKNOWN", falsePositiveResolution: input.falsePositiveResolution ?? null, occurredAt: input.occurredAt, evidenceReferences, replayEvents, trustMemoryEvents, graphProjection };
  return deepFreeze({ ...core, feedbackDigest: hashCanonical(core) }) as TrustForecastOutcomeFeedback;
}

export function appendTrustForecastHistory(history: readonly TrustForecastHistoryEntry[], forecast: TrustForecast, input?: { intervention?: WorkflowIntervention | null; subsequentOutcomeReference?: string | null }) {
  if (history.some((item) => item.forecastId === forecast.forecastId)) return [...history];
  const entry: TrustForecastHistoryEntry = {
    historyId: hashCanonical([forecast.forecastId, forecast.state, forecast.evaluatedAt]),
    forecastId: forecast.forecastId,
    state: forecast.state,
    deploymentRecommendation: forecast.deploymentRecommendation,
    occurredAt: forecast.evaluatedAt,
    reason: forecast.primaryContributors.map((item) => item.dimension).join(", ") || "No adverse primary contributor.",
    evidenceReferences: unique(forecast.conditions.flatMap((item) => item.evidenceReferences)),
    intervention: input?.intervention ?? null,
    subsequentOutcomeReference: input?.subsequentOutcomeReference ?? null,
  };
  return [...history.map((item) => structuredClone(item)), deepFreeze(entry)];
}

export type TrustForecastCiContract = {
  contractVersion: "1.0";
  forecast: TrustForecast;
  pipelineOutcome: "PASS" | "REVIEW" | "HOLD";
  canonicalQualificationRequired: true;
  deploymentMayProceed: boolean;
};

export function createTrustForecastCiContract(forecast: TrustForecast): TrustForecastCiContract {
  const pipelineOutcome = forecast.deploymentRecommendation === "QUALIFY" ? "PASS" : forecast.deploymentRecommendation === "QUALIFY_WITH_CONTROLS" || forecast.deploymentRecommendation === "REVIEW_REQUIRED" ? "REVIEW" : "HOLD";
  return deepFreeze({ contractVersion: "1.0", forecast, pipelineOutcome, canonicalQualificationRequired: true, deploymentMayProceed: pipelineOutcome === "PASS" });
}

export const TRUST_FORECAST_INTEGRATION_MODES = ["STANDALONE_PRODUCT", "API_TRUST_LAYER", "SDK", "CI_CD_GATE", "PROVIDER_NEUTRAL_EVIDENCE_LAYER", "ENTERPRISE_INTEGRATION"] as const;

export type TrustForecastIntegrationContract = {
  version: "1.0";
  modes: typeof TRUST_FORECAST_INTEGRATION_MODES;
  currentApiReuseRequired: true;
  providerNeutral: true;
  supportedOperations: ["GET_CURRENT_FORECAST", "GET_FORECAST_HISTORY", "GET_FORECAST_CONTRIBUTORS", "POST_MATERIAL_CHANGE_EVIDENCE", "POST_DEPLOYMENT_CANDIDATE_EVIDENCE", "POST_FORECAST_EVIDENCE"];
  redundantRoutesRequired: false;
};

export function createTrustForecastIntegrationContract(): TrustForecastIntegrationContract {
  return deepFreeze({
    version: "1.0",
    modes: TRUST_FORECAST_INTEGRATION_MODES,
    currentApiReuseRequired: true,
    providerNeutral: true,
    supportedOperations: ["GET_CURRENT_FORECAST", "GET_FORECAST_HISTORY", "GET_FORECAST_CONTRIBUTORS", "POST_MATERIAL_CHANGE_EVIDENCE", "POST_DEPLOYMENT_CANDIDATE_EVIDENCE", "POST_FORECAST_EVIDENCE"],
    redundantRoutesRequired: false,
  }) as TrustForecastIntegrationContract;
}

export type AuthoritySimulationScenario = "WRITE_REPOSITORY" | "DELETE_REPOSITORY" | "CROSS_TENANT_ACCESS" | "UNDECLARED_TOOL" | "DESTINATION_OVERRIDE" | "PRIVILEGE_ESCALATION" | "CONSENT_BYPASS" | "STALE_CREDENTIAL" | "MODEL_CONTROLLED_SECURITY_FIELD";
export type PreDeploymentAuthorityTestEvidence = {
  evidenceType: "PRE_DEPLOYMENT_AUTHORITY_TEST_EVIDENCE";
  syntheticOnly: true;
  destructiveExecutionPerformed: false;
  evaluatedAt: string;
  results: Array<{ scenario: AuthoritySimulationScenario; canonicalDecision: CanonicalTransactionDecision; reasonCodes: string[] }>;
  evidenceDigest: string;
};

export async function runPreDeploymentAuthoritySimulation(input: {
  evaluatedAt: string;
  scenarios: AuthoritySimulationScenario[];
  evaluateCanonicalPolicy: (scenario: { scenario: AuthoritySimulationScenario; syntheticIntent: true; executionAllowed: false }) => Promise<{ decision: CanonicalTransactionDecision; reasonCodes: string[] }>;
}): Promise<PreDeploymentAuthorityTestEvidence> {
  const results = [] as PreDeploymentAuthorityTestEvidence["results"];
  for (const scenario of [...new Set(input.scenarios)]) {
    const result = await input.evaluateCanonicalPolicy({ scenario, syntheticIntent: true, executionAllowed: false });
    results.push({ scenario, canonicalDecision: result.decision, reasonCodes: unique(result.reasonCodes) });
  }
  const core = { evidenceType: "PRE_DEPLOYMENT_AUTHORITY_TEST_EVIDENCE" as const, syntheticOnly: true as const, destructiveExecutionPerformed: false as const, evaluatedAt: input.evaluatedAt, results };
  return deepFreeze({ ...core, evidenceDigest: hashCanonical(core) });
}

export type TrustForecastMlEpisode = {
  schemaVersion: "1.0";
  conditionsBeforeAction: TrustConditionInput[];
  forecast: { forecastId: string; state: TrustForecastState; trend: TrustConditionTrend; confidence: number; contributors: TrustForecastContributor[] };
  authorityState: TrustConditionStatus | "NOT_OBSERVED";
  identityState: TrustConditionStatus | "NOT_OBSERVED";
  toolState: TrustConditionStatus | "NOT_OBSERVED";
  runtimeState: TrustConditionStatus | "NOT_OBSERVED";
  monitoringState: TrustConditionStatus | "NOT_OBSERVED";
  policyState: TrustConditionStatus | "NOT_OBSERVED";
  consequenceExposure: TrustConditionStatus | "NOT_OBSERVED";
  conditionsAtTimeT: TrustConditionInput[];
  forecastState: TrustForecastState;
  canonicalDecision: CanonicalTransactionDecision;
  intervention: WorkflowIntervention | null;
  executionOutcome: string;
  destinationOutcome: string;
  laterIncidentOrNoIncident: "INCIDENT" | "NO_INCIDENT" | "UNKNOWN";
  laterResult: string;
  falsePositiveResolution: string | null;
  trainingEligible: boolean;
  automaticTrainingStarted: false;
};

export function createTrustForecastMlEpisode(input: {
  forecast: TrustForecast;
  canonicalDecision: CanonicalTransactionDecision;
  intervention?: WorkflowIntervention | null;
  executionOutcome: string;
  destinationOutcome: string;
  laterIncidentOrNoIncident?: "INCIDENT" | "NO_INCIDENT" | "UNKNOWN";
  laterResult?: string;
  falsePositiveResolution?: string | null;
}): TrustForecastMlEpisode {
  const status = (...dimensions: TrustConditionDimension[]) => input.forecast.conditions.find((condition) => dimensions.includes(condition.dimension))?.status ?? "NOT_OBSERVED";
  const episode = {
    schemaVersion: "1.0" as const,
    conditionsBeforeAction: structuredClone(input.forecast.conditions),
    forecast: { forecastId: input.forecast.forecastId, state: input.forecast.state, trend: input.forecast.trend, confidence: input.forecast.confidence, contributors: structuredClone(input.forecast.primaryContributors) },
    authorityState: status("AUTHORITY_STABILITY", "AUTHORITY_EXPOSURE"),
    identityState: status("IDENTITY_STABILITY"),
    toolState: status("TOOL_EXPOSURE", "TOOL_PARAMETER_PROVENANCE"),
    runtimeState: status("RUNTIME_ASSURANCE"),
    monitoringState: status("MONITORING_COVERAGE"),
    policyState: status("POLICY_CHANGE_RISK"),
    consequenceExposure: status("CONSEQUENCE_EXPOSURE"),
    conditionsAtTimeT: structuredClone(input.forecast.conditions),
    forecastState: input.forecast.state,
    canonicalDecision: input.canonicalDecision,
    intervention: input.intervention ?? null,
    executionOutcome: input.executionOutcome,
    destinationOutcome: input.destinationOutcome,
    laterIncidentOrNoIncident: input.laterIncidentOrNoIncident ?? "UNKNOWN",
    laterResult: input.laterResult ?? "UNKNOWN",
    falsePositiveResolution: input.falsePositiveResolution ?? null,
    trainingEligible: input.laterIncidentOrNoIncident !== undefined && input.laterIncidentOrNoIncident !== "UNKNOWN",
    automaticTrainingStarted: false as const,
  };
  return deepFreeze(episode) as TrustForecastMlEpisode;
}
