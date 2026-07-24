export type TrustHistory = {
  score: number;
  confidence: number;
  reason: string;
  recordedAt: string;
};

export type TrustScoreHistoryEntry = {
  id: string;
  tenantId: string;
  entityId: string;
  profileId: string;
  version: number;
  overallScore: number;
  overallConfidence: number;
  evidenceCompleteness: number;
  change: number | null;
  reason: string;
  calculatedAt: string;
};

export function trustHistoryReason(previousScore: number | null, nextScore: number): string {
  if (previousScore === null) return "Initial Trust DNA profile calculated.";
  const delta = Math.round((nextScore - previousScore) * 100) / 100;
  if (delta === 0) return "Trust DNA recalculated with no overall score change.";
  return `Trust DNA ${delta > 0 ? "increased" : "decreased"} by ${Math.abs(delta)} points.`;
}
