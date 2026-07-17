import { ORI_MINIMUM_REVIEWED_SAMPLES } from "./constants.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OriComparisonCategory,
  OriInferenceRecord,
  OriRecommendation,
  OriValidationMetrics,
} from "./types.ts";

const recommendations: OriRecommendation[] = ["NO_ADDITIONAL_ACTION", "STEP_UP", "HUMAN_REVIEW", "ABSTAIN"];
const comparisons: OriComparisonCategory[] = [
  "AGREED_LOW_RISK", "AGREED_REVIEW", "ORI_MORE_CAUTIONARY", "ORI_LESS_CAUTIONARY", "ORI_ABSTAINED", "AUTHORITATIVE_DECISION_UNAVAILABLE", "NOT_COMPARABLE",
];
const ratio = (numerator: number, denominator: number) => denominator ? Number((numerator / denominator).toFixed(6)) : null;

export function calculateOriValidationMetrics(records: OriInferenceRecord[]): OriValidationMetrics {
  const recommendationDistribution = Object.fromEntries(recommendations.map((value) => [value, 0])) as Record<OriRecommendation, number>;
  const comparisonDistribution = Object.fromEntries(comparisons.map((value) => [value, 0])) as Record<OriComparisonCategory, number>;
  for (const record of records) {
    recommendationDistribution[record.recommendation] += 1;
    comparisonDistribution[record.comparisonCategory] += 1;
  }
  const reviewed = records.filter((record) => !record.synthetic && record.reviewerOutcome && record.expectedClass);
  const metricReady = reviewed.length >= ORI_MINIMUM_REVIEWED_SAMPLES;
  let truePositive = 0;
  let falsePositive = 0;
  let trueNegative = 0;
  let falseNegative = 0;
  let agreements = 0;
  for (const record of reviewed) {
    const predictedCaution = ["STEP_UP", "HUMAN_REVIEW"].includes(record.recommendation);
    const expectedCaution = record.expectedClass === "CAUTION";
    if (predictedCaution && expectedCaution) truePositive += 1;
    else if (predictedCaution) falsePositive += 1;
    else if (expectedCaution) falseNegative += 1;
    else trueNegative += 1;
    if (record.reviewerOutcome === "CORRECT") agreements += 1;
  }
  return {
    validationStatus: metricReady ? "REVIEWED_VALIDATION_AVAILABLE" : "ML Validation Incomplete",
    totalCount: records.length,
    eligibleReviewedCount: reviewed.length,
    syntheticCount: records.filter((record) => record.synthetic).length,
    abstentionRate: ratio(records.filter((record) => record.abstain).length, records.length),
    recommendationDistribution,
    comparisonDistribution,
    reviewerAgreement: metricReady ? ratio(agreements, reviewed.length) : null,
    precision: metricReady ? ratio(truePositive, truePositive + falsePositive) : null,
    recall: metricReady ? ratio(truePositive, truePositive + falseNegative) : null,
    falsePositiveRate: metricReady ? ratio(falsePositive, falsePositive + trueNegative) : null,
    falseNegativeRate: metricReady ? ratio(falseNegative, falseNegative + truePositive) : null,
    averageEvidenceCoverage: records.length ? Number((records.reduce((sum, record) => sum + record.evidenceCoverage, 0) / records.length).toFixed(6)) : null,
    calibrationStatus: metricReady ? "ELIGIBLE_FOR_REVIEWED_CALIBRATION" : "INSUFFICIENT_REVIEWED_GROUND_TRUTH",
    limitations: [
      ...(metricReady ? [] : [`At least ${ORI_MINIMUM_REVIEWED_SAMPLES} non-synthetic reviewed records with an approved expected class are required.`]),
      "Synthetic records are counted for coverage but excluded from production accuracy metrics.",
      "Reviewed outcomes never trigger automatic retraining or threshold updates.",
    ],
  };
}

type StoredInference = {
  inference_id: string;
  tenant_id: string;
  trust_session_id: string;
  correlation_id: string;
  model_id: string;
  model_version: string;
  feature_schema_version: string;
  dataset_version: string;
  threshold_version: string;
  score: number;
  risk_band: OriInferenceRecord["riskBand"];
  recommendation: OriRecommendation;
  abstain: boolean;
  confidence_band: OriInferenceRecord["confidenceBand"];
  missing_feature_ids: string[];
  explanation_summary: { evidence_coverage?: number } | null;
  authoritative_decision: OriInferenceRecord["authoritativeDecision"];
  comparison_category: OriComparisonCategory;
  synthetic: boolean;
};

type StoredReview = {
  inference_id: string;
  outcome: NonNullable<OriInferenceRecord["reviewerOutcome"]>;
  expected_class: OriInferenceRecord["expectedClass"];
  dataset_eligibility: string;
};

export async function loadOriValidationMetrics(supabase: SupabaseClient) {
  const { data: inferenceRows, error: inferenceError } = await supabase
    .from("ori_inference_records")
    .select("inference_id,tenant_id,trust_session_id,correlation_id,model_id,model_version,feature_schema_version,dataset_version,threshold_version,score,risk_band,recommendation,abstain,confidence_band,missing_feature_ids,explanation_summary,authoritative_decision,comparison_category,synthetic")
    .order("inferred_at", { ascending: false })
    .limit(1000)
    .returns<StoredInference[]>();
  if (inferenceError) return { metrics: calculateOriValidationMetrics([]), available: false, error: "ORI validation records are unavailable." };
  const { data: reviewRows, error: reviewError } = await supabase
    .from("ori_reviewer_outcomes")
    .select("inference_id,outcome,expected_class,dataset_eligibility")
    .eq("dataset_eligibility", "APPROVED")
    .order("reviewed_at", { ascending: false })
    .limit(1000)
    .returns<StoredReview[]>();
  const reviewsByInference = new Map<string, StoredReview>();
  for (const review of reviewRows ?? []) {
    if (!reviewsByInference.has(review.inference_id)) reviewsByInference.set(review.inference_id, review);
  }
  const records: OriInferenceRecord[] = (inferenceRows ?? []).map((row) => {
    const review = reviewsByInference.get(row.inference_id);
    return {
      inferenceId: row.inference_id,
      tenantId: row.tenant_id,
      trustSessionId: row.trust_session_id,
      correlationId: row.correlation_id,
      modelId: row.model_id,
      modelVersion: row.model_version,
      featureSchemaVersion: row.feature_schema_version,
      datasetVersion: row.dataset_version,
      thresholdVersion: row.threshold_version,
      score: Number(row.score),
      riskBand: row.risk_band,
      recommendation: row.recommendation,
      abstain: row.abstain,
      confidenceBand: row.confidence_band,
      missingFeatureIds: row.missing_feature_ids,
      evidenceCoverage: Number(row.explanation_summary?.evidence_coverage ?? 0),
      authoritativeDecision: row.authoritative_decision,
      comparisonCategory: row.comparison_category,
      synthetic: row.synthetic,
      reviewerOutcome: review?.outcome ?? null,
      expectedClass: review?.expected_class ?? null,
    };
  });
  return {
    metrics: calculateOriValidationMetrics(records),
    available: !reviewError,
    error: reviewError ? "ORI reviewer outcomes are unavailable; accuracy metrics remain gated." : null,
  };
}
