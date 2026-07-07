export type RuntimeSignalKey =
  | "deviceMismatch"
  | "impossibleVelocity"
  | "suspiciousSessionChange"
  | "repeatedFailedVerification"
  | "provenanceConflict"
  | "agentRuntimeAnomaly"
  | "authorizationAnomaly"
  | "virtualCameraIndicator"
  | "documentMismatch";

export type RuntimeTrustInput = {
  previousScore?: number;
  signals?: Partial<Record<RuntimeSignalKey, boolean | number>>;
  evidenceReferences?: string[];
  evidenceWeights?: Partial<Record<string, number>>;
  providerAgreement?: number | null;
  governanceOpen?: boolean;
  workflowStage?: string;
  previousPosture?: RuntimePosture;
  authorizationPattern?: "expected" | "unusual" | "unknown";
};

export type RuntimePosture = "stable" | "watch" | "review" | "escalated";
export type RuntimeRiskProgression = "improving" | "unchanged" | "degrading" | "materially_degrading";

const SIGNAL_WEIGHTS: Record<RuntimeSignalKey, number> = {
  deviceMismatch: 12,
  impossibleVelocity: 20,
  suspiciousSessionChange: 14,
  repeatedFailedVerification: 14,
  provenanceConflict: 18,
  agentRuntimeAnomaly: 18,
  authorizationAnomaly: 22,
  virtualCameraIndicator: 18,
  documentMismatch: 22,
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

function signalStrength(value: boolean | number | undefined) {
  if (value === true) return 1;
  if (value === false || value === undefined) return 0;
  return clamp(value, 0, 1);
}

function evidenceContribution(input: RuntimeTrustInput) {
  const references = input.evidenceReferences ?? [];
  if (!references.length) {
    return {
      total: 0,
      items: [] as Array<{ reference: string; weight: number; contribution: number }>,
    };
  }
  const items = references.map((reference) => {
    const weight = clamp(input.evidenceWeights?.[reference] ?? 0.5, 0, 1);
    return {
      reference,
      weight,
      contribution: Number((weight * 2).toFixed(2)),
    };
  });
  return {
    total: Math.min(10, Number(items.reduce((total, item) => total + item.contribution, 0).toFixed(2))),
    items,
  };
}

function riskProgression(drift: number): RuntimeRiskProgression {
  if (drift >= 5) return "improving";
  if (drift <= -20) return "materially_degrading";
  if (drift < -5) return "degrading";
  return "unchanged";
}

export function evaluateRuntimeTrust(input: RuntimeTrustInput) {
  const previousScore = clamp(input.previousScore ?? 100);
  const weightedSignals = (Object.keys(SIGNAL_WEIGHTS) as RuntimeSignalKey[])
    .map((key) => {
      const strength = signalStrength(input.signals?.[key]);
      return {
        key,
        strength,
        weight: SIGNAL_WEIGHTS[key],
        contribution: Number((strength * SIGNAL_WEIGHTS[key]).toFixed(2)),
      };
    })
    .filter((signal) => signal.strength > 0);
  const anomalyPenalty = weightedSignals.reduce(
    (total, signal) => total + signal.contribution,
    0
  );
  const providerAgreement = input.providerAgreement == null
    ? null
    : clamp(input.providerAgreement, 0, 1);
  const providerAdjustment = providerAgreement == null
    ? 0
    : Math.round((providerAgreement - 0.5) * 10);
  const evidenceWeighting = evidenceContribution(input);
  const evidenceWeight = evidenceWeighting.total;
  const score = clamp(previousScore - anomalyPenalty + providerAdjustment + evidenceWeight);
  const drift = Number((score - previousScore).toFixed(2));
  const escalationReasons = [
    ...weightedSignals
      .filter((signal) => signal.weight >= 20 || signal.contribution >= 16)
      .map((signal) => signal.key),
    ...(input.governanceOpen ? ["governanceReviewOpen"] : []),
    ...(input.authorizationPattern === "unusual" ? ["unusualAuthorizationPattern"] : []),
  ];
  const posture: RuntimePosture =
    escalationReasons.length || score < 45
      ? "escalated"
      : score < 65
        ? "review"
        : score < 80
          ? "watch"
          : "stable";
  const progression = riskProgression(drift);
  const anomalyAggregation = {
    count: weightedSignals.length,
    totalPenalty: Number(anomalyPenalty.toFixed(2)),
    highestImpactSignals: weightedSignals
      .filter((signal) => signal.contribution >= 14)
      .map((signal) => signal.key),
  };
  const governanceEscalationTriggers = escalationReasons.map((reason) => ({
    reason,
    source: "Runtime Intelligence" as const,
    requiresNamedReviewer: true,
    evidenceReferences: [...(input.evidenceReferences ?? [])],
  }));

  return {
    score: Math.round(score),
    previousScore: Math.round(previousScore),
    drift,
    posture,
    previousPosture: input.previousPosture ?? null,
    workflowStage: input.workflowStage ?? "unspecified",
    riskProgression: progression,
    source: "Runtime Intelligence" as const,
    confidence: weightedSignals.length
      ? Math.min(0.8, Number((0.45 + weightedSignals.length * 0.05).toFixed(2)))
      : 0.35,
    evidence: [...(input.evidenceReferences ?? [])],
    evidenceWeighting,
    weightedSignals,
    anomalyAggregation,
    providerAgreement,
    providerAgreementWeight: providerAgreement == null ? 0 : providerAdjustment,
    escalationRequired: posture === "escalated",
    escalationReasons,
    governanceEscalationTriggers,
    explanation: {
      whatChanged: `Runtime trust moved from ${Math.round(previousScore)} to ${Math.round(score)} during ${input.workflowStage ?? "the workflow"}.`,
      whyTrustChanged: weightedSignals.length
        ? weightedSignals
            .map((signal) => `${signal.key} contributed ${signal.contribution} risk points`)
            .join("; ")
        : "No material runtime anomaly was present in the supplied signals.",
      providerAgreement: providerAgreement == null
        ? "No provider agreement score was supplied."
        : `Provider agreement adjusted the posture by ${providerAdjustment} point(s).`,
      governance: escalationReasons.length
        ? "Escalation is required because high-impact runtime or governance triggers are present."
        : "No runtime escalation trigger was present; retain evidence under workflow policy.",
    },
    limitations: [
      "Deterministic runtime aggregation; not trained machine learning.",
      "Weights require validation and calibration against approved workflow datasets.",
      "Runtime posture supports governance review and is not a final authenticity verdict.",
    ],
  };
}
