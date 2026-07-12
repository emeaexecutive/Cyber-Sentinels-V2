import type { DetectionExpectedOutcome, ValidationCase, ValidationResult } from "../validation/validation-case.ts";
import { trustMemoryEventFromReviewedOutcome, type TrustMemoryEvent } from "../trust-memory/trust-memory.ts";

export type ReviewedOutcomeType =
  | "true_positive"
  | "true_negative"
  | "false_positive"
  | "false_negative"
  | "review_only"
  | "unreviewed";

export type ReviewedOutcomeRecord = {
  caseId: string;
  expected: DetectionExpectedOutcome;
  actual: DetectionExpectedOutcome | "not_run";
  originalSystemDecision: DetectionExpectedOutcome | "not_run";
  reviewedOutcome: DetectionExpectedOutcome | null;
  reviewerDecision: DetectionExpectedOutcome | null;
  reviewerId: string | null;
  reviewTimestamp: string | null;
  reviewerNotes: string | null;
  overrideReason: string | null;
  falsePositive: boolean;
  falseNegative: boolean;
  confirmedEscalation: boolean;
  evidenceQuality: "missing" | "partial" | "sufficient" | "reviewed";
  outcomeType: ReviewedOutcomeType;
  escalationOutcome: ValidationCase["datasetMetadata"] extends { governanceOutcome?: infer T } ? T | null : string | null;
  governanceOverride: ValidationCase["governanceOverride"] | null;
  replayLinkage: {
    sampleReference: string | null;
    evidenceReferences: string[];
  };
  replayLink: string | null;
  reviewLifecycle: "unreviewed" | "needs_review" | "reviewed" | "overridden" | "calibration_candidate";
  reviewConfidence: number;
  confidence: number;
  finalDecision: DetectionExpectedOutcome | null;
  calibrationEligibility: { eligible: boolean; reason: string };
  replayReference: string | null;
  trustMemoryReference: string | null;
  governanceOutcome: string | null;
  calibrationContribution: {
    eligible: boolean;
    reason: string;
    contributesToFalsePositiveRate: boolean;
    contributesToFalseNegativeRate: boolean;
    contributesToReviewerAgreement: boolean;
  };
  calibrationImpact: {
    shouldUpdateThreshold: boolean;
    shouldAddProviderComparison: boolean;
    notes: string[];
  };
};

function classify(expected: DetectionExpectedOutcome, actual: DetectionExpectedOutcome | "not_run"): ReviewedOutcomeType {
  if (actual === "not_run") return "unreviewed";
  if (expected === "review" || actual === "review") return "review_only";
  if (expected === "positive" && actual === "positive") return "true_positive";
  if (expected === "negative" && actual === "negative") return "true_negative";
  if (expected === "negative" && actual === "positive") return "false_positive";
  if (expected === "positive" && actual === "negative") return "false_negative";
  return "review_only";
}

export function buildReviewedOutcomeRecords(
  cases: ValidationCase[],
  results: ValidationResult[]
): ReviewedOutcomeRecord[] {
  return cases.map((testCase) => {
    const caseResults = results.filter((result) => result.caseId === testCase.id);
    const primary =
      caseResults.find((result) => result.source === "heuristic_baseline") ??
      caseResults.find((result) => result.source === "runtime_intelligence") ??
      caseResults[0];
    const actual = primary?.actual ?? "not_run";
    const outcomeType = classify(testCase.expectedOutcome, actual);
    const evidenceReferences = caseResults.flatMap((result) => result.evidence);
    const reviewerDecision = testCase.reviewerOutcome ?? testCase.governanceOverride?.outcome ?? null;
    const confirmedEscalation = ["escalated", "blocked", "more_evidence_required"].includes(
      String(testCase.datasetMetadata?.governanceOutcome ?? "")
    );
    const evidenceQuality =
      testCase.reviewerId || testCase.datasetMetadata?.reviewer
        ? "reviewed"
        : evidenceReferences.length >= 2 || testCase.sampleReference
          ? "sufficient"
          : evidenceReferences.length
            ? "partial"
          : "missing";
    const reviewLifecycle: ReviewedOutcomeRecord["reviewLifecycle"] = testCase.governanceOverride
      ? "overridden"
      : reviewerDecision
        ? ["false_positive", "false_negative"].includes(outcomeType)
          ? "calibration_candidate"
          : "reviewed"
        : outcomeType === "review_only"
          ? "needs_review"
          : "unreviewed";
    const reviewConfidence = Number(
      Math.min(
        0.95,
        (typeof testCase.datasetMetadata?.confidence === "number" ? testCase.datasetMetadata.confidence : 0.35) +
          (reviewerDecision ? 0.2 : 0) +
          (testCase.governanceOverride ? 0.15 : 0) +
          (evidenceQuality === "reviewed" ? 0.15 : evidenceQuality === "sufficient" ? 0.1 : 0)
      ).toFixed(2)
    );
    const reviewerId = testCase.reviewerId ?? testCase.datasetMetadata?.reviewer ?? null;
    const reviewTimestamp = testCase.datasetMetadata?.reviewTimestamp ?? null;
    const overrideNeedsReason = reviewerDecision !== null && reviewerDecision !== actual;
    const calibrationEligible = Boolean(
      reviewerDecision && reviewerId && reviewTimestamp && evidenceQuality !== "missing" &&
      (!overrideNeedsReason || testCase.governanceOverride?.reason)
    );
    const replayReference = testCase.sampleReference ? `/trust-replay?sample=${encodeURIComponent(testCase.sampleReference)}` : null;
    const trustMemoryReference = calibrationEligible ? `trust-memory:reviewed-outcome:${testCase.id}` : null;
    return {
      caseId: testCase.id,
      expected: testCase.expectedOutcome,
      actual,
      originalSystemDecision: actual,
      reviewedOutcome: reviewerDecision,
      reviewerDecision,
      reviewerId,
      reviewTimestamp,
      reviewerNotes: testCase.reviewerNotes ?? testCase.datasetMetadata?.notes ?? null,
      overrideReason: testCase.governanceOverride?.reason ?? null,
      falsePositive: outcomeType === "false_positive",
      falseNegative: outcomeType === "false_negative",
      confirmedEscalation,
      evidenceQuality,
      outcomeType,
      escalationOutcome: testCase.datasetMetadata?.governanceOutcome ?? null,
      governanceOutcome: testCase.datasetMetadata?.governanceOutcome ?? null,
      governanceOverride: testCase.governanceOverride ?? null,
      replayLinkage: {
        sampleReference: testCase.sampleReference ?? null,
        evidenceReferences,
      },
      replayLink: replayReference,
      reviewLifecycle,
      reviewConfidence,
      confidence: reviewConfidence,
      finalDecision: reviewerDecision,
      calibrationEligibility: {
        eligible: calibrationEligible,
        reason: calibrationEligible
          ? "Attributed, timestamped review with evidence and required override reason."
          : "Reviewer identity, review timestamp, evidence or override reason is missing.",
      },
      replayReference,
      trustMemoryReference,
      calibrationContribution: {
        eligible: calibrationEligible,
        reason: calibrationEligible
          ? "Reviewed outcome has enough evidence to contribute to dataset-scoped calibration."
          : "Reviewed decision or evidence references are missing.",
        contributesToFalsePositiveRate: outcomeType === "false_positive" && calibrationEligible,
        contributesToFalseNegativeRate: outcomeType === "false_negative" && calibrationEligible,
        contributesToReviewerAgreement: Boolean(reviewerDecision),
      },
      calibrationImpact: {
        shouldUpdateThreshold: ["false_positive", "false_negative"].includes(outcomeType),
        shouldAddProviderComparison: !caseResults.some((result) => result.source === "provider_api"),
        notes: [
          outcomeType === "false_positive" ? "Review threshold and specificity for this category." : null,
          outcomeType === "false_negative" ? "Review recall and missing-signal coverage for this category." : null,
          evidenceQuality === "missing" ? "Add evidence references before using this record for calibration." : null,
        ].filter((item): item is string => Boolean(item)),
      },
    };
  });
}

export function buildReviewedOutcomeFeedback(records: ReviewedOutcomeRecord[]) {
  const eligible = records.filter((record) => record.calibrationEligibility.eligible);
  return {
    benchmarkHistory: eligible.map((record) => ({ caseId: record.caseId, outcomeType: record.outcomeType, confidence: record.confidence })),
    calibrationHistory: eligible.map((record) => ({ caseId: record.caseId, finalDecision: record.finalDecision, reviewedAt: record.reviewTimestamp })),
    falsePositiveAnalysis: eligible.filter((record) => record.falsePositive).map((record) => record.caseId),
    falseNegativeAnalysis: eligible.filter((record) => record.falseNegative).map((record) => record.caseId),
    policyTuningRecommendations: eligible
      .filter((record) => record.calibrationImpact.shouldUpdateThreshold)
      .map((record) => ({ caseId: record.caseId, recommendation: record.calibrationImpact.notes })),
    providerComparison: eligible.filter((record) => record.calibrationImpact.shouldAddProviderComparison).map((record) => record.caseId),
    trustMemoryReferences: eligible.map((record) => record.trustMemoryReference).filter(Boolean),
    confidenceEvolution: eligible.map((record) => ({ caseId: record.caseId, confidence: record.confidence })),
    automaticRetraining: false,
    automaticPolicyMutation: false,
    boundary: "Reviewed outcomes generate attributable recommendations and history only; they never retrain models or silently change production policy.",
  };
}

export function summarizeReviewedOutcomes(records: ReviewedOutcomeRecord[]) {
  const count = (type: ReviewedOutcomeType) => records.filter((record) => record.outcomeType === type).length;
  const reviewed = records.filter((record) => record.reviewedOutcome || record.reviewerId || record.governanceOverride);
  const escalated = records.filter((record) =>
    ["escalated", "blocked", "more_evidence_required"].includes(String(record.escalationOutcome ?? ""))
  );
  return {
    total: records.length,
    reviewed: reviewed.length,
    reviewLifecycle: {
      unreviewed: records.filter((record) => record.reviewLifecycle === "unreviewed").length,
      needsReview: records.filter((record) => record.reviewLifecycle === "needs_review").length,
      reviewed: records.filter((record) => record.reviewLifecycle === "reviewed").length,
      overridden: records.filter((record) => record.reviewLifecycle === "overridden").length,
      calibrationCandidate: records.filter((record) => record.reviewLifecycle === "calibration_candidate").length,
    },
    falsePositives: count("false_positive"),
    falseNegatives: count("false_negative"),
    reviewOnly: count("review_only"),
    escalated: escalated.length,
    confirmedEscalations: records.filter((record) => record.confirmedEscalation).length,
    governanceOverrides: records.filter((record) => Boolean(record.governanceOverride)).length,
    calibrationImpacting: records.filter((record) => record.calibrationImpact.shouldUpdateThreshold).length,
    calibrationContributing: records.filter((record) => record.calibrationContribution.eligible).length,
    averageReviewConfidence: reviewed.length
      ? Number((reviewed.reduce((total, record) => total + record.reviewConfidence, 0) / reviewed.length).toFixed(2))
      : null,
    replayLinked: records.filter(
      (record) => record.replayLinkage.sampleReference || record.replayLinkage.evidenceReferences.length
    ).length,
  };
}

export function reviewedOutcomesToTrustMemoryEvents(records: ReviewedOutcomeRecord[]): TrustMemoryEvent[] {
  return records
    .filter(
      (record) =>
        record.reviewedOutcome ||
        record.reviewerId ||
        record.governanceOverride ||
        record.falsePositive ||
        record.falseNegative ||
        record.confirmedEscalation
    )
    .map((record, index) =>
      trustMemoryEventFromReviewedOutcome(record, {
        createdAt: new Date(Date.UTC(2026, 6, 10, 9, index, 0)).toISOString(),
      })
    );
}
