import { deterministicUuid, hashCanonical } from "../trust-core/hash.ts";
import { reviewerFeedbackLabels, type ReviewerFeedbackLabel, type TrustLearningFeedback } from "./types.ts";

export function createTrustLearningFeedback(input: { enterpriseId: string; reviewerReference: string; reviewerRole: string; outputReference: string; sourceVersion: string; label: ReviewerFeedbackLabel; reason: string; correction?: string | null; createdAt?: string }): TrustLearningFeedback {
  if (!reviewerFeedbackLabels.includes(input.label) || input.reason.trim().length < 3 || input.reason.length > 1000) throw new Error("Reviewer feedback is invalid.");
  const createdAt = input.createdAt ?? new Date().toISOString();
  const identity = { enterpriseId: input.enterpriseId, reviewerReference: input.reviewerReference, outputReference: input.outputReference, sourceVersion: input.sourceVersion };
  const source = {
    feedbackId: deterministicUuid(identity),
    enterpriseId: input.enterpriseId,
    reviewerReference: input.reviewerReference,
    reviewerRole: input.reviewerRole,
    outputReference: input.outputReference,
    sourceVersion: input.sourceVersion,
    label: input.label,
    reason: input.reason.trim(),
    correction: input.correction?.trim() || null,
    createdAt,
    automaticRetrainingTriggered: false as const,
  };
  return { ...source, digest: hashCanonical(source) };
}
