import type { TrustScoreSignals } from "@/types/trust";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateTrustScore(signals: TrustScoreSignals) {
  const positiveSignal =
    (signals.humanPresenceIndex ?? 50) * 0.35 +
    (signals.originTraceScore ?? 50) * 0.2 +
    (signals.livenessScore ?? 50) * 0.15 +
    (signals.imageAuthenticityScore ?? 50) * 0.15;

  const riskPenalty =
    (signals.syntheticRisk ?? 0) * 0.08 +
    (signals.voiceCloneRisk ?? 0) * 0.04 +
    (signals.videoDeepfakeRisk ?? 0) * 0.08;

  const reviewAdjustment =
    signals.reviewOutcome === "allow"
      ? 10
      : signals.reviewOutcome === "deny"
        ? -25
        : signals.reviewOutcome === "manual_review"
          ? -5
          : 0;

  return clampScore(positiveSignal - riskPenalty + reviewAdjustment);
}
