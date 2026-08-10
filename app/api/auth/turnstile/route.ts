import { NextResponse } from "next/server";
import {
  checkRequestRateLimit,
  getClientIp,
  getTurnstileTokenFromJson,
  verifyTurnstileToken,
} from "@/lib/bot-protection";
import { emitTraceSpan } from "@/lib/operations/observability";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const requestedCorrelationId = req.headers.get("x-correlation-id")?.trim() ?? "";
  const correlationId = /^[A-Za-z0-9_.:-]{1,128}$/.test(requestedCorrelationId)
    ? requestedCorrelationId
    : crypto.randomUUID();
  const expectedHostname = new URL(req.url).hostname;
  const rateLimited = checkRequestRateLimit(
    req,
    "/api/auth/turnstile",
    12,
    60_000
  );
  if (rateLimited) return rateLimited;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const token = body ? getTurnstileTokenFromJson(body) : "";

  if (!token || token.length > 2048) {
    return NextResponse.json(
      { ok: false, code: "TURNSTILE_TOKEN_INVALID", error: "Security check failed. Please try again." },
      { status: 400, headers: { "cache-control": "no-store", "x-correlation-id": correlationId } }
    );
  }

  const result = await verifyTurnstileToken(
    token,
    getClientIp(req),
    expectedHostname,
  );

  emitTraceSpan("auth.turnstile.verified", {
    correlationId,
    operationType: "auth.turnstile.verify",
    resultState: result.ok ? "verified" : "failed",
    providerState: result.reason === "provider_unavailable" ? "unavailable" : "available",
    reasonCode: result.reason,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    applicationSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  });
  console.info("Auth security check completed.", {
    correlationId,
    ok: result.ok,
    reason: result.reason,
    hostname: expectedHostname,
  });

  if (!result.ok) {
    const unavailable = ["turnstile_not_configured", "provider_unavailable", "provider_error"].includes(
      result.reason
    );
    return NextResponse.json(
      {
        ok: false,
        code: result.reason.toUpperCase(),
        error: unavailable
          ? "Security check is temporarily unavailable."
          : "Security check failed. Please try again.",
      },
      {
        status: unavailable ? 503 : 400,
        headers: { "cache-control": "no-store", "x-correlation-id": correlationId },
      }
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store", "x-correlation-id": correlationId } }
  );
}
