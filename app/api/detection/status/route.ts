import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { getDetectionEngineStatus } from "@/lib/detection/detection-engine";
import { createClient } from "@/lib/supabase/server";
import { loadValidationCases } from "@/lib/validation/benchmark-harness";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const admin = await requireAdminApiAccess(request, supabase);
  if (!admin.ok) return admin.response;

  const cases = await loadValidationCases();
  const status = getDetectionEngineStatus();
  return NextResponse.json({
    generated_at: new Date().toISOString(),
    ...status,
    validation_dataset_present: cases.length > 0,
    precision_recall_available: cases.length > 0,
    validation_dataset_message: cases.length ? null : "No validation dataset available yet.",
    benchmark_case_count: cases.length,
    next_required_action: cases.length
      ? "Run reviewed provider benchmarks and calibrate thresholds by workflow."
      : "No validation dataset available yet. Add approved labelled cases before reporting accuracy.",
  }, {
    headers: { "cache-control": "no-store" },
  });
}
