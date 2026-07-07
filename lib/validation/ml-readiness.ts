import { canonicalDetectionSources, type DetectionSource } from "@/lib/detection/detection-engine";

export type MlReadinessLevel = {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  title: string;
  criteria: string;
};

export const mlReadinessLevels: MlReadinessLevel[] = [
  { level: 1, title: "Heuristic rules only", criteria: "Deterministic rules and workflow evidence produce review signals." },
  { level: 2, title: "Provider-ready", criteria: "Provider adapters, credential checks and source labels are in place." },
  { level: 3, title: "Provider-backed detection active", criteria: "Reviewed provider inference runs against supported workflows." },
  { level: 4, title: "Validation dataset present", criteria: "Approved labelled validation cases exist." },
  { level: 5, title: "Precision/recall/F1 reported", criteria: "Metrics are calculated from labelled cases and source-specific results." },
  { level: 6, title: "Human-reviewed false positives/false negatives", criteria: "Reviewer adjudication exists for FP/FN cases." },
  { level: 7, title: "Enterprise pilot validated", criteria: "Pilot workflows validate outcomes, evidence retention and governance review." },
  { level: 8, title: "Proprietary model-assisted detection benchmarked", criteria: "First-party model-assisted detection is benchmarked against approved cases." },
];

export type MlReadinessInput = {
  realMlActive: boolean;
  providerDetectionActive: boolean;
  validationDatasetPresent: boolean;
  precisionAvailable: boolean;
  recallAvailable: boolean;
  f1Available: boolean;
  falsePositiveTracking: boolean;
  falseNegativeTracking: boolean;
  humanReviewEnabled: boolean;
  enterprisePilotValidated?: boolean;
  proprietaryModelBenchmarked?: boolean;
};

export function evaluateMlReadiness(input: MlReadinessInput) {
  let currentLevel: MlReadinessLevel["level"] = 1;
  if (input.providerDetectionActive || !input.realMlActive) currentLevel = 2;
  if (input.providerDetectionActive) currentLevel = 3;
  if (input.validationDatasetPresent) currentLevel = 4;
  if (input.precisionAvailable && input.recallAvailable && input.f1Available) currentLevel = 5;
  if (currentLevel >= 5 && input.falsePositiveTracking && input.falseNegativeTracking && input.humanReviewEnabled) {
    currentLevel = 6;
  }
  if (currentLevel >= 6 && input.enterprisePilotValidated) currentLevel = 7;
  if (currentLevel >= 7 && input.proprietaryModelBenchmarked && input.realMlActive) currentLevel = 8;

  const blockers = [
    !input.providerDetectionActive ? "No reviewed provider-backed detection is active for media/document forensics." : null,
    !input.validationDatasetPresent ? "No validation dataset available yet." : null,
    !(input.precisionAvailable && input.recallAvailable && input.f1Available)
      ? "Precision, recall and F1 require approved labelled cases and source-specific benchmark results."
      : null,
    !(input.falsePositiveTracking && input.falseNegativeTracking && input.humanReviewEnabled)
      ? "False-positive and false-negative review needs human adjudication evidence."
      : null,
    !input.enterprisePilotValidated ? "Enterprise pilot validation is not recorded." : null,
    !input.proprietaryModelBenchmarked ? "No proprietary model-assisted detection benchmark is recorded." : null,
  ].filter((item): item is string => Boolean(item));

  return {
    current_level: currentLevel,
    current_label: mlReadinessLevels.find((item) => item.level === currentLevel)?.title ?? "Unknown",
    real_ml_active: input.realMlActive,
    provider_detection_active: input.providerDetectionActive,
    validation_dataset_present: input.validationDatasetPresent,
    precision_available: input.precisionAvailable,
    recall_available: input.recallAvailable,
    f1_available: input.f1Available,
    false_positive_tracking: input.falsePositiveTracking,
    false_negative_tracking: input.falseNegativeTracking,
    human_review_enabled: input.humanReviewEnabled,
    enterprise_pilot_validated: Boolean(input.enterprisePilotValidated),
    proprietary_model_benchmarked: Boolean(input.proprietaryModelBenchmarked),
    target_65_80_maturity:
      currentLevel >= 5
        ? "Approaching validation maturity; pilot and reviewer adjudication remain gating evidence."
        : "Requires labelled data, provider/model comparison and human-reviewed error analysis.",
    blockers_to_next_level: blockers,
    source_labels: canonicalDetectionSources as readonly DetectionSource[],
    limitations: [
      "Readiness is capability evidence, not production accuracy.",
      "No benchmark metric is reported without approved labelled validation cases.",
      "Provider or model output remains review evidence until validated against enterprise workflow data.",
    ],
  };
}
