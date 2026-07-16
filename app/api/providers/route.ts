import { NextResponse } from "next/server";
import {
  getVerificationProviderRegistry,
  providerRuntimeState,
} from "@/lib/providers";
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

  return NextResponse.json({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    ok: true,
    statusMeaning:
      "Live means a supported code path is enabled and configured; it is not a provider health or accuracy claim.",
    providers: getVerificationProviderRegistry().map((provider) => ({
      id: provider.id,
      name: provider.name,
      category: provider.category,
      runtimeState: providerRuntimeState(provider),
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
