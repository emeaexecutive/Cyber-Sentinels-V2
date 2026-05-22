type HumanPresenceSignals = {
  biometricConfidence: number;
  behaviouralConsistency: number;
  livenessScore: number;
  imageAuthenticityScore: number;
  trustTimelineScore: number;
  voiceCloneRisk: number;
  videoDeepfakeRisk: number;
  syntheticRisk: number;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateHumanPresenceIndex(signals: HumanPresenceSignals) {
  const positiveSignal =
    signals.biometricConfidence * 0.2 +
    signals.behaviouralConsistency * 0.2 +
    signals.livenessScore * 0.2 +
    signals.imageAuthenticityScore * 0.15 +
    signals.trustTimelineScore * 0.15;

  const riskPenalty =
    signals.voiceCloneRisk * 0.05 +
    signals.videoDeepfakeRisk * 0.07 +
    signals.syntheticRisk * 0.08;

  return clampScore(positiveSignal - riskPenalty);
}
