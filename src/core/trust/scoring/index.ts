export type WeightedValue = {
  score: number;
  confidence: number;
  weight: number;
};

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}

export function weightedScore(values: WeightedValue[]): number {
  const supported = values.filter((item) => item.weight > 0 && item.confidence > 0);
  const denominator = supported.reduce((sum, item) => sum + item.weight * item.confidence, 0);
  if (!denominator) return 0;
  return clampScore(
    supported.reduce(
      (sum, item) => sum + clampScore(item.score) * item.weight * item.confidence,
      0,
    ) / denominator,
  );
}

export function confidencePercent(values: WeightedValue[]): number {
  const weight = values.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (!weight) return 0;
  return clampScore(
    (values.reduce(
      (sum, item) => sum + Math.max(0, Math.min(1, item.confidence)) * item.weight,
      0,
    ) / weight) * 100,
  );
}
