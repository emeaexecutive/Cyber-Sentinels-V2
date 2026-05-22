import {
  calculateOriginTraceScore,
  requiresAttributionReview,
} from "@/lib/origin-trace";
import type { OriginTraceSignals } from "@/types/origin";

export function calculateOriginTrace(input: OriginTraceSignals) {
  const score = calculateOriginTraceScore(input);
  const humanReviewRequired = requiresAttributionReview(input);

  return {
    score,
    humanReviewRequired,
  };
}
