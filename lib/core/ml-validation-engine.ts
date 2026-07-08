import { normalizeEntityIdentity, type EntityIdentityInput } from "@/lib/core/entity-identity";
import { getDetectionEngineStatus } from "@/lib/detection/detection-engine";
import { detectionProviders } from "@/lib/detection/providers";
import { buildProviderReadinessChecklist, summarizeProviderReadiness } from "@/lib/providers/provider-readiness";
import { runValidationBenchmark } from "@/lib/validation/benchmark-harness";
import { buildMlReadinessScoreboard, evaluateMlReadiness } from "@/lib/validation/ml-readiness";

export async function runMlValidationEngine(
  options: Parameters<typeof runValidationBenchmark>[0] = {},
  context?: { entity?: EntityIdentityInput }
) {
  const entity = context?.entity ? normalizeEntityIdentity(context.entity) : null;
  const benchmark = await runValidationBenchmark(options);
  const status = getDetectionEngineStatus();
  const providerReadiness = summarizeProviderReadiness(buildProviderReadinessChecklist());
  const precisionAvailable = benchmark.calibrationStatus.complete && benchmark.metrics.precision !== null;
  const recallAvailable = benchmark.calibrationStatus.complete && benchmark.metrics.recall !== null;
  const f1Available = benchmark.calibrationStatus.complete && benchmark.metrics.f1 !== null;
  const readiness = evaluateMlReadiness({
    realMlActive: status.real_ml_enabled,
    providerDetectionActive: providerReadiness.productionReady > 0 || status.provider_detection_enabled,
    validationDatasetPresent: benchmark.caseCount > 0,
    precisionAvailable,
    recallAvailable,
    f1Available,
    falsePositiveTracking: status.false_positive_tracking_present,
    falseNegativeTracking: status.false_negative_tracking_present,
    humanReviewEnabled: true,
    enterprisePilotValidated: false,
    proprietaryModelBenchmarked: false,
  });
  const providerComparison = {
    providerAgreement: benchmark.providerAgreement,
    providerCoverage: benchmark.providerCoverage,
    detectionSourceCoverage: benchmark.detectionSourceCoverage,
    boundary: "Provider comparison is a validation input and does not create an authenticity verdict.",
  };
  const benchmarkVersioning = {
    schemaVersion: benchmark.audit.schemaVersion,
    generatedAt: benchmark.audit.generatedAt,
    caseCount: benchmark.caseCount,
    sourcePolicy: benchmark.audit.sourcePolicy,
  };
  const calibrationHistory = {
    current: benchmark.calibrationStatus,
    confidenceCalibration: benchmark.confidenceCalibration,
    minimumSampleThreshold: 30,
    boundary: "Calibration history records readiness; it is not a public performance claim.",
  };
  const confidenceDrift = {
    trustDriftTracking: benchmark.trustDriftTracking,
    falsePositiveRate: benchmark.falsePositiveRate,
    falseNegativeRate: benchmark.falseNegativeRate,
    boundary: "Drift and error rates stay null or scoped until reviewed outcomes support them.",
  };

  return {
    engine: "ml_validation_engine" as const,
    benchmark,
    status,
    entity_identity: entity,
    providerReadiness,
    readiness,
    datasetReadiness: benchmark.datasetReadiness,
    reviewedOutcomes: benchmark.reviewedOutcomeSummary,
    providerComparison,
    benchmarkVersioning,
    calibrationHistory,
    confidenceDrift,
    source_separation: {
      real_ml: status.real_ml_enabled,
      provider_outputs: status.provider_detection_enabled,
      heuristic_logic: status.heuristic_detection_enabled,
      boundary: "Real ML, Provider API, Heuristic Baseline, Awaiting Credentials and Not Implemented remain separate states.",
    },
    limitations: [
      "No precision, recall or F1 claim is valid unless calibrationStatus.complete is true.",
      "Provider comparison is evidence, not a substitute for reviewed outcomes.",
      "Heuristic logic must not be described as trained first-party ML.",
    ],
  };
}

export function buildMlValidationReadiness(input: {
  benchmark: Awaited<ReturnType<typeof runValidationBenchmark>>;
  runtimeProfilingActive: boolean;
  loadTestPresent: boolean;
  queryPlanPresent: boolean;
  queueOptimizationPresent: boolean;
}) {
  const providerReadiness = summarizeProviderReadiness(buildProviderReadinessChecklist());
  return buildMlReadinessScoreboard({
    datasetReadinessPercent: input.benchmark.datasetReadiness.currentPercent,
    datasetEvidence: input.benchmark.datasetReadiness.evidence,
    datasetBlocker: input.benchmark.datasetReadiness.blocker,
    calibrationComplete: input.benchmark.calibrationStatus.complete,
    calibrationMessage: input.benchmark.calibrationStatus.message,
    providerDetectionActive: providerReadiness.productionReady > 0,
    providerCount: providerReadiness.total || detectionProviders.length,
    reviewedOutcomeCount: input.benchmark.reviewedOutcomeSummary.reviewed,
    runtimeProfilingActive: input.runtimeProfilingActive,
    loadTestPresent: input.loadTestPresent,
    queryPlanPresent: input.queryPlanPresent,
    queueOptimizationPresent: input.queueOptimizationPresent,
    proprietaryModelBenchmarked: false,
  });
}

export const mlValidationEngine = {
  runMlValidationEngine,
  buildMlValidationReadiness,
};
