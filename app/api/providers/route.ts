import { NextResponse } from "next/server";
import {
  getVerificationProviderRegistry,
} from "@/lib/providers";
import { buildProviderReadinessChecklist, providerRealityState } from "@/lib/providers/provider-readiness";
import { createClient } from "@/lib/supabase/server";
import { checkRequestRateLimit } from "@/lib/security";
import {
  processHopaeProviderCallback,
  Rc1ProviderError,
} from "@/lib/providers/hopae-rc1-server";

export const dynamic = "force-dynamic";

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

  const readinessByName = new Map(
    buildProviderReadinessChecklist().map((provider) => [provider.name, provider])
  );
  return NextResponse.json({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    ok: true,
    statusMeaning:
      "Provider maturity uses only Live, Test, Awaiting Credentials, Prototype and Disabled. Live additionally requires a successful real check; no state is an accuracy claim.",
    providers: getVerificationProviderRegistry().map((provider) => ({
      id: provider.id,
      name: provider.name,
      category: provider.category,
      runtimeState: readinessByName.has(provider.name)
        ? providerRealityState(readinessByName.get(provider.name)!)
        : "Disabled",
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

export async function POST(request: Request) {
  const rateLimited = checkRequestRateLimit({ route: "/api/providers", req: request, limit: 120, windowMs: 60_000 });
  if (rateLimited) return rateLimited;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 256_000) {
    return NextResponse.json({ ok: false, error: "provider_payload_too_large" }, { status: 413 });
  }
  const signature = request.headers.get("x-hopae-signature") ?? request.headers.get("hopae-signature") ?? "";
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 256_000) {
    return NextResponse.json({ ok: false, error: "provider_payload_too_large" }, { status: 413 });
  }
  try {
    const result = await processHopaeProviderCallback(rawBody, signature);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Rc1ProviderError) {
      return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: error.status });
    }
    console.error("Provider callback processing failed.", error);
    return NextResponse.json({ ok: false, error: "provider_callback_unavailable" }, { status: 503 });
  }
}
