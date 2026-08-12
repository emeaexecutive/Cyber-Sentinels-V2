import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getAuthErrorCode,
  isApprovedSameOriginRequest,
  normalizePasswordResetCorrelationId,
  PASSWORD_RECOVERY_COOKIE,
  passwordRecoveryCookieOptions,
  validateNewPassword,
} from "@/lib/auth/password-recovery";
import { captureOperationalIssue } from "@/lib/operational-monitoring";
import { createClient, isInvalidRefreshTokenError } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  authHeaders: Headers,
) {
  const response = NextResponse.json(body, { status });
  authHeaders.forEach((value, name) => response.headers.append(name, value));
  response.headers.set("cache-control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("pragma", "no-cache");
  response.headers.set("expires", "0");
  return response;
}

function clearRecoveryState(response: NextResponse) {
  response.cookies.set(PASSWORD_RECOVERY_COOKIE, "", passwordRecoveryCookieOptions(0));
  return response;
}

function failure(
  authHeaders: Headers,
  status: number,
  code: string,
  error: string,
) {
  return jsonResponse({ ok: false, code, error }, status, authHeaders);
}

export async function POST(request: Request) {
  const authHeaders = new Headers();
  const cookieStore = await cookies();
  const correlationId = normalizePasswordResetCorrelationId(
    cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value,
  );

  if (!isApprovedSameOriginRequest(request)) {
    captureOperationalIssue("password_recovery", "warning", "PASSWORD_RESET_FAILED", {
      correlation_id: correlationId,
      reason: "wrong_origin",
    });
    return failure(authHeaders, 403, "WRONG_ORIGIN", "Request could not be verified.");
  }

  if (!correlationId) {
    captureOperationalIssue("password_recovery", "warning", "PASSWORD_RESET_FAILED", {
      reason: "missing_recovery_state",
    });
    return clearRecoveryState(
      failure(
        authHeaders,
        401,
        "RECOVERY_SESSION_INVALID",
        "Reset link expired or invalid. Request a new password reset email.",
      ),
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const password = typeof body?.password === "string" ? body.password : "";
  const confirmPassword =
    typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
  const nonce = typeof body?.nonce === "string" ? body.nonce.trim() : "";
  const policyError = validateNewPassword(password);

  if (policyError) {
    return failure(authHeaders, 400, "WEAK_PASSWORD", policyError);
  }

  if (password !== confirmPassword) {
    return failure(authHeaders, 400, "PASSWORD_MISMATCH", "Passwords do not match.");
  }

  try {
    const supabase = await createClient(authHeaders);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      captureOperationalIssue("password_recovery", "warning", "PASSWORD_RESET_FAILED", {
        correlation_id: correlationId,
        reason: "recovery_session_invalid",
      });
      return clearRecoveryState(
        failure(
          authHeaders,
          401,
          "RECOVERY_SESSION_INVALID",
          "Reset link expired or invalid. Request a new password reset email.",
        ),
      );
    }

    const { error } = await supabase.auth.updateUser({
      password,
      ...(nonce ? { nonce } : {}),
    });

    if (error) {
      const code = getAuthErrorCode(error);
      if (["reauthentication_needed", "reauth_nonce_missing"].includes(code)) {
        const { error: reauthenticationError } = await supabase.auth.reauthenticate();
        if (reauthenticationError) {
          captureOperationalIssue("password_recovery", "warning", "PASSWORD_RESET_FAILED", {
            correlation_id: correlationId,
            reason: getAuthErrorCode(reauthenticationError),
          });
          return failure(
            authHeaders,
            502,
            "REAUTHENTICATION_FAILED",
            "We couldn't send a security code. Please request a new password reset email.",
          );
        }

        return failure(
          authHeaders,
          409,
          "REAUTHENTICATION_REQUIRED",
          "Enter the security code we sent to your email.",
        );
      }

      if (code === "reauthentication_not_valid" || code === "reauth_nonce_invalid") {
        return failure(
          authHeaders,
          400,
          "REAUTHENTICATION_INVALID",
          "That security code is invalid or expired.",
        );
      }

      captureOperationalIssue("password_recovery", "warning", "PASSWORD_RESET_FAILED", {
        correlation_id: correlationId,
        reason: code,
      });
      return failure(
        authHeaders,
        400,
        code === "weak_password" ? "WEAK_PASSWORD" : "PASSWORD_UPDATE_FAILED",
        code === "weak_password"
          ? "Choose a stronger password and try again."
          : "We couldn't update your password. Request a new reset link and try again.",
      );
    }

    captureOperationalIssue("password_recovery", "info", "PASSWORD_UPDATED", {
      correlation_id: correlationId,
      session_policy: "global_sign_out",
    });

    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
    if (signOutError && !isInvalidRefreshTokenError(signOutError)) {
      captureOperationalIssue("password_recovery", "warning", "PASSWORD_RESET_FAILED", {
        correlation_id: correlationId,
        reason: "global_sign_out_failed",
      });
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    }

    return clearRecoveryState(
      jsonResponse(
        {
          ok: true,
          message: "Password updated successfully.",
          next: "/login?password_updated=1",
        },
        200,
        authHeaders,
      ),
    );
  } catch (error) {
    captureOperationalIssue("password_recovery", "error", "PASSWORD_RESET_FAILED", {
      correlation_id: correlationId,
      reason: getAuthErrorCode(error),
    });
    return clearRecoveryState(
      failure(
        authHeaders,
        503,
        "PASSWORD_UPDATE_UNAVAILABLE",
        "We couldn't update your password. Request a new reset link and try again.",
      ),
    );
  }
}
