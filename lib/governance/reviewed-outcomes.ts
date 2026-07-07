import type { DetectionExpectedOutcome, ValidationCase, ValidationResult } from "@/lib/validation/validation-case";

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
    return {
      caseId: testCase.id,
      expected: testCase.expectedOutcome,
      actual,
      originalSystemDecision: actual,
      reviewedOutcome: reviewerDecision,
      reviewerDecision,
      reviewerId: testCase.reviewerId ?? testCase.datasetMetadata?.reviewer ?? null,
      reviewerNotes: testCase.reviewerNotes ?? testCase.datasetMetadata?.notes ?? null,
      overrideReason: testCase.governanceOverride?.reason ?? null,
      falsePositive: outcomeType === "false_positive",
      falseNegative: outcomeType === "false_negative",
      confirmedEscalation,
      evidenceQuality,
      outcomeType,
      escalationOutcome: testCase.datasetMetadata?.governanceOutcome ?? null,
      governanceOverride: testCase.governanceOverride ?? null,
      replayLinkage: {
        sampleReference: testCase.sampleReference ?? null,
        evidenceReferences,
      },
      replayLink: testCase.sampleReference ? `/trust-replay?sample=${encodeURIComponent(testCase.sampleReference)}` : null,
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

export function summarizeReviewedOutcomes(records: ReviewedOutcomeRecord[]) {
  const count = (type: ReviewedOutcomeType) => records.filter((record) => record.outcomeType === type).length;
  const reviewed = records.filter((record) => record.reviewedOutcome || record.reviewerId || record.governanceOverride);
  const escalated = records.filter((record) =>
    ["escalated", "blocked", "more_evidence_required"].includes(String(record.escalationOutcome ?? ""))
  );
  return {
    total: records.length,
    reviewed: reviewed.length,
    falsePositives: count("false_positive"),
    falseNegatives: count("false_negative"),
    reviewOnly: count("review_only"),
    escalated: escalated.length,
    confirmedEscalations: records.filter((record) => record.confirmedEscalation).length,
    governanceOverrides: records.filter((record) => Boolean(record.governanceOverride)).length,
    calibrationImpacting: records.filter((record) => record.calibrationImpact.shouldUpdateThreshold).length,
    replayLinked: records.filter(
      (record) => record.replayLinkage.sampleReference || record.replayLinkage.evidenceReferences.length
    ).length,
  };
}
