import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runtimeEngine } from "@/lib/core/runtime-engine";
import { checkRequestRateLimit } from "@/lib/security";
import { emitTraceSpan } from "@/lib/operations/observability";
import {
  Rc1ProviderError,
  retrieveHopaeTrustAssessment,
  startHopaeTrustAssessment,
} from "@/lib/providers/hopae-rc1-server";

export const dynamic = "force-dynamic";

function numberValue(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function correlationIdFor(request: Request) {
  const header = request.headers.get("x-correlation-id")?.trim();
  return header || crypto.randomUUID();
}

export async function GET(request: Request) {
  const correlationId = correlationIdFor(request);
  emitTraceSpan("trust.request.received", {
    correlationId,
    operationType: "trust.execute.get",
    resultState: "received",
    providerState: "unknown",
    reasonCode: "request_received",
    environment: process.env.NODE_ENV ?? "unknown",
    applicationSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  });
  const rateLimited = checkRequestRateLimit({ route: "/api/trust/execute:provider-session", req: request, limit: 20, windowMs: 60_000 });
  if (rateLimited) return rateLimited;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const providerSessionId = new URL(request.url).searchParams.get("provider_session_id") ?? "";
  try {
    const result = await retrieveHopaeTrustAssessment({ supabase, user, providerSessionId });
    return NextResponse.json(result, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Rc1ProviderError) {
      return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: error.status });
    }
    console.error("Provider session retrieval failed.", error);
    return NextResponse.json({ ok: false, error: "provider_session_unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const correlationId = correlationIdFor(request);
  emitTraceSpan("trust.request.received", {
    correlationId,
    operationType: "trust.execute.post",
    resultState: "received",
    providerState: "unknown",
    reasonCode: "request_received",
    environment: process.env.NODE_ENV ?? "unknown",
    applicationSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  });
  const rateLimited = checkRequestRateLimit({ route: "/api/trust/execute", req: request, limit: 20, windowMs: 60_000 });
  if (rateLimited) return rateLimited;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "invalid_execution_input" }, { status: 400 });

  if (body.action === "establish_trust") {
    emitTraceSpan("trust.provider.request", {
      correlationId,
      operationType: "trust.provider.request",
      resultState: "requested",
      providerState: String(body.provider_id ?? "unknown"),
      reasonCode: "provider_requested",
      environment: process.env.NODE_ENV ?? "unknown",
      applicationSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    });
    if (body.provider_id !== "hopae_connect") {
      return NextResponse.json({ ok: false, error: "unsupported_primary_provider" }, { status: 400 });
    }
    try {
      const result = await startHopaeTrustAssessment({
        supabase,
        user,
        body,
        appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin,
      });
      return NextResponse.json(result, { status: 201, headers: { "cache-control": "private, no-store" } });
    } catch (error) {
      if (error instanceof Rc1ProviderError) {
        return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: error.status });
      }
      console.error("Trust assessment session creation failed.", error);
      return NextResponse.json({ ok: false, error: "trust_assessment_unavailable" }, { status: 503 });
    }
  }

  const workflowId = String(body.workflow_id ?? crypto.randomUUID()).slice(0, 120);
  const actorId = user.id.slice(0, 120);
  const actorType = "human";
  const evidenceRefs = Array.isArray(body.evidence_refs) ? body.evidence_refs.map(String).slice(0, 20) : [];
  const pipeline = await runtimeEngine.executeRuntimeWorkflow(supabase, {
    actorId,
    actorType,
    workflowId,
    subjectType: String(body.subject_type ?? "workflow"),
    reviewerActor: user.email ?? user.id,
    timeoutMs: numberValue(body, "timeout_ms") ?? 300,
    identityConfidence: numberValue(body, "identity_confidence"),
    proofOfHuman: body.proof_of_human === "verified" || body.proof_of_human === "failed" ? body.proof_of_human : "unknown",
    agentIdentity: body.agent_identity === "verified" ? "verified" : body.agent_identity === "unverified" ? "unverified" : "unknown",
    nhiOwnership: body.nhi_ownership === "known" || body.nhi_ownership === "orphaned" ? body.nhi_ownership : "unknown",
    sessionIntegrity: numberValue(body, "session_integrity"),
    injectionRisk: numberValue(body, "injection_risk"),
    deviceChannelIntegrity: numberValue(body, "device_channel_integrity"),
    provenanceConfidence: numberValue(body, "provenance_confidence"),
    documentRisk: numberValue(body, "document_risk"),
    intentRisk: numberValue(body, "intent_risk"),
    runtimeBehavior: numberValue(body, "runtime_behavior"),
    providerSignals: numberValue(body, "provider_signals"),
    heuristicBaseline: numberValue(body, "heuristic_baseline"),
    previousTrustPosture: String(body.previous_trust_posture ?? "fresh") as any,
    governanceHistory: [],
    evidenceRefs,
    evidenceLastSeenAt: typeof body.evidence_last_seen_at === "string" ? body.evidence_last_seen_at : null,
  });

  emitTraceSpan("trust.decision.created", {
    correlationId,
    operationType: "trust.decision.created",
    resultState: pipeline?.ok === false ? "error" : "allow",
    providerState: String(body.provider_id ?? "unknown"),
    reasonCode: pipeline?.ok === false ? "decision_failed" : "decision_created",
    environment: process.env.NODE_ENV ?? "unknown",
    applicationSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  });

  return NextResponse.json(pipeline, { headers: { "cache-control": "no-store" } });
}
