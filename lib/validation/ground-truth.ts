import type { ConfusionMatrix, DetectionExpectedOutcome } from "./validation-case";

export type GroundTruthReviewStatus =
  | "unreviewed"
  | "in_review"
  | "reviewed"
  | "disputed"
  | "rejected";

export type GroundTruthReviewSource =
  | "human_reviewer"
  | "provider"
  | "partner"
  | "synthetic_fixture"
  | "benchmark_panel"
  | "internal_audit";

export type DatasetKind =
  | "Public"
  | "Internal"
  | "Partner"
  | "Synthetic"
  | "Provider"
  | "Benchmark";

export type MetricReadinessStatus =
  | "computed"
  | "not_enough_reviewed_samples"
  | "not_applicable";

export type GroundTruthRecord = {
  groundTruthId: string;
  datasetId: string;
  reviewStatus: GroundTruthReviewStatus;
  reviewSource: GroundTruthReviewSource;
  reviewConfidence: number;
  labelVersion: string;
  datasetVersion: string;
  providerAgreement: number | null;
  humanAgreement: number | null;
  confidence: number;
  expectedOutcome: DetectionExpectedOutcome;
  systemOutcome?: DetectionExpectedOutcome | null;
  reviewedOutcome?: DetectionExpectedOutcome | null;
  weighting?: number;
  trustPosture?: "strengthen" | "hold" | "weaken" | "investigate";
};

export type DatasetRegistryEntry = {
  datasetId: string;
  name: string;
  kind: DatasetKind;
  datasetVersion: string;
  qualityScore: number;
  coverage: number;
  reviewCompleteness: number;
  benchmarkEligibility: boolean;
  reviewerProtocol: "none" | "single_reviewer" | "dual_reviewer" | "adjudicated";
  boundary: string;
};

export type GuardedMetric = {
  value: number | null;
  status: MetricReadinessStatus;
  sampleCount: number;
  minimumReviewedSamples: number;
  reason: string;
};

export type GroundTruthValidationSummary = {
  reviewedSamples: number;
  minimumReviewedSamples: number;
  confusionMatrix: ConfusionMatrix;
  precision: GuardedMetric;
  recall: GuardedMetric;
  f1: GuardedMetric;
  falsePositiveRate: GuardedMetric;
  falseNegativeRate: GuardedMetric;
  calibration: GuardedMetric;
  confidence: GuardedMetric;
  providerAgreement: GuardedMetric;
  humanAgreement: GuardedMetric;
  reviewedOutcomes: {
    total: number;
    calibrationEligible: number;
    weightingEligible: number;
    trustPostureEligible: number;
  };
  message: string;
};

export const MINIMUM_GROUND_TRUTH_REVIEWED_SAMPLES = 30;

function boundedScore(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be a finite value from 0 to 1.`);
  }
  return Number(value.toFixed(4));
}

function guarded(input: {
  value: number | null;
  status: MetricReadinessStatus;
  sampleCount: number;
  minimumReviewedSamples: number;
  reason: string;
}): GuardedMetric {
  return {
    value: input.value === null ? null : boundedScore(input.value, "Metric value"),
    status: input.status,
    sampleCount: input.sampleCount,
    minimumReviewedSamples: input.minimumReviewedSamples,
    reason: input.reason,
  };
}

function average(values: Array<number | null | undefined>) {
  const usable = values.filter((value): value is number => typeof value === "number");
  return usable.length ? usable.reduce((total, value) => total + value, 0) / usable.length : null;
}

function reviewed(records: GroundTruthRecord[]) {
  return records.filter(
    (record) =>
      record.reviewStatus === "reviewed" &&
      Boolean(record.reviewedOutcome) &&
      typeof record.systemOutcome === "string"
  );
}

export function buildGroundTruthDatasetRegistry(
  entries: DatasetRegistryEntry[] = []
): DatasetRegistryEntry[] {
  const base: DatasetRegistryEntry[] = [
    {
      datasetId: "public-benchmark",
      name: "Public benchmark datasets",
      kind: "Public",
      datasetVersion: "not_loaded",
      qualityScore: 0,
      coverage: 0,
      reviewCompleteness: 0,
      benchmarkEligibility: false,
      reviewerProtocol: "none",
      boundary: "Public datasets require license review, source provenance and mapped labels before benchmark use.",
    },
    {
      datasetId: "internal-reviewed",
      name: "Internal reviewed outcomes",
      kind: "Internal",
      datasetVersion: "not_loaded",
      qualityScore: 0,
      coverage: 0,
      reviewCompleteness: 0,
      benchmarkEligibility: false,
      reviewerProtocol: "none",
      boundary: "Internal outcomes become benchmark-eligible only after reviewer adjudication and evidence linkage.",
    },
    {
      datasetId: "partner-ground-truth",
      name: "Partner ground-truth cohorts",
      kind: "Partner",
      datasetVersion: "not_loaded",
      qualityScore: 0,
      coverage: 0,
      reviewCompleteness: 0,
      benchmarkEligibility: false,
      reviewerProtocol: "none",
      boundary: "Partner cohorts require consent, tenancy controls and agreed review protocol.",
    },
    {
      datasetId: "synthetic-fixtures",
      name: "Synthetic validation fixtures",
      kind: "Synthetic",
      datasetVersion: "scaffold-v1",
      qualityScore: 0.2,
      coverage: 0.1,
      reviewCompleteness: 0,
      benchmarkEligibility: false,
      reviewerProtocol: "single_reviewer",
      boundary: "Synthetic fixtures validate behavior and coverage; they do not create production accuracy claims.",
    },
    {
      datasetId: "provider-comparison",
      name: "Provider comparison results",
      kind: "Provider",
      datasetVersion: "not_loaded",
      qualityScore: 0,
      coverage: 0,
      reviewCompleteness: 0,
      benchmarkEligibility: false,
      reviewerProtocol: "none",
      boundary: "Provider outputs are evidence signals until reviewed against ground truth.",
    },
    {
      datasetId: "benchmark-holdout",
      name: "Benchmark holdout set",
      kind: "Benchmark",
      datasetVersion: "not_loaded",
      qualityScore: 0,
      coverage: 0,
      reviewCompleteness: 0,
      benchmarkEligibility: false,
      reviewerProtocol: "none",
      boundary: "Holdout benchmarks require versioned, reviewed samples and frozen evaluation rules.",
    },
  ];

  return [...base, ...entries].map((entry) => ({
    ...entry,
    qualityScore: boundedScore(entry.qualityScore, "Dataset quality score"),
    coverage: boundedScore(entry.coverage, "Dataset coverage"),
    reviewCompleteness: boundedScore(entry.reviewCompleteness, "Dataset review completeness"),
    benchmarkEligibility:
      entry.benchmarkEligibility &&
      entry.qualityScore >= 0.8 &&
      entry.coverage >= 0.7 &&
      entry.reviewCompleteness >= 0.8,
  }));
}

export function summarizeDatasetRegistry(entries: DatasetRegistryEntry[]) {
  const benchmarkEligible = entries.filter((entry) => entry.benchmarkEligibility);
  return {
    datasetCount: entries.length,
    byKind: Object.fromEntries(
      (["Public", "Internal", "Partner", "Synthetic", "Provider", "Benchmark"] as const).map((kind) => [
        kind,
        entries.filter((entry) => entry.kind === kind).length,
      ])
    ),
    averageQualityScore: average(entries.map((entry) => entry.qualityScore)),
    averageCoverage: average(entries.map((entry) => entry.coverage)),
    reviewCompleteness: average(entries.map((entry) => entry.reviewCompleteness)),
    benchmarkEligibleCount: benchmarkEligible.length,
    benchmarkCoverage: entries.length ? benchmarkEligible.length / entries.length : 0,
  };
}

export function buildReviewedOutcomeContribution(record: GroundTruthRecord) {
  const hasReviewedOutcome = record.reviewStatus === "reviewed" && Boolean(record.reviewedOutcome);
  const calibrationEligible =
    hasReviewedOutcome &&
    record.reviewConfidence >= 0.7 &&
    record.humanAgreement !== null &&
    record.humanAgreement >= 0.7;
  const weightingEligible =
    calibrationEligible &&
    record.providerAgreement !== null &&
    record.providerAgreement >= 0.6;
  return {
    groundTruthId: record.groundTruthId,
    contributesToFutureConfidence: hasReviewedOutcome,
    contributesToFutureCalibration: calibrationEligible,
    contributesToFutureWeighting: weightingEligible,
    contributesToFutureTrustPosture: hasReviewedOutcome && record.trustPosture !== undefined,
    reason: hasReviewedOutcome
      ? "Reviewed outcome can inform future confidence; calibration and weighting require agreement thresholds."
      : "Outcome is not reviewed and cannot influence future trust posture.",
  };
}

export function summarizeGroundTruth(records: GroundTruthRecord[]) {
  const reviewedRecords = records.filter((record) => record.reviewStatus === "reviewed");
  return {
    total: records.length,
    reviewed: reviewedRecords.length,
    groundTruthCoverage: records.length ? reviewedRecords.length / records.length : 0,
    reviewConfidence: average(reviewedRecords.map((record) => record.reviewConfidence)),
    providerAgreement: average(reviewedRecords.map((record) => record.providerAgreement)),
    humanAgreement: average(reviewedRecords.map((record) => record.humanAgreement)),
    confidence: average(reviewedRecords.map((record) => record.confidence)),
    datasetVersions: [...new Set(records.map((record) => record.datasetVersion))],
    labelVersions: [...new Set(records.map((record) => record.labelVersion))],
  };
}

export function computeGroundTruthValidation(
  records: GroundTruthRecord[],
  options: { minimumReviewedSamples?: number } = {}
): GroundTruthValidationSummary {
  const minimumReviewedSamples =
    options.minimumReviewedSamples ?? MINIMUM_GROUND_TRUTH_REVIEWED_SAMPLES;
  const reviewedRecords = reviewed(records);
  const sampleCount = reviewedRecords.length;
  const thresholdMet = sampleCount >= minimumReviewedSamples;
  const reason = thresholdMet
    ? "Metric is computed against reviewed, versioned ground-truth records."
    : `Requires ${minimumReviewedSamples} reviewed samples before metric computation.`;
  const status: MetricReadinessStatus = thresholdMet ? "computed" : "not_enough_reviewed_samples";
  const matrix = reviewedRecords.reduce<ConfusionMatrix>(
    (current, record) => {
      if (record.reviewedOutcome === "review" || record.systemOutcome === "review") current.reviewOnly += 1;
      else if (record.reviewedOutcome === "positive" && record.systemOutcome === "positive") current.truePositives += 1;
      else if (record.reviewedOutcome === "negative" && record.systemOutcome === "positive") current.falsePositives += 1;
      else if (record.reviewedOutcome === "negative" && record.systemOutcome === "negative") current.trueNegatives += 1;
      else if (record.reviewedOutcome === "positive" && record.systemOutcome === "negative") current.falseNegatives += 1;
      return current;
    },
    { truePositives: 0, falsePositives: 0, trueNegatives: 0, falseNegatives: 0, reviewOnly: 0 }
  );
  const precisionDenominator = matrix.truePositives + matrix.falsePositives;
  const recallDenominator = matrix.truePositives + matrix.falseNegatives;
  const precision = thresholdMet && precisionDenominator ? matrix.truePositives / precisionDenominator : null;
  const recall = thresholdMet && recallDenominator ? matrix.truePositives / recallDenominator : null;
  const f1 =
    precision !== null && recall !== null && precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : null;
  const falsePositiveDenominator = matrix.falsePositives + matrix.trueNegatives;
  const falseNegativeDenominator = matrix.falseNegatives + matrix.truePositives;
  const contributions = records.map(buildReviewedOutcomeContribution);

  return {
    reviewedSamples: sampleCount,
    minimumReviewedSamples,
    confusionMatrix: matrix,
    precision: guarded({ value: precision, status, sampleCount, minimumReviewedSamples, reason }),
    recall: guarded({ value: recall, status, sampleCount, minimumReviewedSamples, reason }),
    f1: guarded({ value: f1, status, sampleCount, minimumReviewedSamples, reason }),
    falsePositiveRate: guarded({
      value: thresholdMet && falsePositiveDenominator ? matrix.falsePositives / falsePositiveDenominator : null,
      status,
      sampleCount,
      minimumReviewedSamples,
      reason,
    }),
    falseNegativeRate: guarded({
      value: thresholdMet && falseNegativeDenominator ? matrix.falseNegatives / falseNegativeDenominator : null,
      status,
      sampleCount,
      minimumReviewedSamples,
      reason,
    }),
    calibration: guarded({
      value: thresholdMet ? average(reviewedRecords.map((record) => record.reviewConfidence)) : null,
      status,
      sampleCount,
      minimumReviewedSamples,
      reason,
    }),
    confidence: guarded({
      value: thresholdMet ? average(reviewedRecords.map((record) => record.confidence)) : null,
      status,
      sampleCount,
      minimumReviewedSamples,
      reason,
    }),
    providerAgreement: guarded({
      value: thresholdMet ? average(reviewedRecords.map((record) => record.providerAgreement)) : null,
      status,
      sampleCount,
      minimumReviewedSamples,
      reason,
    }),
    humanAgreement: guarded({
      value: thresholdMet ? average(reviewedRecords.map((record) => record.humanAgreement)) : null,
      status,
      sampleCount,
      minimumReviewedSamples,
      reason,
    }),
    reviewedOutcomes: {
      total: records.filter((record) => record.reviewStatus === "reviewed").length,
      calibrationEligible: contributions.filter((item) => item.contributesToFutureCalibration).length,
      weightingEligible: contributions.filter((item) => item.contributesToFutureWeighting).length,
      trustPostureEligible: contributions.filter((item) => item.contributesToFutureTrustPosture).length,
    },
    message: thresholdMet
      ? "Ground-truth metrics are available for this reviewed dataset scope."
      : "Ground-truth metrics are gated until enough reviewed samples exist.",
  };
}
