import { hashCanonical } from "../src/lib/trust-core/hash.ts";
import { operationalEntityFixtures, type OperationalEntity } from "./operational-entities/operational-entity.ts";

export type EvidenceIntelligenceCategory =
  | "repeated_anomaly"
  | "governance_intervention"
  | "provider_instability"
  | "session_continuity_failure"
  | "workflow_interruption"
  | "replay_divergence"
  | "trust_posture_change";

export type EvidenceIntelligenceEvent = {
  id: string;
  workflowId: string;
  occurredAt: string;
  category: EvidenceIntelligenceCategory;
  direction: "improving" | "stable" | "degrading";
  trustScore?: number | null;
  explanation: string;
  evidenceReferences: string[];
  governanceAction?: string | null;
  provider?: string | null;
};

export type TrustTrendDirection = "improving" | "stable" | "degrading" | "insufficient_evidence";

export type ExplainableTrustIndicator = {
  id: string;
  label: string;
  value: number;
  unit: "score" | "events" | "percent";
  direction: TrustTrendDirection;
  whatChanged: string;
  whyItMatters: string;
  evidenceContributed: string[];
  governanceActions: string[];
};

export type TrustIntelligenceSummary = {
  eventCount: number;
  evidenceContinuityScore: number;
  replayConsistencyScore: number;
  workflowStabilityScore: number;
  postureTrend: TrustTrendDirection;
  governanceInterventionCount: number;
  repeatedAnomalyCount: number;
  providerInstabilityCount: number;
  sessionContinuityFailureCount: number;
  workflowInterruptionCount: number;
  replayDivergenceCount: number;
  indicators: ExplainableTrustIndicator[];
  boundary: string;
};

export const TRUST_INTELLIGENCE_BOUNDARY = {
  method: "deterministic_operational_evidence_analysis",
  biometricCertainty: false,
  autonomousAccusation: false,
  surveillance: false,
  standaloneTruthDetection: false,
} as const;

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function occurredAt(event: EvidenceIntelligenceEvent) {
  const value = new Date(event.occurredAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

function directionFromEvents(events: EvidenceIntelligenceEvent[]): TrustTrendDirection {
  if (!events.length) return "insufficient_evidence";
  const improving = events.filter((event) => event.direction === "improving").length;
  const degrading = events.filter((event) => event.direction === "degrading").length;
  if (improving === degrading) return "stable";
  return improving > degrading ? "improving" : "degrading";
}

function trendFromScores(events: EvidenceIntelligenceEvent[]): TrustTrendDirection {
  const scored = events
    .filter((event) => Number.isFinite(Number(event.trustScore)))
    .sort((left, right) => occurredAt(left) - occurredAt(right));
  if (scored.length < 2) return directionFromEvents(events);
  const first = Number(scored[0].trustScore);
  const last = Number(scored.at(-1)?.trustScore);
  if (Math.abs(last - first) < 5) return "stable";
  return last > first ? "improving" : "degrading";
}

function evidenceFor(events: EvidenceIntelligenceEvent[]) {
  return unique(events.flatMap((event) => event.evidenceReferences));
}

function governanceFor(events: EvidenceIntelligenceEvent[]) {
  return unique(events.map((event) => event.governanceAction));
}

export function analyzeTrustIntelligence(
  sourceEvents: EvidenceIntelligenceEvent[]
): TrustIntelligenceSummary {
  const events = [...sourceEvents].sort((left, right) => occurredAt(left) - occurredAt(right));
  const byCategory = (category: EvidenceIntelligenceCategory) =>
    events.filter((event) => event.category === category);
  const anomalies = byCategory("repeated_anomaly");
  const governance = byCategory("governance_intervention");
  const providerInstability = byCategory("provider_instability");
  const sessionFailures = byCategory("session_continuity_failure");
  const interruptions = byCategory("workflow_interruption");
  const replayDivergence = byCategory("replay_divergence");
  const postureChanges = byCategory("trust_posture_change");
  const evidenceReferences = evidenceFor(events);
  const eventsWithEvidence = events.filter((event) => event.evidenceReferences.length > 0);
  const evidenceContinuityScore = events.length
    ? clamp((eventsWithEvidence.length / events.length) * 100)
    : 0;
  const replayConsistencyScore = events.length
    ? clamp(100 - replayDivergence.length * 18 - interruptions.length * 6)
    : 0;
  const destabilizingEvents =
    anomalies.length +
    providerInstability.length +
    sessionFailures.length +
    interruptions.length +
    replayDivergence.length;
  const workflowStabilityScore = events.length
    ? clamp(100 - (destabilizingEvents / events.length) * 70)
    : 0;
  const postureTrend = trendFromScores(postureChanges.length ? postureChanges : events);
  const governanceActions = governanceFor(events);

  const indicators: ExplainableTrustIndicator[] = [
    {
      id: "evidence-continuity",
      label: "Evidence continuity",
      value: evidenceContinuityScore,
      unit: "percent",
      direction: evidenceContinuityScore >= 80 ? "stable" : "degrading",
      whatChanged: `${eventsWithEvidence.length} of ${events.length} operational events retain evidence references.`,
      whyItMatters: "Evidence-linked changes can be reconstructed and reviewed instead of becoming unexplained score movement.",
      evidenceContributed: evidenceReferences,
      governanceActions,
    },
    {
      id: "replay-consistency",
      label: "Replay consistency",
      value: replayConsistencyScore,
      unit: "score",
      direction: replayDivergence.length ? "degrading" : events.length ? "stable" : "insufficient_evidence",
      whatChanged: `${replayDivergence.length} replay divergence event(s) and ${interruptions.length} workflow interruption(s) were retained.`,
      whyItMatters: "Divergent or interrupted chronology can weaken later reconstruction and governance review.",
      evidenceContributed: evidenceFor([...replayDivergence, ...interruptions]),
      governanceActions: governanceFor([...replayDivergence, ...interruptions, ...governance]),
    },
    {
      id: "workflow-stability",
      label: "Workflow stability",
      value: workflowStabilityScore,
      unit: "score",
      direction: directionFromEvents(events),
      whatChanged: `${destabilizingEvents} continuity-affecting event(s) were observed across ${events.length} retained event(s).`,
      whyItMatters: "Repeated changes matter differently from a single isolated workflow signal.",
      evidenceContributed: evidenceFor([
        ...anomalies,
        ...providerInstability,
        ...sessionFailures,
        ...interruptions,
      ]),
      governanceActions,
    },
    {
      id: "governance-interventions",
      label: "Governance interventions",
      value: governance.length,
      unit: "events",
      direction: governance.length ? "stable" : events.length ? "stable" : "insufficient_evidence",
      whatChanged: `${governance.length} accountable governance intervention(s) are present in the evidence window.`,
      whyItMatters: "Reviewer action explains how operational signals affected workflow state without turning anomalies into accusations.",
      evidenceContributed: evidenceFor(governance),
      governanceActions: governanceFor(governance),
    },
    {
      id: "provider-reliability",
      label: "Provider instability",
      value: providerInstability.length,
      unit: "events",
      direction: providerInstability.length ? "degrading" : events.length ? "stable" : "insufficient_evidence",
      whatChanged: `${providerInstability.length} provider state change or failure event(s) were recorded.`,
      whyItMatters: "Provider reliability affects evidence continuity but does not independently determine workflow truth.",
      evidenceContributed: evidenceFor(providerInstability),
      governanceActions: governanceFor(providerInstability),
    },
    {
      id: "posture-trend",
      label: "Trust posture trend",
      value: postureChanges.length,
      unit: "events",
      direction: postureTrend,
      whatChanged: `${postureChanges.length} explicit posture change event(s) were compared over time.`,
      whyItMatters: "Trend direction gives reviewers continuity context without reducing trust to a binary pass or fail.",
      evidenceContributed: evidenceFor(postureChanges),
      governanceActions: governanceFor(postureChanges),
    },
  ];

  return {
    eventCount: events.length,
    evidenceContinuityScore,
    replayConsistencyScore,
    workflowStabilityScore,
    postureTrend,
    governanceInterventionCount: governance.length,
    repeatedAnomalyCount: anomalies.length,
    providerInstabilityCount: providerInstability.length,
    sessionContinuityFailureCount: sessionFailures.length,
    workflowInterruptionCount: interruptions.length,
    replayDivergenceCount: replayDivergence.length,
    indicators,
    boundary:
      "Evidence intelligence summarizes consented operational records. It is not biometric certainty, surveillance, autonomous accusation or truth detection.",
  };
}

export const evidenceIntelligenceSimulations: EvidenceIntelligenceEvent[] = [
  {
    id: "simulation-anomaly-1",
    workflowId: "simulation-workflow",
    occurredAt: "2026-01-01T10:00:00.000Z",
    category: "repeated_anomaly",
    direction: "degrading",
    trustScore: 76,
    explanation: "A workflow inconsistency was retained for controlled repeat-pattern analysis.",
    evidenceReferences: ["simulated workflow anomaly", "scenario input"],
  },
  {
    id: "simulation-anomaly-2",
    workflowId: "simulation-workflow",
    occurredAt: "2026-01-01T10:02:00.000Z",
    category: "repeated_anomaly",
    direction: "degrading",
    trustScore: 68,
    explanation: "The same controlled anomaly category appeared again in the workflow chronology.",
    evidenceReferences: ["simulated repeat anomaly", "replay chronology"],
  },
  {
    id: "simulation-provider-instability",
    workflowId: "simulation-workflow",
    occurredAt: "2026-01-01T10:03:00.000Z",
    category: "provider_instability",
    direction: "degrading",
    trustScore: 61,
    explanation: "A provider state changed from pending to failed in the controlled scenario.",
    evidenceReferences: ["simulated provider state", "provider evidence reference"],
    provider: "Simulation provider",
  },
  {
    id: "simulation-replay-divergence",
    workflowId: "simulation-workflow",
    occurredAt: "2026-01-01T10:04:00.000Z",
    category: "replay_divergence",
    direction: "degrading",
    trustScore: 55,
    explanation: "A replay reference did not align with the preceding controlled chronology.",
    evidenceReferences: ["simulated replay divergence", "chronology comparison"],
  },
  {
    id: "simulation-session-failure",
    workflowId: "simulation-workflow",
    occurredAt: "2026-01-01T10:05:00.000Z",
    category: "session_continuity_failure",
    direction: "degrading",
    trustScore: 49,
    explanation: "Session continuity was interrupted in the controlled scenario.",
    evidenceReferences: ["simulated session interruption", "session integrity evidence"],
  },
  {
    id: "simulation-governance-chain-1",
    workflowId: "simulation-workflow",
    occurredAt: "2026-01-01T10:06:00.000Z",
    category: "governance_intervention",
    direction: "stable",
    trustScore: 49,
    explanation: "A named reviewer opened governance review after repeated evidence changes.",
    evidenceReferences: ["simulation review record", "replay chronology"],
    governanceAction: "Open review by Validation governance reviewer",
  },
  {
    id: "simulation-governance-chain-2",
    workflowId: "simulation-workflow",
    occurredAt: "2026-01-01T10:08:00.000Z",
    category: "governance_intervention",
    direction: "improving",
    trustScore: 63,
    explanation: "The reviewer requested evidence and recorded a bounded workflow continuation.",
    evidenceReferences: ["simulation reviewer action", "additional evidence request"],
    governanceAction: "Request evidence by Validation governance reviewer",
  },
  {
    id: "simulation-posture-recovery",
    workflowId: "simulation-workflow",
    occurredAt: "2026-01-01T10:10:00.000Z",
    category: "trust_posture_change",
    direction: "improving",
    trustScore: 67,
    explanation: "Posture improved after evidence and reviewer action; no automatic accusation was made.",
    evidenceReferences: ["simulation posture snapshot", "governance outcome"],
    governanceAction: "Continue under review by Validation governance reviewer",
  },
];

export function runEvidenceIntelligenceSimulation() {
  return analyzeTrustIntelligence(evidenceIntelligenceSimulations);
}

// Continuous Operational Trust Intelligence is a derived projection over the
// canonical Operational Entity, evidence, decision, Replay and Trust Memory
// histories. None of the contracts below is an independent source of truth.
export const OPERATIONAL_TRUST_INTELLIGENCE_ASSERTION = {
  canonicalSpine: "Operational Entity",
  trustIntelligence: "DERIVED",
  trustHealth: "DERIVED",
  trustDrift: "DERIVED",
  trustPrediction: "DERIVED",
  trustAdvisor: "DERIVED",
  trustCascade: "DERIVED",
  independentSourceOfTruth: false,
} as const;

export const trustChangeTypes = [
  "IDENTITY_CHANGED", "OWNER_CHANGED", "AUTHORITY_EXPANDED", "AUTHORITY_REDUCED",
  "AUTHORITY_REVOKED", "AUTHORITY_EXPIRED", "PROVIDER_CHANGED", "PROVIDER_CONFLICT",
  "RUNTIME_CHANGED", "ENVIRONMENT_CHANGED", "EVIDENCE_STALE", "EVIDENCE_CORRECTED",
  "EVIDENCE_CONTRADICTED", "BEHAVIOUR_CHANGED", "OUTCOME_CONTRADICTED", "INCIDENT_OPENED",
  "INCIDENT_RESOLVED", "RECOVERY_EVIDENCE_RECEIVED", "POLICY_CHANGED", "ENTITY_SUPERSEDED",
] as const;
export type TrustChangeType = (typeof trustChangeTypes)[number];
export type TrustMateriality = "IMMATERIAL" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNKNOWN";
export type TrustConclusionConfidence = "HIGH" | "MODERATE" | "LOW" | "INSUFFICIENT";

export type TrustChangeEvent = {
  eventId: string;
  enterpriseId: string;
  operationalEntityId: string;
  transactionId: string | null;
  changeType: TrustChangeType;
  previousStateReference: string;
  currentStateReference: string;
  evidenceReferences: string[];
  authorityReferences: string[];
  providerReferences: string[];
  incidentReferences: string[];
  detectedAt: string;
  effectiveAt: string;
  materiality: TrustMateriality;
  confidence: TrustConclusionConfidence;
  reasonCodes: string[];
  recommendedEvaluation: "CONTINUE" | "RE_EVALUATE" | "REVIEW" | "SUSPEND";
  digest: string;
};

type MaterialityContext = {
  entity: Pick<OperationalEntity, "entityId" | "entityType" | "currentConsequenceClassification">;
  changeType: TrustChangeType;
  authorityScope: string[];
  actionCapabilities: string[];
  dataAccess: "public" | "internal" | "confidential" | "restricted" | "unknown";
  environment: string;
  consequenceExposure: "low" | "moderate" | "high" | "critical" | "unknown";
  evidenceQuality: "supported" | "partial" | "conflicting" | "insufficient";
  providerIndependence: "single_source" | "same_party_multi_system" | "multi_source" | "independently_confirmed" | "conflicting" | "insufficient";
  existingIncidents: number;
  adverseHistoricalOutcomes: number;
  policyRequiresReview: boolean;
};

export function classifyTrustChangeMateriality(input: MaterialityContext): { materiality: TrustMateriality; reasonCodes: string[] } {
  const reasons: string[] = [];
  if (input.evidenceQuality === "insufficient" || input.consequenceExposure === "unknown") return { materiality: "UNKNOWN", reasonCodes: ["MATERIALITY_EVIDENCE_INSUFFICIENT"] };
  if (input.changeType === "AUTHORITY_REVOKED") reasons.push("AUTHORITY_REVOKED");
  if (["production", "restricted"].includes(input.environment.toLowerCase())) reasons.push("SENSITIVE_ENVIRONMENT");
  if (["restricted", "confidential"].includes(input.dataAccess)) reasons.push("SENSITIVE_DATA_ACCESS");
  if (["high", "critical"].includes(input.consequenceExposure)) reasons.push("HIGH_CONSEQUENCE_EXPOSURE");
  if (input.evidenceQuality === "conflicting" || input.providerIndependence === "conflicting") reasons.push("EVIDENCE_CONFLICT");
  if (["single_source", "same_party_multi_system", "insufficient"].includes(input.providerIndependence)) reasons.push("LIMITED_PROVIDER_INDEPENDENCE");
  if (input.existingIncidents > 0) reasons.push("OPEN_INCIDENT");
  if (input.adverseHistoricalOutcomes > 0) reasons.push("ADVERSE_OUTCOME_HISTORY");
  if (input.policyRequiresReview) reasons.push("POLICY_REVIEW_REQUIRED");
  if (input.changeType === "AUTHORITY_REVOKED" && (reasons.includes("SENSITIVE_ENVIRONMENT") || reasons.includes("HIGH_CONSEQUENCE_EXPOSURE"))) return { materiality: "CRITICAL", reasonCodes: reasons };
  if (["RUNTIME_CHANGED", "ENVIRONMENT_CHANGED", "OUTCOME_CONTRADICTED", "INCIDENT_OPENED", "PROVIDER_CONFLICT"].includes(input.changeType) && reasons.length >= 2) return { materiality: "HIGH", reasonCodes: reasons };
  if (reasons.length >= 2 || ["AUTHORITY_EXPANDED", "AUTHORITY_REDUCED", "POLICY_CHANGED", "EVIDENCE_CONTRADICTED"].includes(input.changeType)) return { materiality: "MODERATE", reasonCodes: reasons.length ? reasons : ["GOVERNED_CONDITION_CHANGED"] };
  if (input.changeType === "EVIDENCE_STALE" || input.changeType === "PROVIDER_CHANGED") return { materiality: "LOW", reasonCodes: reasons.length ? reasons : ["CONTINUITY_REEVALUATION_REQUIRED"] };
  return { materiality: "IMMATERIAL", reasonCodes: reasons.length ? reasons : ["NO_CONSEQUENTIAL_CONDITION_CHANGED"] };
}

export function createTrustChangeEvent(input: Omit<TrustChangeEvent, "eventId" | "digest"> & { eventId?: string }): TrustChangeEvent {
  if (!input.enterpriseId || !input.operationalEntityId || !trustChangeTypes.includes(input.changeType)) throw new TypeError("A tenant-scoped canonical change is required.");
  const normalized = {
    ...input,
    transactionId: input.transactionId ?? null,
    evidenceReferences: [...new Set(input.evidenceReferences)].sort(),
    authorityReferences: [...new Set(input.authorityReferences)].sort(),
    providerReferences: [...new Set(input.providerReferences)].sort(),
    incidentReferences: [...new Set(input.incidentReferences)].sort(),
    reasonCodes: [...new Set(input.reasonCodes)].sort(),
  };
  const eventId = input.eventId ?? `change:${hashCanonical(normalized).slice(0, 24)}`;
  const unsigned = { ...normalized, eventId };
  return Object.freeze({ ...unsigned, digest: hashCanonical(unsigned) });
}

export type TrustConditionState = {
  stateReference: string;
  identity: string;
  accountableOwner: string;
  authority: string;
  toolScope: string[];
  targetScope: string[];
  environment: string;
  runtime: string;
  provider: string;
  evidenceFreshness: "CURRENT" | "STALE" | "EXPIRED" | "UNKNOWN";
  evidenceIndependence: string;
  behaviour: string;
  outcome: string;
  incidentState: string;
  evidenceByCondition: Record<string, string[]>;
};
export type TrustDriftState = "NO_MATERIAL_DRIFT" | "EXPECTED_DRIFT" | "APPROVED_CHANGE" | "UNEXPLAINED_DRIFT" | "MATERIAL_DRIFT" | "CRITICAL_DRIFT" | "INSUFFICIENT_EVIDENCE";
export type TrustDriftFinding = { condition: keyof Omit<TrustConditionState, "stateReference" | "evidenceByCondition">; previousValue: string; currentValue: string; evidenceReferences: string[]; material: boolean; reasonCode: string };
export type TrustDriftAssessment = { state: TrustDriftState; findings: TrustDriftFinding[]; evidenceReferences: string[]; reasonCodes: string[]; evaluatedAt: string; digest: string };

function conditionValue(value: string | string[]) { return Array.isArray(value) ? [...value].sort().join("|") : value; }

export function evaluateTrustDrift(input: { previous: TrustConditionState; current: TrustConditionState; approvedConditions?: string[]; expectedConditions?: string[]; evaluatedAt: string }): TrustDriftAssessment {
  const conditions = ["identity", "accountableOwner", "authority", "toolScope", "targetScope", "environment", "runtime", "provider", "evidenceFreshness", "evidenceIndependence", "behaviour", "outcome", "incidentState"] as const;
  const materialConditions = new Set(["identity", "accountableOwner", "authority", "toolScope", "targetScope", "environment", "runtime", "outcome", "incidentState"]);
  const findings = conditions.flatMap((condition): TrustDriftFinding[] => {
    const previousValue = conditionValue(input.previous[condition]);
    const currentValue = conditionValue(input.current[condition]);
    if (previousValue === currentValue) return [];
    const evidenceReferences = [...new Set([...(input.previous.evidenceByCondition[condition] ?? []), ...(input.current.evidenceByCondition[condition] ?? [])])];
    return [{ condition, previousValue, currentValue, evidenceReferences, material: materialConditions.has(condition), reasonCode: `${condition.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}_CHANGED` }];
  });
  const evidenceReferences = [...new Set(findings.flatMap((finding) => finding.evidenceReferences))].sort();
  let state: TrustDriftState;
  if (!findings.length) state = "NO_MATERIAL_DRIFT";
  else if (findings.some((finding) => !(input.current.evidenceByCondition[finding.condition] ?? []).length)) state = "INSUFFICIENT_EVIDENCE";
  else if (findings.some((finding) => finding.condition === "authority" && /revoked|expired/i.test(finding.currentValue))) state = "CRITICAL_DRIFT";
  else if (findings.every((finding) => input.approvedConditions?.includes(finding.condition))) state = "APPROVED_CHANGE";
  else if (findings.every((finding) => input.expectedConditions?.includes(finding.condition))) state = "EXPECTED_DRIFT";
  else if (findings.some((finding) => finding.material)) state = "MATERIAL_DRIFT";
  else state = "UNEXPLAINED_DRIFT";
  const unsigned = { state, findings, evidenceReferences, reasonCodes: findings.map((finding) => finding.reasonCode), evaluatedAt: new Date(input.evaluatedAt).toISOString() };
  return { ...unsigned, digest: hashCanonical(unsigned) };
}

export const trustHealthDimensions = ["IDENTITY", "ACCOUNTABILITY", "AUTHORITY", "EVIDENCE", "CONTINUITY", "OUTCOME", "INCIDENT", "PROVIDER_INDEPENDENCE"] as const;
export type TrustHealthDimension = (typeof trustHealthDimensions)[number];
export type TrustHealthDimensionState = "SUPPORTED" | "PARTIAL" | "DEGRADED" | "CONFLICTING" | "UNKNOWN";
export type TrustHealthOverallState = "HEALTHY" | "WATCH" | "DEGRADED" | "REVIEW_REQUIRED" | "SUSPENDED" | "UNKNOWN";
export type TrustHealthAssessment = { dimensions: Record<TrustHealthDimension, { state: TrustHealthDimensionState; reasonCodes: string[]; evidenceReferences: string[] }>; overallState: TrustHealthOverallState; reasonCodes: string[]; evidenceReferences: string[] };

export function deriveTrustHealth(dimensions: TrustHealthAssessment["dimensions"]): TrustHealthAssessment {
  const entries = Object.entries(dimensions) as Array<[TrustHealthDimension, TrustHealthAssessment["dimensions"][TrustHealthDimension]]>;
  const reasons = [...new Set(entries.flatMap(([, value]) => value.reasonCodes))];
  const refs = [...new Set(entries.flatMap(([, value]) => value.evidenceReferences))];
  const states = entries.map(([, value]) => value.state);
  let overallState: TrustHealthOverallState = "HEALTHY";
  if (states.every((state) => state === "UNKNOWN")) overallState = "UNKNOWN";
  else if (dimensions.AUTHORITY.state === "CONFLICTING" || reasons.includes("AUTHORITY_REVOKED")) overallState = "SUSPENDED";
  else if (states.includes("CONFLICTING")) overallState = "REVIEW_REQUIRED";
  else if (states.includes("DEGRADED")) overallState = "DEGRADED";
  else if (states.includes("PARTIAL") || states.includes("UNKNOWN")) overallState = "WATCH";
  return { dimensions, overallState, reasonCodes: reasons.length ? reasons : ["ALL_DIMENSIONS_SUPPORTED"], evidenceReferences: refs.sort() };
}

export function deriveTrustConfidence(input: { evidenceCompleteness: number; evidenceFreshness: number; sourceIndependence: number; providerAgreement: number; authorityCertainty: number; outcomeConfirmation: number; continuity: number; unresolvedContradictions: number; evidenceReferences: string[] }): { level: TrustConclusionConfidence; factors: Record<string, number>; evidenceReferences: string[]; reasonCodes: string[] } {
  const factors = { evidenceCompleteness: input.evidenceCompleteness, evidenceFreshness: input.evidenceFreshness, sourceIndependence: input.sourceIndependence, providerAgreement: input.providerAgreement, authorityCertainty: input.authorityCertainty, outcomeConfirmation: input.outcomeConfirmation, continuity: input.continuity };
  if (!input.evidenceReferences.length || input.evidenceCompleteness <= 0) return { level: "INSUFFICIENT", factors, evidenceReferences: [], reasonCodes: ["CONFIDENCE_EVIDENCE_INSUFFICIENT"] };
  const average = Object.values(factors).reduce((sum, value) => sum + Math.max(0, Math.min(1, value)), 0) / Object.keys(factors).length;
  const adjusted = average - Math.min(0.6, input.unresolvedContradictions * 0.2);
  const level: TrustConclusionConfidence = adjusted >= 0.8 ? "HIGH" : adjusted >= 0.55 ? "MODERATE" : "LOW";
  return { level, factors, evidenceReferences: [...new Set(input.evidenceReferences)].sort(), reasonCodes: [input.unresolvedContradictions ? "UNRESOLVED_CONTRADICTIONS_PRESENT" : "CURRENT_CONCLUSION_EVIDENCE_MEASURED"] };
}

export type TrustStabilityState = "STABLE" | "CHANGING" | "VOLATILE" | "INSUFFICIENT_HISTORY";
export function evaluateTrustStability(input: { events: TrustChangeEvent[]; asOf: string; windowsHours?: number[] }): { state: TrustStabilityState; windows: Array<{ hours: number; materialChangeCount: number; changeTypes: TrustChangeType[] }>; reasonCodes: string[] } {
  const asOf = Date.parse(input.asOf);
  const windows = (input.windowsHours ?? [24, 168, 720]).map((hours) => {
    const events = input.events.filter((event) => asOf - Date.parse(event.effectiveAt) >= 0 && asOf - Date.parse(event.effectiveAt) <= hours * 3_600_000 && ["MODERATE", "HIGH", "CRITICAL"].includes(event.materiality));
    return { hours, materialChangeCount: events.length, changeTypes: [...new Set(events.map((event) => event.changeType))] };
  });
  if (input.events.length < 2) return { state: "INSUFFICIENT_HISTORY", windows, reasonCodes: ["FEWER_THAN_TWO_CHANGE_EVENTS"] };
  const sevenDays = windows.find((window) => window.hours === 168)?.materialChangeCount ?? windows[0].materialChangeCount;
  const thirtyDays = windows.find((window) => window.hours === 720)?.materialChangeCount ?? windows.at(-1)?.materialChangeCount ?? 0;
  const state: TrustStabilityState = sevenDays >= 4 || thirtyDays >= 7 ? "VOLATILE" : sevenDays >= 2 || thirtyDays >= 3 ? "CHANGING" : "STABLE";
  return { state, windows, reasonCodes: [state === "VOLATILE" ? "FREQUENT_MATERIAL_CONDITION_CHANGES" : state === "CHANGING" ? "MULTIPLE_MATERIAL_CONDITION_CHANGES" : "MATERIAL_CONDITIONS_STABLE"] };
}

export type TrustPredictionType = "LIKELY_REVIEW_REQUIRED" | "LIKELY_EVIDENCE_EXPIRY" | "LIKELY_AUTHORITY_EXPIRY" | "LIKELY_CONTINUITY_BREAK" | "LIKELY_PROVIDER_EVIDENCE_GAP" | "LIKELY_POLICY_ESCALATION" | "NO_MATERIAL_CHANGE_EXPECTED" | "INSUFFICIENT_EVIDENCE";
export type TrustPrediction = { prediction: TrustPredictionType; timeHorizon: string; supportingEvidence: string[]; historicalBasis: string[]; confidence: TrustConclusionConfidence; limitations: string[]; generatedAt: string; expiresAt: string; autonomousEnforcementAllowed: false };
export function predictOperationalTrust(input: { generatedAt: string; horizonHours: number; evidenceExpiresAt?: string | null; authorityExpiresAt?: string | null; providerGap: boolean; unresolvedMaterialDrift: boolean; policyEscalationExpected: boolean; supportingEvidence: string[]; historicalBasis: string[] }): TrustPrediction {
  const generated = Date.parse(input.generatedAt);
  const horizonEnd = generated + input.horizonHours * 3_600_000;
  let prediction: TrustPredictionType = "NO_MATERIAL_CHANGE_EXPECTED";
  if (!input.supportingEvidence.length) prediction = "INSUFFICIENT_EVIDENCE";
  else if (input.unresolvedMaterialDrift) prediction = "LIKELY_REVIEW_REQUIRED";
  else if (input.providerGap) prediction = "LIKELY_PROVIDER_EVIDENCE_GAP";
  else if (input.authorityExpiresAt && Date.parse(input.authorityExpiresAt) <= horizonEnd) prediction = "LIKELY_AUTHORITY_EXPIRY";
  else if (input.evidenceExpiresAt && Date.parse(input.evidenceExpiresAt) <= horizonEnd) prediction = "LIKELY_EVIDENCE_EXPIRY";
  else if (input.policyEscalationExpected) prediction = "LIKELY_POLICY_ESCALATION";
  return { prediction, timeHorizon: `${input.horizonHours} hours`, supportingEvidence: [...new Set(input.supportingEvidence)], historicalBasis: [...new Set(input.historicalBasis)], confidence: prediction === "INSUFFICIENT_EVIDENCE" ? "INSUFFICIENT" : input.historicalBasis.length ? "MODERATE" : "LOW", limitations: ["Predicts bounded operational states only.", "Cannot predict malicious intent or future attacks.", "Cannot autonomously enforce a decision."], generatedAt: new Date(generated).toISOString(), expiresAt: new Date(horizonEnd).toISOString(), autonomousEnforcementAllowed: false };
}

export type TrustRecoveryState = "DEGRADED" | "REMEDIATION_REQUIRED" | "EVIDENCE_RECEIVED" | "RE_EVALUATION" | "RESTORED" | "REMAINS_DEGRADED" | "SUSPENDED";
export type TrustRecoveryRecord = { recoveryId: string; enterpriseId: string; operationalEntityId: string; state: TrustRecoveryState; requirements: string[]; evidenceReferences: string[]; adverseEvidenceReferences: string[]; history: Array<{ state: TrustRecoveryState; at: string; evidenceReferences: string[] }>; digest: string };
export function createTrustRecovery(input: Omit<TrustRecoveryRecord, "state" | "history" | "digest"> & { createdAt: string }): TrustRecoveryRecord {
  const unsigned = { recoveryId: input.recoveryId, enterpriseId: input.enterpriseId, operationalEntityId: input.operationalEntityId, state: "DEGRADED" as const, requirements: [...input.requirements], evidenceReferences: [...input.evidenceReferences], adverseEvidenceReferences: [...input.adverseEvidenceReferences], history: [{ state: "DEGRADED" as const, at: input.createdAt, evidenceReferences: [...input.adverseEvidenceReferences] }] };
  return { ...unsigned, digest: hashCanonical(unsigned) };
}
const recoveryTransitions: Record<TrustRecoveryState, TrustRecoveryState[]> = { DEGRADED: ["REMEDIATION_REQUIRED", "SUSPENDED"], REMEDIATION_REQUIRED: ["EVIDENCE_RECEIVED", "SUSPENDED"], EVIDENCE_RECEIVED: ["RE_EVALUATION"], RE_EVALUATION: ["RESTORED", "REMAINS_DEGRADED", "SUSPENDED"], RESTORED: [], REMAINS_DEGRADED: ["REMEDIATION_REQUIRED", "SUSPENDED"], SUSPENDED: ["REMEDIATION_REQUIRED"] };
export function advanceTrustRecovery(record: TrustRecoveryRecord, state: TrustRecoveryState, at: string, evidenceReferences: string[] = []): TrustRecoveryRecord {
  if (!recoveryTransitions[record.state].includes(state)) throw new TypeError(`Invalid recovery transition ${record.state} -> ${state}.`);
  if (["EVIDENCE_RECEIVED", "RESTORED"].includes(state) && !evidenceReferences.length) throw new TypeError(`${state} requires canonical evidence.`);
  const prior = { recoveryId: record.recoveryId, enterpriseId: record.enterpriseId, operationalEntityId: record.operationalEntityId, requirements: record.requirements, evidenceReferences: record.evidenceReferences, adverseEvidenceReferences: record.adverseEvidenceReferences, history: record.history };
  const unsigned = { ...prior, state, evidenceReferences: [...record.evidenceReferences, ...evidenceReferences], adverseEvidenceReferences: [...record.adverseEvidenceReferences], history: [...record.history, { state, at, evidenceReferences: [...evidenceReferences] }] };
  return { ...unsigned, digest: hashCanonical(unsigned) };
}

export type GroundedNarrativeSentence = { text: string; evidenceReferences: string[] };
export function validateGroundedNarrative(sentences: GroundedNarrativeSentence[], availableEvidence: string[]) {
  const available = new Set(availableEvidence);
  const unsupported = sentences.filter((sentence) => !sentence.evidenceReferences.length || sentence.evidenceReferences.some((reference) => !available.has(reference)));
  return { valid: unsupported.length === 0, unsupportedStatements: unsupported.map((sentence) => sentence.text), citationCompleteness: sentences.length ? (sentences.length - unsupported.length) / sentences.length : 1 };
}
export function buildDeterministicTrustNarrative(input: { entityName: string; authority: string; runtimeChangedAt: string; actionRequestedAt: string; decision: "ALLOW" | "REVIEW" | "DENY"; executionRequested: boolean; evidence: { authority: string; runtime: string; action: string; decision: string } }): GroundedNarrativeSentence[] {
  return [
    { text: `${input.entityName} remained within ${input.authority} until its runtime changed at ${input.runtimeChangedAt}.`, evidenceReferences: [input.evidence.authority, input.evidence.runtime] },
    { text: `The action requested at ${input.actionRequestedAt} resulted in ${input.decision}.`, evidenceReferences: [input.evidence.action, input.evidence.decision] },
    { text: input.executionRequested ? "Execution was requested under the recorded decision." : "No execution was requested.", evidenceReferences: [input.evidence.decision] },
  ];
}

export type TrustExplanationProjection = { whatHappened: GroundedNarrativeSentence[]; whatChanged: GroundedNarrativeSentence[]; whyTrustChanged: GroundedNarrativeSentence[]; supportingEvidence: string[]; unknowns: string[]; actionTaken: string; restorationRequirements: string[] };
export function explainOperationalTrust(input: { narrative: GroundedNarrativeSentence[]; drift: TrustDriftAssessment; health: TrustHealthAssessment; unknowns: string[]; actionTaken: string; restorationRequirements: string[] }): TrustExplanationProjection {
  return { whatHappened: input.narrative, whatChanged: input.drift.findings.map((finding) => ({ text: `${finding.condition} changed from ${finding.previousValue} to ${finding.currentValue}.`, evidenceReferences: finding.evidenceReferences })), whyTrustChanged: [{ text: `Trust health became ${input.health.overallState} because ${input.health.reasonCodes.join(", ")}.`, evidenceReferences: input.health.evidenceReferences }], supportingEvidence: [...new Set([...input.drift.evidenceReferences, ...input.health.evidenceReferences])], unknowns: [...input.unknowns], actionTaken: input.actionTaken, restorationRequirements: [...input.restorationRequirements] };
}

export type TrustRecommendation = "REFRESH_IDENTITY_EVIDENCE" | "RECONFIRM_ACCOUNTABLE_OWNER" | "REISSUE_AUTHORITY" | "REVOKE_AUTHORITY" | "REQUEST_HUMAN_REVIEW" | "REQUEST_RUNTIME_ATTESTATION" | "VERIFY_DESTINATION_OUTCOME" | "RESOLVE_PROVIDER_CONFLICT" | "INVESTIGATE_MIGRATION_GAP" | "NO_ACTION_REQUIRED";
export function recommendTrustAction(input: { drift: TrustDriftAssessment; health: TrustHealthAssessment }): { recommendation: TrustRecommendation; reasonCodes: string[]; executesAutomatically: false } {
  const conditions = new Set(input.drift.findings.map((finding) => finding.condition));
  let recommendation: TrustRecommendation = "NO_ACTION_REQUIRED";
  if (input.health.reasonCodes.includes("PROVIDER_CONFLICT")) recommendation = "RESOLVE_PROVIDER_CONFLICT";
  else if (conditions.has("runtime")) recommendation = "REQUEST_RUNTIME_ATTESTATION";
  else if (conditions.has("authority")) recommendation = /revoked/i.test(input.drift.findings.find((finding) => finding.condition === "authority")?.currentValue ?? "") ? "REISSUE_AUTHORITY" : "REQUEST_HUMAN_REVIEW";
  else if (conditions.has("identity")) recommendation = "REFRESH_IDENTITY_EVIDENCE";
  else if (conditions.has("accountableOwner")) recommendation = "RECONFIRM_ACCOUNTABLE_OWNER";
  else if (conditions.has("outcome")) recommendation = "VERIFY_DESTINATION_OUTCOME";
  else if (["REVIEW_REQUIRED", "SUSPENDED"].includes(input.health.overallState)) recommendation = "REQUEST_HUMAN_REVIEW";
  return { recommendation, reasonCodes: [...new Set([...input.drift.reasonCodes, ...input.health.reasonCodes])], executesAutomatically: false };
}

export type TrustAdvisorProjection = { currentState: TrustHealthOverallState; why: string[]; confidence: TrustConclusionConfidence; drift: TrustDriftState; recommendation: TrustRecommendation; prediction: TrustPredictionType; evidence: string[]; recovery: TrustRecoveryState; narrative: GroundedNarrativeSentence[]; derivedOnly: true };
export function buildTrustAdvisor(input: { health: TrustHealthAssessment; drift: TrustDriftAssessment; confidence: ReturnType<typeof deriveTrustConfidence>; stability: ReturnType<typeof evaluateTrustStability>; prediction: TrustPrediction; recovery: TrustRecoveryRecord; narrative: GroundedNarrativeSentence[] }): TrustAdvisorProjection {
  const recommendation = recommendTrustAction({ health: input.health, drift: input.drift });
  return { currentState: input.health.overallState, why: [...new Set([...input.health.reasonCodes, ...input.drift.reasonCodes, ...input.stability.reasonCodes])], confidence: input.confidence.level, drift: input.drift.state, recommendation: recommendation.recommendation, prediction: input.prediction.prediction, evidence: [...new Set([...input.health.evidenceReferences, ...input.drift.evidenceReferences, ...input.confidence.evidenceReferences, ...input.prediction.supportingEvidence])], recovery: input.recovery.state, narrative: input.narrative, derivedOnly: true };
}

export type EntityIntelligenceState = { enterpriseId: string; operationalEntityId: string; health: TrustHealthAssessment; drift: TrustDriftAssessment; confidence: ReturnType<typeof deriveTrustConfidence>; stability: ReturnType<typeof evaluateTrustStability>; prediction: TrustPrediction; recovery: TrustRecoveryRecord; advisor: TrustAdvisorProjection; authorityExpiresAt: string | null; staleEvidence: boolean; providerConflict: boolean; incidentOpen: boolean; repeatedReviewOutcomes: number };
export function aggregateEnterpriseTrust(states: EntityIntelligenceState[]) {
  const classifications: TrustHealthOverallState[] = ["HEALTHY", "WATCH", "DEGRADED", "REVIEW_REQUIRED", "SUSPENDED", "UNKNOWN"];
  const counts = Object.fromEntries(classifications.map((state) => [state, states.filter((item) => item.health.overallState === state).length])) as Record<TrustHealthOverallState, number>;
  const ids = (predicate: (state: EntityIntelligenceState) => boolean) => states.filter(predicate).map((state) => state.operationalEntityId);
  return { totalOperationalEntities: states.length, counts, expiringAuthority: ids((state) => Boolean(state.authorityExpiresAt)), staleEvidence: ids((state) => state.staleEvidence), unresolvedProviderConflicts: ids((state) => state.providerConflict), materialDrift: ids((state) => ["MATERIAL_DRIFT", "CRITICAL_DRIFT"].includes(state.drift.state)), involvedInIncidents: ids((state) => state.incidentOpen), awaitingRecovery: ids((state) => !["RESTORED"].includes(state.recovery.state)), insufficientEvidence: ids((state) => state.confidence.level === "INSUFFICIENT"), repeatedReviewOutcomes: ids((state) => state.repeatedReviewOutcomes >= 2) };
}

export type ProviderEvidenceDependency = { enterpriseId: string; providerId: string; operationalEntityId: string; evidenceReferences: string[]; independentEvidenceReferences: string[]; sufficientWithoutProvider: boolean };
export function evaluateRelationshipImpact(input: { enterpriseId: string; providerId: string; dependencies: ProviderEvidenceDependency[] }) {
  const scoped = input.dependencies.filter((dependency) => dependency.enterpriseId === input.enterpriseId && dependency.providerId === input.providerId);
  return { providerId: input.providerId, suppliedEntities: scoped.map((item) => item.operationalEntityId), solelyDependent: scoped.filter((item) => !item.independentEvidenceReferences.length).map((item) => item.operationalEntityId), independentlyCorroborated: scoped.filter((item) => item.independentEvidenceReferences.length > 0).map((item) => item.operationalEntityId), sufficientlySupported: scoped.filter((item) => item.sufficientWithoutProvider).map((item) => item.operationalEntityId), evidenceReferences: [...new Set(scoped.flatMap((item) => [...item.evidenceReferences, ...item.independentEvidenceReferences]))] };
}

export type ImpactClassification = "DIRECT" | "DEPENDENT" | "POTENTIAL" | "UNAFFECTED";
export type TrustRelationshipEdge = { edgeId: string; enterpriseId: string; from: string; to: string; relation: "PROVIDER_EVIDENCE" | "AUTHORITY" | "POLICY" | "CREDENTIAL" | "RUNTIME" | "CONTROL" | "WORKFLOW_DEPENDENCY" | "DECISION" | "OUTCOME"; evidenceReferences: string[] };
export type BlastRadiusResult = { impacts: Array<{ reference: string; classification: ImpactClassification; depth: number; via: string[]; evidenceReferences: string[] }>; affectedOperationalEntities: string[]; affectedAuthorities: string[]; affectedDecisions: string[]; affectedControls: string[]; affectedEnvironments: string[]; affectedEvidence: string[]; affectedOutcomes: string[]; cycleDetected: boolean; truncated: boolean; maxDepth: number };
export function analyzeBlastRadius(input: { enterpriseId: string; changedReference: string; edges: TrustRelationshipEdge[]; maxDepth?: number }): BlastRadiusResult {
  const maxDepth = Math.max(1, Math.min(12, input.maxDepth ?? 5));
  const edges = input.edges.filter((edge) => edge.enterpriseId === input.enterpriseId);
  const queue = [{ reference: input.changedReference, depth: 0, via: [input.changedReference], evidenceReferences: [] as string[] }];
  const seenDepth = new Map<string, number>([[input.changedReference, 0]]);
  const impacts: BlastRadiusResult["impacts"] = [];
  let cycleDetected = false;
  let truncated = false;
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of edges.filter((candidate) => candidate.from === current.reference)) {
      const depth = current.depth + 1;
      if (current.via.includes(edge.to)) { cycleDetected = true; continue; }
      if (depth > maxDepth) { truncated = true; continue; }
      const priorDepth = seenDepth.get(edge.to);
      if (priorDepth !== undefined && priorDepth <= depth) continue;
      seenDepth.set(edge.to, depth);
      const classification: ImpactClassification = depth === 1 ? "DIRECT" : depth <= 3 ? "DEPENDENT" : "POTENTIAL";
      const impact = { reference: edge.to, classification, depth, via: [...current.via, edge.to], evidenceReferences: [...new Set([...current.evidenceReferences, ...edge.evidenceReferences])] };
      impacts.push(impact); queue.push(impact);
    }
  }
  const references = (prefix: string) => impacts.filter((impact) => impact.reference.startsWith(prefix)).map((impact) => impact.reference);
  return { impacts, affectedOperationalEntities: references("entity:"), affectedAuthorities: references("authority:"), affectedDecisions: references("decision:"), affectedControls: references("control:"), affectedEnvironments: references("environment:"), affectedEvidence: references("evidence:"), affectedOutcomes: references("outcome:"), cycleDetected, truncated, maxDepth };
}

export type TrustCascade = { cascadeId: string; rootChangeReference: string; edges: Array<{ from: string; to: string; explanation: string; evidenceReferences: string[]; depth: number }>; affectedEntities: string[]; cycleDetected: boolean; truncated: boolean; resolved: boolean; derivedOnly: true };
export function buildTrustCascade(input: { enterpriseId: string; rootChangeReference: string; relationships: TrustRelationshipEdge[]; maxDepth?: number; resolvedReferences?: string[] }): TrustCascade {
  const blast = analyzeBlastRadius({ enterpriseId: input.enterpriseId, changedReference: input.rootChangeReference, edges: input.relationships, maxDepth: input.maxDepth });
  const byPair = new Map(input.relationships.filter((edge) => edge.enterpriseId === input.enterpriseId).map((edge) => [`${edge.from}->${edge.to}`, edge]));
  const edges = blast.impacts.map((impact) => { const from = impact.via.at(-2)!; const edge = byPair.get(`${from}->${impact.reference}`)!; return { from, to: impact.reference, explanation: `${edge.relation} connects ${from} to ${impact.reference}.`, evidenceReferences: edge.evidenceReferences, depth: impact.depth }; });
  const unresolved = blast.impacts.filter((impact) => !(input.resolvedReferences ?? []).includes(impact.reference));
  const unsigned = { rootChangeReference: input.rootChangeReference, edges, affectedEntities: blast.affectedOperationalEntities, cycleDetected: blast.cycleDetected, truncated: blast.truncated, resolved: unresolved.length === 0, derivedOnly: true as const };
  return { cascadeId: `cascade:${hashCanonical(unsigned).slice(0, 24)}`, ...unsigned };
}

export type EnterpriseDecisionHistoryRecord = { enterpriseId: string; decisionId: string; operationalEntityId: string; changeType: TrustChangeType; decision: "ALLOW" | "REVIEW" | "DENY"; resolution: string; evidenceReferences: string[]; decidedAt: string };
export function retrieveComparableDecisionHistory(input: { enterpriseId: string; changeType: TrustChangeType; records: EnterpriseDecisionHistoryRecord[]; limit?: number }) {
  const matches = input.records.filter((record) => record.enterpriseId === input.enterpriseId && record.changeType === input.changeType).sort((a, b) => b.decidedAt.localeCompare(a.decidedAt)).slice(0, input.limit ?? 50);
  const resolutions = Object.entries(matches.reduce<Record<string, number>>((counts, record) => ({ ...counts, [record.resolution]: (counts[record.resolution] ?? 0) + 1 }), {})).map(([resolution, count]) => ({ resolution, count }));
  return { comparableCount: matches.length, reviewedCount: matches.filter((record) => record.decision === "REVIEW").length, resolutions, records: matches, customerOwnedRetrievalOnly: true, crossTenantRecordsIncluded: false };
}

export type HumanFeedbackOutcome = "AGREE" | "DISAGREE" | "OVERRIDE_ALLOW" | "OVERRIDE_DENY" | "REQUEST_MORE_EVIDENCE" | "FALSE_POSITIVE" | "FALSE_NEGATIVE" | "OTHER";
export type HumanFeedbackRecord = { feedbackId: string; enterpriseId: string; operationalEntityId: string; reviewer: string; role: string; timestamp: string; outcome: HumanFeedbackOutcome; originalRecommendation: TrustRecommendation; originalDecision: string; reason: string; supportingEvidence: string[]; originalDecisionDigest: string };
export function appendHumanFeedback(history: HumanFeedbackRecord[], feedback: HumanFeedbackRecord) {
  if (history.some((item) => item.feedbackId === feedback.feedbackId)) return [...history];
  if (!feedback.reason.trim() || !feedback.reviewer || !feedback.role) throw new TypeError("Attributed human feedback requires reviewer, role and reason.");
  return [...history.map((item) => structuredClone(item)), structuredClone(feedback)];
}

export type AIOutputClassification = "AI_GENERATED" | "AI_GROUNDED" | "AI_UNVERIFIED" | "DETERMINISTIC_FALLBACK";
export type AssistedTrustOutput = { classification: AIOutputClassification; statements: GroundedNarrativeSentence[]; unsupportedStatements: string[]; evidenceReferences: string[]; authoritative: false };
export function validateAssistedTrustOutput(input: { statements: GroundedNarrativeSentence[]; availableEvidence: string[]; aiConfigured: boolean }): AssistedTrustOutput {
  if (!input.aiConfigured) return { classification: "DETERMINISTIC_FALLBACK", statements: input.statements, unsupportedStatements: [], evidenceReferences: [...new Set(input.statements.flatMap((statement) => statement.evidenceReferences))], authoritative: false };
  const validation = validateGroundedNarrative(input.statements, input.availableEvidence);
  return { classification: validation.valid ? "AI_GROUNDED" : "AI_UNVERIFIED", statements: input.statements, unsupportedStatements: validation.unsupportedStatements, evidenceReferences: [...new Set(input.statements.flatMap((statement) => statement.evidenceReferences).filter((reference) => input.availableEvidence.includes(reference)))], authoritative: false };
}

export type AIAssistanceEvaluation = { evaluationId: string; evaluatedAt: string; groundedness: number; unsupportedClaimRate: number; evidenceCitationCompleteness: number; recommendationAgreement: number; contradictionDetection: number; deterministicFallbackSuccess: number; canonicalTruth: false };
export function evaluateAIAssistance(input: { evaluatedAt: string; outputs: AssistedTrustOutput[]; expectedRecommendation: TrustRecommendation; proposedRecommendations: TrustRecommendation[]; expectedContradictions: number; detectedContradictions: number; fallbackAttempts: number; fallbackSuccesses: number }): AIAssistanceEvaluation {
  const statements = input.outputs.flatMap((output) => output.statements);
  const unsupported = input.outputs.flatMap((output) => output.unsupportedStatements);
  const grounded = input.outputs.filter((output) => ["AI_GROUNDED", "DETERMINISTIC_FALLBACK"].includes(output.classification)).length;
  const unsigned = { evaluatedAt: input.evaluatedAt, groundedness: input.outputs.length ? grounded / input.outputs.length : 1, unsupportedClaimRate: statements.length ? unsupported.length / statements.length : 0, evidenceCitationCompleteness: statements.length ? statements.filter((statement) => statement.evidenceReferences.length).length / statements.length : 1, recommendationAgreement: input.proposedRecommendations.length ? input.proposedRecommendations.filter((recommendation) => recommendation === input.expectedRecommendation).length / input.proposedRecommendations.length : 0, contradictionDetection: input.expectedContradictions ? Math.min(1, input.detectedContradictions / input.expectedContradictions) : 1, deterministicFallbackSuccess: input.fallbackAttempts ? input.fallbackSuccesses / input.fallbackAttempts : 1, canonicalTruth: false as const };
  return { evaluationId: `ai-eval:${hashCanonical(unsigned).slice(0, 24)}`, ...unsigned };
}

function healthDimensions(states: Partial<Record<TrustHealthDimension, TrustHealthDimensionState>>, refs: string[], reasons: string[] = []): TrustHealthAssessment["dimensions"] {
  return Object.fromEntries(trustHealthDimensions.map((dimension) => [dimension, { state: states[dimension] ?? "SUPPORTED", reasonCodes: states[dimension] && states[dimension] !== "SUPPORTED" ? [...reasons, `${dimension}_${states[dimension]}`] : [], evidenceReferences: [...refs] }])) as TrustHealthAssessment["dimensions"];
}

export function buildContinuousOperationalTrustScenario() {
  const enterpriseId = "enterprise:acme";
  const alpha = operationalEntityFixtures.find((entity) => entity.entityId === "entity:alpha")!;
  const deltaId = "entity:workflow-delta";
  const times = { healthy: "2026-08-08T14:00:00.000Z", stale: "2026-08-08T14:20:00.000Z", runtime: "2026-08-08T14:31:00.000Z", criticalAction: "2026-08-08T14:34:00.000Z", attestation: "2026-08-08T15:00:00.000Z", restored: "2026-08-08T15:10:00.000Z" };
  const baseline: TrustConditionState = { stateReference: "state:alpha:healthy", identity: "identity:alpha:v1", accountableOwner: alpha.accountableOwnerId, authority: "authority:alpha:v3:valid", toolScope: ["repository:read", "deployment:request"], targetScope: ["repository:alpha"], environment: "staging", runtime: "runtime:alpha:v1", provider: "provider:a", evidenceFreshness: "CURRENT", evidenceIndependence: "multi_source", behaviour: "within_baseline", outcome: "confirmed", incidentState: "none", evidenceByCondition: { identity: ["evidence:identity:alpha"], accountableOwner: ["evidence:owner:alpha"], authority: ["evidence:authority:alpha:v3"], toolScope: ["evidence:authority:alpha:v3"], targetScope: ["evidence:authority:alpha:v3"], environment: ["evidence:environment:staging"], runtime: ["evidence:runtime:alpha:v1"], provider: ["evidence:provider:a"], evidenceFreshness: ["evidence:provider:a"], evidenceIndependence: ["evidence:runtime:alpha:v1", "evidence:provider:a"], behaviour: ["evidence:replay:alpha"], outcome: ["evidence:destination:alpha"], incidentState: ["evidence:incident:none"] } };
  const staleState: TrustConditionState = { ...baseline, stateReference: "state:alpha:watch", evidenceFreshness: "STALE", evidenceByCondition: { ...baseline.evidenceByCondition, evidenceFreshness: ["evidence:provider:a:expired"] } };
  const runtimeState: TrustConditionState = { ...staleState, stateReference: "state:alpha:degraded", runtime: "runtime:alpha:v2:unattested", incidentState: "incident:alpha:open", evidenceByCondition: { ...staleState.evidenceByCondition, runtime: ["evidence:runtime:alpha:v2"], incidentState: ["incident:alpha:runtime-change"] } };
  const restoredState: TrustConditionState = { ...runtimeState, stateReference: "state:alpha:restored", runtime: "runtime:alpha:v2:attested", evidenceFreshness: "CURRENT", incidentState: "incident:alpha:resolved", evidenceByCondition: { ...runtimeState.evidenceByCondition, runtime: ["evidence:runtime:alpha:v2", "evidence:attestation:alpha:v2", "review:alpha:runtime-confirmed"], evidenceFreshness: ["evidence:attestation:alpha:v2"], incidentState: ["incident:alpha:resolved"] } };
  const staleDrift = evaluateTrustDrift({ previous: baseline, current: staleState, expectedConditions: ["evidenceFreshness"], evaluatedAt: times.stale });
  const runtimeDrift = evaluateTrustDrift({ previous: staleState, current: runtimeState, evaluatedAt: times.runtime });
  const restoredDrift = evaluateTrustDrift({ previous: runtimeState, current: restoredState, approvedConditions: ["runtime", "evidenceFreshness", "incidentState"], evaluatedAt: times.restored });
  const healthy = deriveTrustHealth(healthDimensions({}, ["evidence:identity:alpha", "evidence:authority:alpha:v3", "evidence:runtime:alpha:v1"]));
  const watch = deriveTrustHealth(healthDimensions({ EVIDENCE: "PARTIAL" }, ["evidence:provider:a:expired", "evidence:authority:alpha:v3"], ["EVIDENCE_STALE"]));
  const degraded = deriveTrustHealth(healthDimensions({ EVIDENCE: "DEGRADED", CONTINUITY: "DEGRADED", INCIDENT: "DEGRADED" }, ["evidence:runtime:alpha:v2", "incident:alpha:runtime-change"], ["RUNTIME_ATTESTATION_MISSING", "INCIDENT_OPEN"]));
  const restoredHealth = deriveTrustHealth(healthDimensions({}, ["evidence:attestation:alpha:v2", "review:alpha:runtime-confirmed", "incident:alpha:resolved"]));
  const confidence = { healthy: deriveTrustConfidence({ evidenceCompleteness: 1, evidenceFreshness: 1, sourceIndependence: 0.9, providerAgreement: 1, authorityCertainty: 1, outcomeConfirmation: 1, continuity: 1, unresolvedContradictions: 0, evidenceReferences: healthy.evidenceReferences }), stale: deriveTrustConfidence({ evidenceCompleteness: 0.8, evidenceFreshness: 0.1, sourceIndependence: 0.8, providerAgreement: 1, authorityCertainty: 1, outcomeConfirmation: 1, continuity: 0.6, unresolvedContradictions: 0, evidenceReferences: watch.evidenceReferences }), degraded: deriveTrustConfidence({ evidenceCompleteness: 0.7, evidenceFreshness: 0.4, sourceIndependence: 0.7, providerAgreement: 0.8, authorityCertainty: 1, outcomeConfirmation: 0.8, continuity: 0.3, unresolvedContradictions: 1, evidenceReferences: degraded.evidenceReferences }) };
  const changes = [
    createTrustChangeEvent({ enterpriseId, operationalEntityId: alpha.entityId, transactionId: null, changeType: "EVIDENCE_STALE", previousStateReference: baseline.stateReference, currentStateReference: staleState.stateReference, evidenceReferences: staleDrift.evidenceReferences, authorityReferences: ["authority:alpha:v3"], providerReferences: ["provider:a"], incidentReferences: [], detectedAt: times.stale, effectiveAt: times.stale, materiality: "LOW", confidence: "HIGH", reasonCodes: staleDrift.reasonCodes, recommendedEvaluation: "RE_EVALUATE" }),
    createTrustChangeEvent({ enterpriseId, operationalEntityId: alpha.entityId, transactionId: "transaction:alpha:critical", changeType: "RUNTIME_CHANGED", previousStateReference: staleState.stateReference, currentStateReference: runtimeState.stateReference, evidenceReferences: runtimeDrift.evidenceReferences, authorityReferences: ["authority:alpha:v3"], providerReferences: ["provider:runtime"], incidentReferences: ["incident:alpha:runtime-change"], detectedAt: times.runtime, effectiveAt: times.runtime, materiality: "HIGH", confidence: "HIGH", reasonCodes: runtimeDrift.reasonCodes, recommendedEvaluation: "REVIEW" }),
    createTrustChangeEvent({ enterpriseId, operationalEntityId: alpha.entityId, transactionId: null, changeType: "RECOVERY_EVIDENCE_RECEIVED", previousStateReference: runtimeState.stateReference, currentStateReference: restoredState.stateReference, evidenceReferences: ["evidence:attestation:alpha:v2", "review:alpha:runtime-confirmed"], authorityReferences: ["authority:alpha:v3"], providerReferences: ["provider:runtime"], incidentReferences: ["incident:alpha:runtime-change"], detectedAt: times.attestation, effectiveAt: times.attestation, materiality: "MODERATE", confidence: "HIGH", reasonCodes: ["CURRENT_RUNTIME_ATTESTED", "HUMAN_REVIEW_CONFIRMED"], recommendedEvaluation: "RE_EVALUATE" }),
  ];
  let recovery = createTrustRecovery({ recoveryId: "recovery:alpha:runtime-v2", enterpriseId, operationalEntityId: alpha.entityId, requirements: ["new attestation", "human approval", "incident remediation evidence"], evidenceReferences: [], adverseEvidenceReferences: ["evidence:runtime:alpha:v2", "incident:alpha:runtime-change"], createdAt: times.runtime });
  recovery = advanceTrustRecovery(recovery, "REMEDIATION_REQUIRED", "2026-08-08T14:35:00.000Z"); recovery = advanceTrustRecovery(recovery, "EVIDENCE_RECEIVED", times.attestation, ["evidence:attestation:alpha:v2"]); recovery = advanceTrustRecovery(recovery, "RE_EVALUATION", "2026-08-08T15:05:00.000Z"); recovery = advanceTrustRecovery(recovery, "RESTORED", times.restored, ["review:alpha:runtime-confirmed", "incident:alpha:resolved"]);
  const narrative = buildDeterministicTrustNarrative({ entityName: "Agent Alpha", authority: "delegated repository-read authority", runtimeChangedAt: "14:31", actionRequestedAt: "14:34", decision: "REVIEW", executionRequested: false, evidence: { authority: "evidence:authority:alpha:v3", runtime: "evidence:runtime:alpha:v2", action: "transaction:alpha:critical", decision: "decision:alpha:critical:review" } });
  const prediction = predictOperationalTrust({ generatedAt: times.stale, horizonHours: 24, evidenceExpiresAt: times.stale, authorityExpiresAt: "2026-08-09T08:00:00.000Z", providerGap: false, unresolvedMaterialDrift: false, policyEscalationExpected: true, supportingEvidence: ["evidence:provider:a:expired", "evidence:authority:alpha:v3"], historicalBasis: ["decision-history:runtime-change:1"] });
  const stability = evaluateTrustStability({ events: changes, asOf: times.restored });
  const advisor = buildTrustAdvisor({ health: degraded, drift: runtimeDrift, confidence: confidence.degraded, stability, prediction, recovery, narrative });
  const relationships: TrustRelationshipEdge[] = [
    { edgeId: "edge:credential-alpha", enterpriseId, from: "credential:signing-alpha", to: "authority:alpha:v3", relation: "CREDENTIAL", evidenceReferences: ["evidence:credential:alpha"] },
    { edgeId: "edge:authority-alpha", enterpriseId, from: "authority:alpha:v3", to: alpha.entityId, relation: "AUTHORITY", evidenceReferences: ["evidence:authority:alpha:v3"] },
    { edgeId: "edge:alpha-delta", enterpriseId, from: alpha.entityId, to: deltaId, relation: "WORKFLOW_DEPENDENCY", evidenceReferences: ["evidence:workflow:delta-depends-alpha"] },
    { edgeId: "edge:delta-decision", enterpriseId, from: deltaId, to: "decision:workflow-delta:review", relation: "DECISION", evidenceReferences: ["policy:deployment-approval:v5"] },
    { edgeId: "edge:cycle", enterpriseId, from: deltaId, to: alpha.entityId, relation: "WORKFLOW_DEPENDENCY", evidenceReferences: ["evidence:cycle-test"] },
  ];
  const blastRadius = analyzeBlastRadius({ enterpriseId, changedReference: alpha.entityId, edges: relationships, maxDepth: 5 });
  const cascade = buildTrustCascade({ enterpriseId, rootChangeReference: alpha.entityId, relationships, maxDepth: 5 });
  const resolvedCascade = buildTrustCascade({ enterpriseId, rootChangeReference: alpha.entityId, relationships, maxDepth: 5, resolvedReferences: [deltaId, "decision:workflow-delta:review"] });
  const replay = ["ALPHA_HEALTHY", "PROVIDER_EVIDENCE_STALE", "CONFIDENCE_DROPPED", "LOW_CONSEQUENCE_ALLOWED", "CRITICAL_ACTION_REVIEW", "RUNTIME_CHANGED", "MATERIAL_DRIFT", "INCIDENT_OPENED", "BLAST_RADIUS_EVALUATED", "WORKFLOW_DELTA_REVIEW_REQUIRED", "ATTESTATION_RECEIVED", "HUMAN_REVIEW_CONFIRMED", "ALPHA_RESTORED", "WORKFLOW_DELTA_REEVALUATED", "CASCADE_RESOLVED"].map((eventType, index) => ({ eventId: `replay:intelligence:${index + 1}`, eventType, operationalEntityId: eventType.includes("DELTA") ? deltaId : alpha.entityId, evidenceReferences: index >= 10 ? ["evidence:attestation:alpha:v2"] : ["evidence:replay:alpha"], occurredAt: new Date(Date.parse(times.healthy) + index * 300_000).toISOString() }));
  const trustMemory = changes.filter((event) => ["LOW", "MODERATE", "HIGH", "CRITICAL"].includes(event.materiality)).map((event) => ({ eventId: `memory:${event.eventId}`, changeEventId: event.eventId, eventType: event.changeType, evidenceReferences: event.evidenceReferences }));
  const alphaState: EntityIntelligenceState = { enterpriseId, operationalEntityId: alpha.entityId, health: degraded, drift: runtimeDrift, confidence: confidence.degraded, stability, prediction, recovery, advisor, authorityExpiresAt: "2026-08-09T08:00:00.000Z", staleEvidence: true, providerConflict: false, incidentOpen: true, repeatedReviewOutcomes: 2 };
  const deltaHealth = deriveTrustHealth(healthDimensions({ CONTINUITY: "DEGRADED" }, ["evidence:workflow:delta-depends-alpha"], ["DEPENDENCY_REEVALUATION_REQUIRED"]));
  const deltaRecovery = createTrustRecovery({ recoveryId: "recovery:workflow-delta", enterpriseId, operationalEntityId: deltaId, requirements: ["dependency re-evaluation"], evidenceReferences: [], adverseEvidenceReferences: ["evidence:workflow:delta-depends-alpha"], createdAt: times.runtime });
  const deltaDrift = evaluateTrustDrift({ previous: { ...baseline, stateReference: "state:delta:healthy" }, current: { ...baseline, stateReference: "state:delta:review", incidentState: "dependency_incident", evidenceByCondition: { ...baseline.evidenceByCondition, incidentState: ["evidence:workflow:delta-depends-alpha"] } }, evaluatedAt: times.runtime });
  const deltaConfidence = deriveTrustConfidence({ evidenceCompleteness: 0.8, evidenceFreshness: 0.9, sourceIndependence: 0.8, providerAgreement: 1, authorityCertainty: 0.7, outcomeConfirmation: 0.6, continuity: 0.4, unresolvedContradictions: 0, evidenceReferences: ["evidence:workflow:delta-depends-alpha"] });
  const deltaPrediction = predictOperationalTrust({ generatedAt: times.runtime, horizonHours: 4, providerGap: false, unresolvedMaterialDrift: true, policyEscalationExpected: false, supportingEvidence: ["evidence:workflow:delta-depends-alpha"], historicalBasis: [] });
  const deltaAdvisor = buildTrustAdvisor({ health: deltaHealth, drift: deltaDrift, confidence: deltaConfidence, stability, prediction: deltaPrediction, recovery: deltaRecovery, narrative: [{ text: "Workflow Delta requires review because it depends on Agent Alpha.", evidenceReferences: ["evidence:workflow:delta-depends-alpha"] }] });
  const deltaState: EntityIntelligenceState = { enterpriseId, operationalEntityId: deltaId, health: { ...deltaHealth, overallState: "REVIEW_REQUIRED" }, drift: deltaDrift, confidence: deltaConfidence, stability, prediction: deltaPrediction, recovery: deltaRecovery, advisor: { ...deltaAdvisor, currentState: "REVIEW_REQUIRED" }, authorityExpiresAt: null, staleEvidence: false, providerConflict: false, incidentOpen: false, repeatedReviewOutcomes: 1 };
  return { enterpriseId, alpha, workflowDeltaId: deltaId, times, states: { baseline, stale: staleState, runtime: runtimeState, restored: restoredState }, drift: { stale: staleDrift, runtime: runtimeDrift, restored: restoredDrift }, health: { healthy, watch, degraded, restored: restoredHealth }, confidence, changes, stability, prediction, recovery, narrative, explanation: explainOperationalTrust({ narrative, drift: runtimeDrift, health: degraded, unknowns: ["Whether the new runtime will remain stable after the evaluation window."], actionTaken: "Critical action held for human review; no execution requested.", restorationRequirements: ["Current runtime attestation", "Human confirmation", "Incident remediation evidence"] }), advisor, lowConsequenceDecision: "ALLOW" as const, criticalDecision: "REVIEW" as const, authorityRemainsValid: true, incident: { incidentId: "incident:alpha:runtime-change", state: "RESOLVED", openedAt: times.runtime, resolvedAt: times.restored }, relationships, blastRadius, cascade, resolvedCascade, network: aggregateEnterpriseTrust([alphaState, deltaState]), replay, trustMemory };
}

export function benchmarkContinuousOperationalTrustIntelligence(sampleCount = 1_000) {
  const scenario = buildContinuousOperationalTrustScenario();
  const started = performance.now();
  for (let index = 0; index < sampleCount; index += 1) deriveTrustHealth(scenario.health.degraded.dimensions);
  const entityEvaluationMs = performance.now() - started;
  const states = Array.from({ length: sampleCount }, (_, index) => ({ ...({ enterpriseId: scenario.enterpriseId, operationalEntityId: `entity:benchmark:${index}`, health: scenario.health.degraded, drift: scenario.drift.runtime, confidence: scenario.confidence.degraded, stability: scenario.stability, prediction: scenario.prediction, recovery: scenario.recovery, advisor: scenario.advisor, authorityExpiresAt: null, staleEvidence: index % 3 === 0, providerConflict: index % 10 === 0, incidentOpen: index % 20 === 0, repeatedReviewOutcomes: index % 4 }) } as EntityIntelligenceState));
  const aggregateStarted = performance.now(); const aggregate = aggregateEnterpriseTrust(states); const trustCentreAggregationMs = performance.now() - aggregateStarted;
  const blastStarted = performance.now(); analyzeBlastRadius({ enterpriseId: scenario.enterpriseId, changedReference: scenario.alpha.entityId, edges: scenario.relationships, maxDepth: 5 }); const blastRadiusTraversalMs = performance.now() - blastStarted;
  const replayStarted = performance.now(); scenario.replay.filter((event) => event.operationalEntityId === scenario.alpha.entityId); const replayRetrievalMs = performance.now() - replayStarted;
  return { environment: { runtime: `Node ${process.version}`, mode: "local deterministic in-process", externalProviders: false, database: false }, sampleCount, singleEntityEvaluationMs: entityEvaluationMs / sampleCount, oneHundredEntitiesEstimatedMs: entityEvaluationMs / sampleCount * 100, oneThousandEntitiesMs: entityEvaluationMs, blastRadiusTraversalMs, replayRetrievalMs, trustCentreAggregationMs, aggregateTotal: aggregate.totalOperationalEntities, limitation: "Local in-process synthetic benchmark; not a Production-scale or network/database performance claim." };
}
