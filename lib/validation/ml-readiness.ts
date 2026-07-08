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

export type MlReadinessArea = {
  area: string;
  currentPercent: number;
  evidence: string;
  blocker: string;
  nextAction: string;
  ownerRole: string;
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

export function buildMlReadinessScoreboard(input: {
  datasetReadinessPercent: number;
  datasetEvidence: string;
  datasetBlocker: string;
  calibrationComplete: boolean;
  calibrationMessage: string;
  providerDetectionActive: boolean;
  providerCount: number;
  reviewedOutcomeCount: number;
  runtimeProfilingActive: boolean;
  loadTestPresent: boolean;
  queryPlanPresent: boolean;
  queueOptimizationPresent: boolean;
  proprietaryModelBenchmarked: boolean;
}): MlReadinessArea[] {
  return [
    {
      area: "Dataset readiness",
      currentPercent: input.datasetReadinessPercent,
      evidence: input.datasetEvidence,
      blocker: input.datasetBlocker,
      nextAction: "Add approved public or consented validation cases across media, session, document, NHI and regulated workflow categories.",
      ownerRole: "ML validation lead",
    },
    {
      area: "Precision/recall calibration",
      currentPercent: input.calibrationComplete ? 85 : 35,
      evidence: input.calibrationMessage,
      blocker: input.calibrationComplete ? "Dataset-scoped metrics still require ongoing reviewer audit." : "Calibration not complete - insufficient validated data.",
      nextAction: "Reach the minimum validated sample threshold and compare source-specific results by category.",
      ownerRole: "ML validation lead",
    },
    {
      area: "Provider integrations",
      currentPercent: input.providerDetectionActive ? 70 : 45,
      evidence: `${input.providerCount} provider adapter(s) expose credential checks, status labels and normalized results.`,
      blocker: input.providerDetectionActive ? "Provider outputs still need benchmark validation." : "No reviewed live provider inference is active.",
      nextAction: "Implement and review one endpoint-specific provider call with timeout handling, audit metadata and restricted-data exclusion.",
      ownerRole: "Provider integration owner",
    },
    {
      area: "Reviewed outcomes",
      currentPercent: input.reviewedOutcomeCount ? 60 : 30,
      evidence: `${input.reviewedOutcomeCount} reviewed outcome record(s) available from validation runs.`,
      blocker: input.reviewedOutcomeCount ? "Needs more adjudicated false-positive and false-negative examples." : "No reviewed validation cases are present.",
      nextAction: "Route human review decisions into reviewed outcome records with override reason and replay evidence.",
      ownerRole: "Governance reviewer",
    },
    {
      area: "Runtime profiling",
      currentPercent: input.runtimeProfilingActive ? 65 : 25,
      evidence: input.runtimeProfilingActive ? "In-process runtime profiler reports provider, replay and governance queue timing." : "Runtime profiler not active.",
      blocker: "In-process telemetry is not production APM.",
      nextAction: "Persist profile samples and compare p50/p95 latency under real pilot traffic.",
      ownerRole: "Platform engineer",
    },
    {
      area: "Load testing",
      currentPercent: input.loadTestPresent ? 55 : 20,
      evidence: input.loadTestPresent ? "Local load test script exists and avoids paid providers." : "No production load test script found.",
      blocker: "500-decision path remains a placeholder until seeded data and CI timing budgets are approved.",
      nextAction: "Run 10 and 100 decision simulations in CI and add a staged 500-decision profile.",
      ownerRole: "Platform engineer",
    },
    {
      area: "Query optimization",
      currentPercent: input.queryPlanPresent ? 60 : 25,
      evidence: input.queryPlanPresent ? "Query optimization plan documents safe index candidates." : "No query optimization plan found.",
      blocker: "No risky migration should ship without observed query plans.",
      nextAction: "Capture slow-query evidence for replay, governance, provider logs and benchmark result reads before migrations.",
      ownerRole: "Database owner",
    },
    {
      area: "Queue optimization",
      currentPercent: input.queueOptimizationPresent ? 65 : 30,
      evidence: input.queueOptimizationPresent ? "Replay and governance queues use non-blocking in-process paths with bounded snapshots." : "Queue isolation not documented.",
      blocker: "In-process queues are not durable production workers.",
      nextAction: "Add durable idempotent queue storage after pilot traffic proves event volume and retry needs.",
      ownerRole: "Workflow execution owner",
    },
    {
      area: "Proprietary inference maturity",
      currentPercent: input.proprietaryModelBenchmarked ? 55 : 15,
      evidence: input.proprietaryModelBenchmarked ? "A proprietary model-assisted benchmark is recorded." : "No proprietary model benchmark is recorded.",
      blocker: "Do not claim first-party ML detection until model inference is trained, benchmarked and reviewed.",
      nextAction: "Define first-party inference scope only after labelled data, evaluation protocol and reviewer adjudication are ready.",
      ownerRole: "Founder / ML owner",
    },
  ];
}
