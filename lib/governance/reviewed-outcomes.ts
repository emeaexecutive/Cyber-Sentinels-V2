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
  reviewedOutcome: DetectionExpectedOutcome | null;
  reviewerId: string | null;
  reviewerNotes: string | null;
  outcomeType: ReviewedOutcomeType;
  escalationOutcome: ValidationCase["datasetMetadata"] extends { governanceOutcome?: infer T } ? T | null : string | null;
  governanceOverride: ValidationCase["governanceOverride"] | null;
  replayLinkage: {
    sampleReference: string | null;
    evidenceReferences: string[];
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
    return {
      caseId: testCase.id,
      expected: testCase.expectedOutcome,
      actual,
      reviewedOutcome: testCase.reviewerOutcome ?? null,
      reviewerId: testCase.reviewerId ?? testCase.datasetMetadata?.reviewer ?? null,
      reviewerNotes: testCase.reviewerNotes ?? testCase.datasetMetadata?.notes ?? null,
      outcomeType: classify(testCase.expectedOutcome, actual),
      escalationOutcome: testCase.datasetMetadata?.governanceOutcome ?? null,
      governanceOverride: testCase.governanceOverride ?? null,
      replayLinkage: {
        sampleReference: testCase.sampleReference ?? null,
        evidenceReferences: caseResults.flatMap((result) => result.evidence),
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
    governanceOverrides: records.filter((record) => Boolean(record.governanceOverride)).length,
    replayLinked: records.filter(
      (record) => record.replayLinkage.sampleReference || record.replayLinkage.evidenceReferences.length
    ).length,
  };
}
