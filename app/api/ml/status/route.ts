import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { detectionProviders } from "@/lib/detection/providers";
import { loadValidationCases } from "@/lib/validation/benchmark-harness";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const admin = await requireAdminApiAccess(request, supabase);
  if (!admin.ok) return admin.response;

  const cases = await loadValidationCases();
  const providerStates = detectionProviders.map((provider) => ({
    providerName: provider.providerName,
    status: provider.status(),
    supportedSignals: provider.supportedSignals,
  }));
  const providerMlActive = providerStates.some(({ status }) => status === "live");
  return NextResponse.json({
    currentMaturityLevel: providerMlActive ? 3 : 2,
    realMlInferenceActive: false,
    providerMlActive,
    baselineModelActive: true,
    validationDatasetPresent: cases.length > 0,
    benchmarkResultsAvailable: cases.length > 0,
    precisionRecallStatus: cases.length ? "available_on_run" : "not_available",
    missingCredentials: providerStates.filter(({ status }) => status === "awaiting_credentials").map(({ providerName }) => providerName),
    nextRequiredActions: [
      "Add approved labelled validation cases.",
      "Implement and exercise a reviewed provider endpoint.",
      "Establish cohort-specific precision and recall thresholds.",
    ],
    providers: providerStates,
  }, { headers: { "cache-control": "no-store" } });
}
