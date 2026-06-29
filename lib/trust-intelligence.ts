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
