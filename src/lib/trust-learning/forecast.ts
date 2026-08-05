import { hashCanonical } from "../trust-core/hash.ts";
import type { EnterpriseTrustPattern, HistoricalTrustForecast } from "./types.ts";

export function buildHistoricalTrustForecast(input: { pattern: EnterpriseTrustPattern; comparisonPopulation: string; sampleSize: number; matchingCaseCount: number }): HistoricalTrustForecast {
  if (!Number.isInteger(input.sampleSize) || input.sampleSize < 1 || !Number.isInteger(input.matchingCaseCount) || input.matchingCaseCount < 0 || input.matchingCaseCount > input.sampleSize) throw new Error("Historical comparison counts are invalid.");
  const source = {
    statement: `Comparable prior cases matched this evidence-backed pattern in ${input.matchingCaseCount} of ${input.sampleSize} reviewed instances.`,
    comparisonPopulation: input.comparisonPopulation,
    sampleSize: input.sampleSize,
    matchingCaseCount: input.matchingCaseCount,
    timeWindow: { start: input.pattern.firstObservedAt, end: input.pattern.lastObservedAt },
    evidenceCoverage: input.pattern.evidenceStrength,
    confidenceClassification: input.pattern.confidenceClassification,
    limitations: [...input.pattern.limitations, "This is a confidence-bounded historical comparison, not a causal claim or prediction of misconduct, intent or an incident."],
    noCausalClaim: true as const,
    futureMisconductPrediction: false as const,
  };
  return { ...source, digest: hashCanonical(source) };
}
