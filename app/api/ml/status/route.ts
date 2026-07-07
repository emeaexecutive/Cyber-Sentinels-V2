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
  const providerAwaitingCredentials = providerStates.some(({ status }) => status === "awaiting_credentials");
  return NextResponse.json({
    currentMaturityLevel: providerMlActive && cases.length ? 3 : 2,
    maturityLabel: providerMlActive && cases.length ? "Provider-backed validation in progress" : "Provider-ready foundation",
    realMlInferenceActive: false,
    providerMlActive,
    providerMlStatus: providerMlActive ? "Live" : providerAwaitingCredentials ? "Awaiting Credentials" : "Disabled",
    baselineModelActive: true,
    baselineLabel: "Heuristic Baseline / baseline_model_assisted",
    intentAwareTrustScoring: {
      active: true,
      source: "Heuristic Baseline",
      label: "intent-aware heuristic/risk scoring",
      confirmedMl: false,
      supportedActors: ["human", "agent", "NHI", "workflow"],
      recommendations: ["allow", "review", "escalate", "block"],
    },
    validationDatasetPresent: cases.length > 0,
    benchmarkResultsAvailable: cases.length > 0,
    precisionRecallStatus: cases.length ? "available_on_run" : "not_available",
    falsePositiveTracking: true,
    falseNegativeTracking: true,
    missingCredentials: providerStates.filter(({ status }) => status === "awaiting_credentials").map(({ providerName }) => providerName),
    nextRequiredActions: [
      "Add approved labelled validation cases.",
      "Implement and exercise a reviewed provider endpoint.",
      "Establish cohort-specific precision and recall thresholds.",
    ],
    limitations: [
      "No trained first-party ML inference is active.",
      "Credentials alone do not establish a live provider integration.",
      "Precision, recall and F1 remain unavailable without labelled validation cases.",
    ],
    providers: providerStates,
  }, { headers: { "cache-control": "no-store" } });
}
