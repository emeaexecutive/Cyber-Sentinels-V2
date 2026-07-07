import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { getDetectionEngineStatus } from "@/lib/detection/detection-engine";
import { createClient } from "@/lib/supabase/server";
import { loadValidationCases } from "@/lib/validation/benchmark-harness";
import { evaluateMlReadiness, mlReadinessLevels } from "@/lib/validation/ml-readiness";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const admin = await requireAdminApiAccess(request, supabase);
  if (!admin.ok) return admin.response;

  const [cases, status] = await Promise.all([
    loadValidationCases(),
    Promise.resolve(getDetectionEngineStatus()),
  ]);
  const validationDatasetPresent = cases.length > 0;
  const precisionAvailable = validationDatasetPresent;
  const recallAvailable = validationDatasetPresent;
  const f1Available = validationDatasetPresent;

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
      benchmark_case_count: cases.length,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
