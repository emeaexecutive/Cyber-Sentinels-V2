import { NextResponse } from "next/server";
import { getVerificationProviderRegistry } from "@/lib/providers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function runtimeState(provider: ReturnType<typeof getVerificationProviderRegistry>[number]) {
  if (provider.usesMockData) return "simulated";
  if (
    provider.implementationState === "placeholder" ||
    provider.implementationState === "configured_unverified"
  ) return "placeholder";
  if (provider.implementationState === "active" && provider.status === "configured") {
    return "real";
  }
  return "disabled";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      ok: false,
      error: "Authentication required.",
    }, { status: 401 });
  }

  return NextResponse.json({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    ok: true,
    statusMeaning:
      "Active means code paths are connected and configuration is present; it is not a live health or accuracy claim.",
    providers: getVerificationProviderRegistry().map((provider) => ({
      id: provider.id,
      name: provider.name,
      category: provider.category,
      runtimeState: runtimeState(provider),
      implementationState: provider.implementationState,
      configured: provider.status === "configured",
      credentialState: provider.missingEnv.length ? "missing_credentials" : "present",
      missingEnvironmentNames: provider.missingEnv,
      usesMockData: provider.usesMockData,
      safeFailure: provider.safeFailure,
      authProtection: provider.authProtection,
      replayIntegration: provider.replayIntegration,
      receiptIntegration: provider.receiptIntegration,
      purpose: provider.purpose,
      notes: provider.notes,
    })),
  });
}
