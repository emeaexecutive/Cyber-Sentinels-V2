import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { mlValidationEngine } from "@/lib/core/ml-validation-engine";
import { canonicalDetectionSources, getDetectionEngineStatus } from "@/lib/detection/detection-engine";
import { createClient } from "@/lib/supabase/server";
import { mlReadinessLevels } from "@/lib/validation/ml-readiness";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const admin = await requireAdminApiAccess(request, supabase);
  if (!admin.ok) return admin.response;

  const [validation, status] = await Promise.all([
    mlValidationEngine.runMlValidationEngine(),
    Promise.resolve(getDetectionEngineStatus()),
  ]);
  const benchmark = validation.benchmark;
  const validationDatasetPresent = benchmark.caseCount > 0;
  const precisionAvailable = benchmark.calibrationStatus.complete && benchmark.metrics.precision !== null;
  const recallAvailable = benchmark.calibrationStatus.complete && benchmark.metrics.recall !== null;
  const f1Available = benchmark.calibrationStatus.complete && benchmark.metrics.f1 !== null;
  const root = process.cwd();
  const readinessAreas = mlValidationEngine.buildMlValidationReadiness({
    benchmark,
    runtimeProfilingActive: existsSync(path.join(root, "lib", "performance", "runtime-profiler.ts")),
    loadTestPresent: existsSync(path.join(root, "tests", "load", "trust-execution-load.test.mjs")),
    queryPlanPresent:
      existsSync(path.join(root, "docs", "QUERY_AND_QUEUE_OPTIMIZATION.md")) ||
      existsSync(path.join(root, "docs", "QUERY_OPTIMIZATION_PLAN.md")),
    queueOptimizationPresent: existsSync(path.join(root, "lib", "governance", "governance-queue.ts")),
  });

  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      levels: mlReadinessLevels,
      ...validation.readiness,
      source_separation: validation.source_separation,
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
