import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import {
  getVerificationProviderRegistry,
} from "@/lib/providers";
import { buildProviderReadinessChecklist, providerRealityState } from "@/lib/providers/provider-readiness";
import { createClient } from "@/lib/supabase/server";
import { checkRequestRateLimit } from "@/lib/security";
import { inspectHopaeProviderConfig } from "@/lib/providers/adapters/hopae/hopae-config";
import { HopaeAdapter } from "@/lib/providers/adapters/hopae/hopae-adapter";
import { retainProviderHealth } from "@/lib/providers/provider-health";
import { getProviderTelemetry } from "@/lib/providers/provider-telemetry";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  processHopaeProviderCallback,
  Rc1ProviderError,
} from "@/lib/providers/hopae-rc1-server";
import { completeWebhookEvent, retainRejectedWebhookEvent } from "@/lib/webhooks/event-ledger";
import { bridgeHopaeCallbackToIdentity } from "@/lib/identity-signals/hopae-callback-bridge";
import { ingestTrustEventRequest } from "@/src/lib/trust-events/gateway";
import { supabaseTrustEventRepository } from "@/src/lib/trust-events/repository";
import { canonicalProviderRuntimeState } from "@/lib/providers/runtime-contract";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") ?? 20) || 20));
  const [executionResult, evidenceResult] = await Promise.all([
    supabase.from("provider_execution_records")
      .select("execution_id,provider_id,environment,runtime_mode,provider_session_id,request_created_at,callback_received_at,signature_status,idempotency_status,evidence_quality_status,status,latency_ms,replay_reference,evidence_graph_reference,trust_memory_reference,updated_at")
      .order("updated_at", { ascending: false }).limit(limit),
    supabase.from("normalized_identity_evidence")
      .select("evidence_id,provider_id,provider_session_id,evidence_type,outcome,assurance_level,observed_at,expires_at,mapping_version,replay_reference,evidence_graph_reference,trust_memory_reference,created_at")
      .order("created_at", { ascending: false }).limit(limit),
  ]);
  const hopaeConfig = inspectHopaeProviderConfig();
  const recentExecutions = executionResult.error?.code === "42P01" ? [] : executionResult.data ?? [];
  const recentEvidence = evidenceResult.error?.code === "42P01" ? [] : evidenceResult.data ?? [];
  return NextResponse.json({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    ok: true,
    statusMeaning:
      "Canonical runtime states are available, degraded, unavailable, contradicted and unknown. They describe operational evidence availability, not provider accuracy.",
    providers: getVerificationProviderRegistry().map((provider) => {
      const maturityState = readinessByName.has(provider.name)
        ? providerRealityState(readinessByName.get(provider.name)!)
        : "Disabled";
      return {
        id: provider.id,
        name: provider.name,
        category: provider.category,
        runtimeState: canonicalProviderRuntimeState({
          configured: provider.status === "configured",
          usesMockData: provider.usesMockData,
          safeFailure: provider.safeFailure,
          runtimeState: maturityState,
        }),
        adapterMaturityState: maturityState,
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
        ...(provider.id === "hopae_connect" ? {
          environment: hopaeConfig.config.environment,
          configuredState: !hopaeConfig.config.enabled ? "DISABLED" : hopaeConfig.configured ? "CONFIGURED" : "MISCONFIGURED",
          adapterVersion: "pal-hopae-1.0.0",
          apiVersion: "connect-v1",
          callbackSecurity: "HMAC-SHA256 over timestamp and exact raw body",
          mappingVersion: "hopae-connect-v1-2026-07-17",
        } : {}),
      };
    }),
    recentExecutions,
    recentEvidence,
    telemetry: getProviderTelemetry(limit),
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(request, supabase);
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const providerId = String(body?.provider_id ?? "");
  const enabled = body?.enabled;
  const reason = String(body?.reason ?? "").trim();
  if (providerId !== "hopae_connect" || typeof enabled !== "boolean" || reason.length < 8 || reason.length > 500) {
    return NextResponse.json({ ok: false, error: "invalid_provider_state_change" }, { status: 400 });
  }
  const correlationId = crypto.randomUUID();
  const { error } = await createServiceRoleClient().rpc("set_provider_enabled", {
    target_provider_id: providerId,
    target_enabled: enabled,
    target_actor_id: access.user.id,
    target_reason: reason,
    target_correlation_id: correlationId,
  });
  if (error) {
    console.error("Provider state change failed.", { providerId, correlationId, code: error.code });
    return NextResponse.json({ ok: false, error: "provider_state_change_failed", correlationId }, { status: 500 });
  }
  return NextResponse.json({ ok: true, providerId, enabled, correlationId });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(request, supabase);
  if (!access.ok) return access.response;
  const correlationId = crypto.randomUUID();
  const inspected = inspectHopaeProviderConfig();
  const snapshot = inspected.configured
    ? await new HopaeAdapter({ correlationId }).healthCheck()
    : {
        provider: "hopae_connect" as const,
        environment: inspected.config.environment,
        configured: false,
        enabled: inspected.config.enabled,
        state: "MISCONFIGURED" as const,
        reason: inspected.config.enabled ? "Required configuration is missing or invalid." : "Provider is disabled in deployment configuration.",
        checkedAt: new Date().toISOString(),
        latencyMs: null,
        providerRequestId: null,
      };
  retainProviderHealth(snapshot);
  const admin = createServiceRoleClient();
  const { error: snapshotError } = await admin.from("provider_operational_health_snapshots").insert({
    provider_id: snapshot.provider,
    environment: snapshot.environment,
    health_status: snapshot.state,
    health_dimension: snapshot.configured ? "connectivity" : "configuration",
    reason: snapshot.reason,
    latency_ms: snapshot.latencyMs,
    provider_request_id: snapshot.providerRequestId,
  });
  if (snapshotError) return NextResponse.json({ ok: false, error: "provider_health_persistence_failed", correlationId }, { status: 500 });
  await admin.from("provider_registry").update({
    environment: snapshot.environment,
    configured_state: snapshot.configured ? "CONFIGURED" : inspected.config.enabled ? "MISCONFIGURED" : "DISABLED",
    health_status: snapshot.state,
    last_health_check: snapshot.checkedAt,
    ...(snapshot.state === "HEALTHY" ? { last_successful_call: snapshot.checkedAt } : { last_failed_call: snapshot.checkedAt }),
    updated_at: snapshot.checkedAt,
  }).eq("provider_id", snapshot.provider);
  return NextResponse.json({ ok: true, correlationId, snapshot });
}

export async function POST(request: Request) {
  const rateLimited = checkRequestRateLimit({ route: "/api/providers", req: request, limit: 120, windowMs: 60_000 });
  if (rateLimited) return rateLimited;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 256_000) {
    return NextResponse.json({ ok: false, error: "provider_payload_too_large" }, { status: 413 });
  }
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return NextResponse.json({ ok: false, error: "provider_content_type_invalid" }, { status: 415 });
  }
  const signature = request.headers.get("x-hopae-signature") ?? request.headers.get("hopae-signature") ?? "";
  const callbackReceivedAt = new Date();
  const rawBytes = new Uint8Array(await request.arrayBuffer());
  if (rawBytes.byteLength > 256_000) {
    return NextResponse.json({ ok: false, error: "provider_payload_too_large" }, { status: 413 });
  }
  let rawBody: string;
  try { rawBody = new TextDecoder("utf-8", { fatal: true }).decode(rawBytes); }
  catch { return NextResponse.json({ ok: false, error: "provider_payload_invalid_utf8" }, { status: 400 }); }
  try {
    const result = await processHopaeProviderCallback(rawBody, signature);
    await bridgeHopaeCallbackToIdentity(result).catch((bridgeError) => {
      console.warn("Hopae callback completed, but no EPIC 17.1 identity request was bridged.", bridgeError);
    });
    const trustEvent = await ingestTrustEventRequest({
      rawBytes,
      headers: Object.fromEntries([...request.headers.entries()].map(([key, value]) => [key.toLowerCase(), value])),
      method: request.method,
      path: "/api/trust-events/ingest/hopae_connect",
      receivedAt: callbackReceivedAt,
      correlationId: crypto.randomUUID(),
    }, supabaseTrustEventRepository());
    const providerDisabled = (result as { outcome?: string }).outcome === "ignored_provider_disabled";
    if (!trustEvent.ok && !(providerDisabled && trustEvent.disposition === "BLOCKED_PROVIDER")) {
      console.error("Hopae callback canonical Trust Event persistence failed.", { disposition: trustEvent.disposition, correlationId: trustEvent.correlationId });
      return NextResponse.json({ ok: false, error: "canonical_trust_event_persistence_failed", disposition: trustEvent.disposition, correlationId: trustEvent.correlationId }, { status: trustEvent.conflict ? 409 : 503, headers: { "cache-control": "no-store" } });
    }
    return NextResponse.json({ ...result, trustEvent: { disposition: trustEvent.disposition, eventIds: trustEvent.eventIds, correlationId: trustEvent.correlationId } }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Rc1ProviderError) {
      const rejectedBeforeTrust = ["forged_callback", "stale_callback", "invalid_callback_body", "invalid_callback_reference", "provider_invalid_response", "callback_signature_invalid", "callback_timestamp_invalid"].includes(error.code);
      if (rejectedBeforeTrust) {
        await retainRejectedWebhookEvent("hopae_connect", rawBody, error.code).catch(() => undefined);
      } else {
        const payload = JSON.parse(rawBody || "{}");
        const eventId = String(payload?.event_id ?? payload?.eventId ?? payload?.data?.event_id ?? payload?.data?.eventId ?? "").trim();
        if (eventId) await completeWebhookEvent("hopae_connect", eventId, "failed", error.code).catch(() => undefined);
      }
      const failedAt = new Date().toISOString();
      const admin = createServiceRoleClient();
      await Promise.all([
        admin.from("provider_registry").update({ health_status: "DEGRADED", last_failed_call: failedAt, updated_at: failedAt }).eq("provider_id", "hopae_connect"),
        admin.from("provider_operational_health_snapshots").insert({
          provider_id: "hopae_connect",
          environment: inspectHopaeProviderConfig().config.environment,
          health_status: "DEGRADED",
          health_dimension: rejectedBeforeTrust ? "callback" : "evidence_pipeline",
          reason: error.code,
          callback_verification_failures: rejectedBeforeTrust ? 1 : 0,
        }),
      ]).catch(() => undefined);
      return NextResponse.json({ ok: false, error: error.code, reasonCode: error.reasonCode, message: error.message }, { status: error.status });
    }
    console.error("Provider callback processing failed.", error);
    return NextResponse.json({ ok: false, error: "provider_callback_unavailable" }, { status: 503 });
  }
}
