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
  providerAgreement?: number | null;
  governanceOpen?: boolean;
};

export type RuntimePosture = "stable" | "watch" | "review" | "escalated";

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
  const evidenceWeight = Math.min(10, (input.evidenceReferences?.length ?? 0) * 2);
  const score = clamp(previousScore - anomalyPenalty + providerAdjustment + evidenceWeight);
  const drift = Number((score - previousScore).toFixed(2));
  const escalationReasons = [
    ...weightedSignals
      .filter((signal) => signal.weight >= 20 || signal.contribution >= 16)
      .map((signal) => signal.key),
    ...(input.governanceOpen ? ["governanceReviewOpen"] : []),
  ];
  const posture: RuntimePosture =
    escalationReasons.length || score < 45
      ? "escalated"
      : score < 65
        ? "review"
        : score < 80
          ? "watch"
          : "stable";

  return {
    score: Math.round(score),
    previousScore: Math.round(previousScore),
    drift,
    posture,
    source: "Runtime Intelligence" as const,
    confidence: weightedSignals.length
      ? Math.min(0.8, Number((0.45 + weightedSignals.length * 0.05).toFixed(2)))
      : 0.35,
    evidence: [...(input.evidenceReferences ?? [])],
    weightedSignals,
    providerAgreement,
    escalationRequired: posture === "escalated",
    escalationReasons,
    limitations: [
      "Deterministic runtime aggregation; not trained machine learning.",
      "Weights require validation and calibration against approved workflow datasets.",
      "Runtime posture supports governance review and is not a final authenticity verdict.",
    ],
  };
}

