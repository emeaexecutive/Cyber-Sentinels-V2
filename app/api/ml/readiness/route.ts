import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { canonicalDetectionSources, getDetectionEngineStatus } from "@/lib/detection/detection-engine";
import { buildProviderReadinessChecklist, summarizeProviderReadiness } from "@/lib/providers/provider-readiness";
import { createClient } from "@/lib/supabase/server";
import { runValidationBenchmark } from "@/lib/validation/benchmark-harness";
import { buildMlReadinessScoreboard, evaluateMlReadiness, mlReadinessLevels } from "@/lib/validation/ml-readiness";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const admin = await requireAdminApiAccess(request, supabase);
  if (!admin.ok) return admin.response;

  const [benchmark, status] = await Promise.all([
    runValidationBenchmark(),
    Promise.resolve(getDetectionEngineStatus()),
  ]);
  const validationDatasetPresent = benchmark.caseCount > 0;
  const providerReadiness = summarizeProviderReadiness(buildProviderReadinessChecklist());
  const precisionAvailable = benchmark.calibrationStatus.complete && benchmark.metrics.precision !== null;
  const recallAvailable = benchmark.calibrationStatus.complete && benchmark.metrics.recall !== null;
  const f1Available = benchmark.calibrationStatus.complete && benchmark.metrics.f1 !== null;
  const root = process.cwd();
  const readinessAreas = buildMlReadinessScoreboard({
    datasetReadinessPercent: benchmark.datasetReadiness.currentPercent,
    datasetEvidence: benchmark.datasetReadiness.evidence,
    datasetBlocker: benchmark.datasetReadiness.blocker,
    calibrationComplete: benchmark.calibrationStatus.complete,
    calibrationMessage: benchmark.calibrationStatus.message,
    providerDetectionActive: providerReadiness.productionReady > 0 || status.provider_detection_enabled,
    providerCount: providerReadiness.total,
    reviewedOutcomeCount: benchmark.reviewedOutcomeSummary.reviewed,
    runtimeProfilingActive: existsSync(path.join(root, "lib", "performance", "runtime-profiler.ts")),
    loadTestPresent: existsSync(path.join(root, "tests", "load", "trust-execution-load.test.mjs")),
    queryPlanPresent:
      existsSync(path.join(root, "docs", "QUERY_AND_QUEUE_OPTIMIZATION.md")) ||
      existsSync(path.join(root, "docs", "QUERY_OPTIMIZATION_PLAN.md")),
    queueOptimizationPresent: existsSync(path.join(root, "lib", "governance", "governance-queue.ts")),
    proprietaryModelBenchmarked: false,
  });

  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      levels: mlReadinessLevels,
      ...evaluateMlReadiness({
        realMlActive: status.real_ml_enabled,
        providerDetectionActive: status.provider_detection_enabled,
        validationDatasetPresent,
        precisionAvailable,
        recallAvailable,
        f1Available,
        falsePositiveTracking: status.false_positive_tracking_present,
        falseNegativeTracking: status.false_negative_tracking_present,
        humanReviewEnabled: true,
        enterprisePilotValidated: false,
        proprietaryModelBenchmarked: false,
      }),
      benchmark_case_count: benchmark.caseCount,
      validation_dataset_message: benchmark.caseCount ? null : "No validation dataset available yet.",
      calibration_status: benchmark.calibrationStatus,
      dataset_readiness: benchmark.datasetReadiness,
      readiness_areas: readinessAreas,
      source_labels: canonicalDetectionSources,
      metric_readiness: {
        confusion_matrix: validationDatasetPresent ? "available_on_run" : "awaiting_labelled_dataset",
        precision: precisionAvailable ? "available_on_run" : "Calibration incomplete - insufficient validated data.",
        recall: recallAvailable ? "available_on_run" : "Calibration incomplete - insufficient validated data.",
        f1: f1Available ? "available_on_run" : "Calibration incomplete - insufficient validated data.",
        false_positive_tracking: status.false_positive_tracking_present,
        false_negative_tracking: status.false_negative_tracking_present,
        reviewer_agreement: validationDatasetPresent ? "available_on_run" : "awaiting_reviewed_cases",
        provider_agreement: status.provider_detection_enabled && validationDatasetPresent ? "available_on_run" : "awaiting_live_provider_and_dataset",
        confidence_calibration: validationDatasetPresent ? "available_on_run" : "awaiting_labelled_dataset",
      },
    },
    { headers: { "cache-control": "no-store" } }
  );
}
