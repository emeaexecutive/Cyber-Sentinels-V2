import { NextResponse } from "next/server";
import {
  checkRequestRateLimit,
  getClientIp,
  getExpectedTurnstileHostname,
  getTurnstileTokenFromJson,
  verifyTurnstileToken,
} from "@/lib/bot-protection";
import {
  getApprovedAuthOrigin,
  getAuthErrorCode,
  isApprovedSameOriginRequest,
  isAuthRateLimitError,
  normalizePasswordResetCorrelationId,
  PASSWORD_RECOVERY_PATH,
  PASSWORD_RESET_GENERIC_MESSAGE,
} from "@/lib/auth/password-recovery";
import { captureOperationalIssue } from "@/lib/operational-monitoring";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function copyAuthHeaders(response: NextResponse, authHeaders: Headers) {
  authHeaders.forEach((value, name) => response.headers.append(name, value));
  response.headers.set("cache-control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("pragma", "no-cache");
  response.headers.set("expires", "0");
  return response;
}

function safeFailure(
  status: number,
  code: string,
  error: string,
  correlationId: string,
) {
  return NextResponse.json(
    { ok: false, code, error },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-correlation-id": correlationId,
      },
    },
  );
}

export async function POST(request: Request) {
  const correlationId =
    normalizePasswordResetCorrelationId(request.headers.get("x-correlation-id")) ??
    crypto.randomUUID();
  const approvedOrigin = getApprovedAuthOrigin(request.url);

  captureOperationalIssue(
    "password_recovery",
    "info",
    "PASSWORD_RESET_REQUESTED",
    {
      correlation_id: correlationId,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    },
  );

  if (!approvedOrigin || !isApprovedSameOriginRequest(request)) {
    captureOperationalIssue("password_recovery", "warning", "PASSWORD_RESET_FAILED", {
      correlation_id: correlationId,
      reason: "wrong_origin",
    });
    return safeFailure(403, "WRONG_ORIGIN", "Request could not be verified.", correlationId);
  }

  const rateLimited = checkRequestRateLimit(
    request,
    "/api/auth/password-reset/request",
    6,
    60_000,
  );
  if (rateLimited) {
    captureOperationalIssue("password_recovery", "warning", "PASSWORD_RESET_FAILED", {
      correlation_id: correlationId,
      reason: "application_rate_limit",
    });
    return safeFailure(
      429,
      "RATE_LIMITED",
      "Too many attempts. Please wait a moment and try again.",
      correlationId,
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = String(body?.email ?? "").trim().toLowerCase();
  const turnstileToken = body ? getTurnstileTokenFromJson(body) : "";

  if (!emailPattern.test(email) || email.length > 254) {
    return safeFailure(400, "INVALID_EMAIL", "Enter a valid email address.", correlationId);
  }

  if (turnstileToken.length > 2048) {
    captureOperationalIssue("password_recovery", "warning", "PASSWORD_RESET_FAILED", {
      correlation_id: correlationId,
      reason: "invalid_security_token",
    });
    return safeFailure(
      400,
      "TURNSTILE_TOKEN_INVALID",
      "We couldn't complete the security check. Please try again.",
      correlationId,
    );
  }

  const turnstile = await verifyTurnstileToken(
    turnstileToken,
    getClientIp(request),
    getExpectedTurnstileHostname(new URL(request.url).hostname),
  );

  if (!turnstile.ok) {
    const unavailable = [
      "turnstile_not_configured",
      "turnstile_configuration_invalid",
      "provider_unavailable",
      "provider_error",
    ].includes(turnstile.reason);
    captureOperationalIssue("password_recovery", "warning", "PASSWORD_RESET_FAILED", {
      correlation_id: correlationId,
      reason: turnstile.reason,
    });
    return safeFailure(
      unavailable ? 503 : 400,
      turnstile.reason.toUpperCase(),
      unavailable
        ? "Security check is temporarily unavailable."
        : "We couldn't complete the security check. Please try again.",
      correlationId,
    );
  }

  const authHeaders = new Headers();

  try {
    const supabase = await createClient(authHeaders);
    const callbackUrl = new URL("/auth/callback", approvedOrigin);
    callbackUrl.searchParams.set("next", PASSWORD_RECOVERY_PATH);
    callbackUrl.searchParams.set("request_id", correlationId);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl.toString(),
    });

    if (error) {
      const rateLimit = isAuthRateLimitError(error);
      captureOperationalIssue("password_recovery", "warning", "PASSWORD_RESET_FAILED", {
        correlation_id: correlationId,
        reason: getAuthErrorCode(error),
        provider_status: rateLimit ? 429 : "error",
      });
      return copyAuthHeaders(
        safeFailure(
          rateLimit ? 429 : 502,
          rateLimit ? "RATE_LIMITED" : "EMAIL_PROVIDER_FAILED",
          rateLimit
            ? "Too many reset emails have been requested. Please wait and try again."
            : "We couldn't send password reset instructions. Please try again shortly.",
          correlationId,
        ),
        authHeaders,
      );
    }

    captureOperationalIssue(
      "password_recovery",
      "info",
      "PASSWORD_RESET_EMAIL_ACCEPTED_BY_PROVIDER",
      { correlation_id: correlationId },
    );

    return copyAuthHeaders(
      NextResponse.json(
        { ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE },
        { headers: { "x-correlation-id": correlationId } },
      ),
      authHeaders,
    );
  } catch (error) {
    captureOperationalIssue("password_recovery", "error", "PASSWORD_RESET_FAILED", {
      correlation_id: correlationId,
      reason: getAuthErrorCode(error),
    });
    return copyAuthHeaders(
      safeFailure(
        503,
        "PASSWORD_RESET_UNAVAILABLE",
        "We couldn't send password reset instructions. Please try again shortly.",
        correlationId,
      ),
      authHeaders,
    );
  }
}
