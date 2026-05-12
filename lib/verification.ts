export type SubjectType = "human" | "agent" | "content";

export function calculateTrustScore(input: {
  type?: SubjectType;
  subjectType?: SubjectType;
  worldVerified?: boolean;
  domainVerified?: boolean;
  contentProvenance?: boolean;
  riskFlags?: readonly string[];
}) {
  let score = 50;
  if (input.worldVerified) score += 25;
  if (input.domainVerified) score += 10;
  if (input.contentProvenance) score += 10;
  score -= (input.riskFlags?.length || 0) * 12;
  return Math.max(0, Math.min(100, score));
}
