import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRequestRateLimit } from "@/lib/security";
import { emitTraceSpan } from "@/lib/operations/observability";
import { CanonicalTransactionError, createCanonicalTrustTransactionDependencies } from "@/lib/trust-transaction/server";
import { executeCanonicalTrustTransaction } from "@/src/lib/trust-transaction/canonical";
import { enterpriseSubjectClasses } from "@/src/lib/trust-fabric/types";
import {
  Rc1ProviderError,
  retrieveHopaeTrustAssessment,
  startHopaeTrustAssessment,
} from "@/lib/providers/hopae-rc1-server";

export const dynamic = "force-dynamic";

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
  let supabase;
  let user;
  try {
    supabase = await createClient();
    ({ data: { user } } = await supabase.auth.getUser());
  } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
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
  let supabase;
  let user;
  try {
    supabase = await createClient();
    ({ data: { user } } = await supabase.auth.getUser());
  } catch {
    return NextResponse.json({ ok: false, error: "authentication_service_unavailable" }, { status: 503 });
  }
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

  const subjectType = String(body.subject_type ?? "");
  if (!enterpriseSubjectClasses.includes(subjectType as (typeof enterpriseSubjectClasses)[number])) {
    return NextResponse.json({ ok: false, error: "invalid_trust_object_type" }, { status: 400 });
  }
  try {
    const receipt = await executeCanonicalTrustTransaction({
      trustObject: { subjectType: subjectType as (typeof enterpriseSubjectClasses)[number], subjectId: String(body.subject_id ?? "") },
      operationalEntityId: body.operational_entity_id ? String(body.operational_entity_id) : null,
      action: {
        type: String(body.requested_action ?? ""),
        purpose: String(body.requested_purpose ?? ""),
        resource: String(body.resource ?? ""),
        environment: String(body.environment ?? ""),
        payloadDigest: String(body.payload_digest ?? ""),
      },
      idempotencyKey: String(body.idempotency_key ?? ""),
      providerExecutionId: body.provider_execution_id ? String(body.provider_execution_id) : null,
      previousTransactionId: body.previous_transaction_id ? String(body.previous_transaction_id) : null,
    }, createCanonicalTrustTransactionDependencies({ supabase, user }));
    emitTraceSpan("trust.decision.created", {
      correlationId: receipt.correlationId,
      operationType: "trust.decision.created",
      resultState: receipt.decision.toLowerCase(),
      providerState: receipt.evidence.length ? "stored_evidence" : "unavailable",
      reasonCode: "canonical_transaction_recorded",
      environment: process.env.NODE_ENV ?? "unknown",
      applicationSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    });
    return NextResponse.json({ ok: true, receipt }, { status: receipt.idempotentReplay ? 200 : 201, headers: { "cache-control": "private, no-store", location: receipt.historyUrl } });
  } catch (error) {
    if (error instanceof CanonicalTransactionError) return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: error.status });
    if (error instanceof TypeError) return NextResponse.json({ ok: false, error: "invalid_execution_input", message: error.message }, { status: 400 });
    console.error("Canonical trust transaction failed.", { correlationId, message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ ok: false, error: "trust_transaction_unavailable" }, { status: 503 });
  }
}
