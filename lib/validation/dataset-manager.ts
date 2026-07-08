import { datasetRegistry, type DatasetRegistryEntry } from "./dataset-registry.ts";
import type { ValidationCase } from "./validation-case.ts";

export type DatasetReviewStatus = "not_reviewed" | "review_pending" | "reviewed" | "adjudicated";

export type DatasetCoverageBucket = {
  category: DatasetRegistryEntry["category"];
  name: string;
  datasetVersion: string;
  registryStatus: DatasetRegistryEntry["reviewerStatus"];
  reviewStatus: DatasetReviewStatus;
  labelQuality: DatasetRegistryEntry["labelQuality"];
  caseCount: number;
  reviewedCaseCount: number;
  benchmarkEligible: boolean;
  confidence: number;
  coverageGaps: string[];
};

export type DatasetCoverageReport = {
  datasetVersion: string;
  generatedAt: string;
  totalCases: number;
  reviewedCases: number;
  eligibleCases: number;
  benchmarkEligible: boolean;
  reviewCompleteness: number;
  coveragePercent: number;
  confidence: number;
  buckets: DatasetCoverageBucket[];
  blockers: string[];
  nextActions: string[];
  boundary: string;
};

const currentDatasetVersion = "validation-dataset-v1";

function caseCategory(testCase: ValidationCase): DatasetRegistryEntry["category"] | null {
  if (testCase.signals.virtualCameraIndicator) return "virtual_camera";
  if (testCase.signals.documentMismatch || testCase.label === "forged") return "forged_document";
  if (testCase.signals.agentRuntimeAnomaly || testCase.intent?.actorType === "agent") return "ai_agent_risk";
  if (testCase.label === "deepfake") return "deepfake_video";
  if (testCase.label === "synthetic") return "synthetic_face";
  if (testCase.label === "injected") return "injected_session";
  if (testCase.label === "real") return "real_human_sessions";
  if (testCase.label === "clean") return "normal_workflow";
  return null;
}

function reviewStatus(entry: DatasetRegistryEntry, cases: ValidationCase[]): DatasetReviewStatus {
  if (cases.some((testCase) => testCase.governanceOverride?.reviewerId && testCase.reviewerOutcome)) return "adjudicated";
  if (cases.some((testCase) => testCase.reviewerId || testCase.datasetMetadata?.reviewer)) return "reviewed";
  if (entry.reviewerStatus === "review_pending") return "review_pending";
  return "not_reviewed";
}

function confidenceFor(cases: ValidationCase[], entry: DatasetRegistryEntry) {
  if (!cases.length) return 0;
  const metadataConfidence = cases
    .map((testCase) => testCase.datasetMetadata?.confidence)
    .filter((value): value is number => typeof value === "number");
  const averageMetadata = metadataConfidence.length
    ? metadataConfidence.reduce((total, value) => total + value, 0) / metadataConfidence.length
    : 0.35;
  const reviewLift = cases.some((testCase) => testCase.reviewerId || testCase.datasetMetadata?.reviewer) ? 0.25 : 0;
  const qualityLift = entry.labelQuality === "adjudicated" ? 0.25 : entry.labelQuality === "reviewed" ? 0.15 : 0;
  return Number(Math.min(0.95, averageMetadata + reviewLift + qualityLift).toFixed(2));
}

export function buildDatasetCoverageReport(cases: ValidationCase[]): DatasetCoverageReport {
  const buckets = datasetRegistry.map<DatasetCoverageBucket>((entry) => {
    const categoryCases = cases.filter((testCase) => caseCategory(testCase) === entry.category);
    const reviewedCaseCount = categoryCases.filter((testCase) => testCase.reviewerId || testCase.datasetMetadata?.reviewer).length;
    const status = reviewStatus(entry, categoryCases);
    const confidence = confidenceFor(categoryCases, entry);
    const benchmarkEligible =
      categoryCases.length > 0 &&
      reviewedCaseCount > 0 &&
      confidence >= 0.7 &&
      entry.usableForBenchmark;
    const coverageGaps = [
      categoryCases.length ? null : "No validation cases present.",
      reviewedCaseCount ? null : "No reviewed outcome attached.",
      entry.usableForBenchmark ? null : "Registry marks this bucket as not benchmark eligible yet.",
      confidence >= 0.7 ? null : "Confidence below benchmark threshold.",
    ].filter((item): item is string => Boolean(item));

    return {
      category: entry.category,
      name: entry.name,
      datasetVersion: currentDatasetVersion,
      registryStatus: entry.reviewerStatus,
      reviewStatus: status,
      labelQuality: entry.labelQuality,
      caseCount: categoryCases.length,
      reviewedCaseCount,
      benchmarkEligible,
      confidence,
      coverageGaps,
    };
  });
  const reviewedCases = cases.filter((testCase) => testCase.reviewerId || testCase.datasetMetadata?.reviewer).length;
  const eligibleCases = buckets.filter((bucket) => bucket.benchmarkEligible).reduce((total, bucket) => total + bucket.caseCount, 0);
  const coveredBuckets = buckets.filter((bucket) => bucket.caseCount > 0).length;
  const reviewCompleteness = cases.length ? reviewedCases / cases.length : 0;
  const coveragePercent = Math.round((coveredBuckets / buckets.length) * 100);
  const confidence = Number(
    Math.min(0.85, coveragePercent / 100 * 0.35 + reviewCompleteness * 0.35 + (eligibleCases ? 0.15 : 0)).toFixed(2)
  );
  const benchmarkEligible = eligibleCases > 0 && reviewCompleteness >= 0.6;

  return {
    datasetVersion: currentDatasetVersion,
    generatedAt: new Date().toISOString(),
    totalCases: cases.length,
    reviewedCases,
    eligibleCases,
    benchmarkEligible,
    reviewCompleteness: Number(reviewCompleteness.toFixed(2)),
    coveragePercent,
    confidence,
    buckets,
    blockers: [
      benchmarkEligible ? null : "Validation incomplete — insufficient reviewed dataset.",
      reviewedCases ? null : "Reviewed outcomes are missing.",
      eligibleCases ? null : "No dataset bucket is benchmark eligible yet.",
    ].filter((item): item is string => Boolean(item)),
    nextActions: [
      "Add reviewed cases to every dataset bucket before accuracy-like claims.",
      "Record dataset source, license or consent, reviewer, confidence and provider agreement for benchmark eligibility.",
      "Version dataset changes before comparing benchmark history.",
    ],
    boundary: "Dataset coverage is readiness evidence only; it does not create precision, recall or F1 claims.",
  };
}
