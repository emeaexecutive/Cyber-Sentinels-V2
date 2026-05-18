export function calculateTrustScore(
  profileConsistency: number,
  syntheticRisk: number,
  confidence: number
) {
  const score =
    profileConsistency * 0.45 +
    confidence * 0.45 -
    syntheticRisk * 0.25;

  return Math.max(0, Math.min(100, Math.round(score)));
}