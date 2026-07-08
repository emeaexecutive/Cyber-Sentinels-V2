import type {
  ConfusionMatrix,
  PrecisionRecallMetrics,
} from "@/lib/validation/validation-case";

export type CalibrationReadinessStatus = {
  complete: boolean;
  minimumSampleThreshold: number;
  sampleCount: number;
  precisionReady: boolean;
  recallReady: boolean;
  f1Ready: boolean;
  reviewedOutcomeReady: boolean;
  providerComparisonReady: boolean;
  perCategoryReady: boolean;
  confidenceCalibrationReady: boolean;
  currentPercent: number;
  message: string;
  evidence: string;
  blocker: string;
  nextAction: string;
};

export function evaluateCalibrationReadiness(input: {
  sampleCount: number;
  minimumSampleThreshold: number;
  metrics: PrecisionRecallMetrics;
  confusionMatrix: ConfusionMatrix;
  reviewedOutcomeCount: number;
  providerAgreement: number | null;
  perCategoryCount: number;
  confidenceBandCount: number;
}): CalibrationReadinessStatus {
  const thresholdMet = input.sampleCount >= input.minimumSampleThreshold;
  const precisionReady = thresholdMet && input.metrics.precision !== null;
  const recallReady = thresholdMet && input.metrics.recall !== null;
  const f1Ready = thresholdMet && input.metrics.f1 !== null;
  const reviewedOutcomeReady = input.reviewedOutcomeCount > 0;
  const providerComparisonReady = input.providerAgreement !== null;
  const perCategoryReady = thresholdMet && input.perCategoryCount > 0;
  const confidenceCalibrationReady = thresholdMet && input.confidenceBandCount > 0;
  const complete =
    thresholdMet &&
    precisionReady &&
    recallReady &&
    f1Ready &&
    perCategoryReady &&
    confidenceCalibrationReady;
  const currentPercent = Math.min(
    85,
    Math.round(
      (thresholdMet ? 35 : Math.min(30, (input.sampleCount / input.minimumSampleThreshold) * 30)) +
        (precisionReady ? 10 : 0) +
        (recallReady ? 10 : 0) +
        (f1Ready ? 8 : 0) +
        (reviewedOutcomeReady ? 8 : 0) +
        (providerComparisonReady ? 7 : 0) +
        (perCategoryReady ? 7 : 0) +
        (confidenceCalibrationReady ? 5 : 0)
    )
  );

  return {
    complete,
    minimumSampleThreshold: input.minimumSampleThreshold,
    sampleCount: input.sampleCount,
    precisionReady,
    recallReady,
    f1Ready,
    reviewedOutcomeReady,
    providerComparisonReady,
    perCategoryReady,
    confidenceCalibrationReady,
    currentPercent,
    message: complete
      ? "Calibration sample threshold met; metrics remain dataset-scoped."
      : "Calibration incomplete - insufficient validated data.",
    evidence: complete
      ? `${input.sampleCount} approved case(s) support dataset-scoped precision, recall and F1 reporting.`
      : `${input.sampleCount}/${input.minimumSampleThreshold} approved case(s) available for calibration.`,
    blocker: complete
      ? "Calibration still requires ongoing reviewer audit before production claims."
      : "Minimum reviewed sample threshold, source-specific metrics or category coverage is not met.",
    nextAction:
      "Add approved labelled cases, reviewer adjudication and provider comparison results before reporting accuracy-like claims.",
  };
}
