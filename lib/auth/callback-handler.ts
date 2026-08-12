import { NextResponse } from "next/server";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { resolveSafeInternalRedirect } from "./safe-redirect.ts";
import {
  normalizePasswordResetCorrelationId,
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_PATH,
  passwordRecoveryCookieOptions,
} from "./password-recovery.ts";

type AuthCallbackClient = {
  auth: {
    exchangeCodeForSession(code: string): Promise<{
      data?: unknown;
      error: unknown;
    }>;
    onAuthStateChange(
      callback: (event: AuthChangeEvent, session: Session | null) => void | Promise<void>,
    ): { data: { subscription: { unsubscribe(): void } } };
  };
};

type AuthCallbackDependencies = {
  createClient(headers: Headers): Promise<AuthCallbackClient>;
  captureOperationalIssue(
    surface: string,
    severity: "info" | "warning" | "error",
    message: string,
    context: Record<string, string | number | boolean | null | undefined>,
  ): void;
};

function authRedirect(url: URL, authHeaders: Headers) {
  const response = NextResponse.redirect(url, { headers: authHeaders });
  response.headers.set(
    "Cache-Control",
    authHeaders.get("Cache-Control") ??
      "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", authHeaders.get("Expires") ?? "0");
  response.headers.set("Pragma", authHeaders.get("Pragma") ?? "no-cache");
  return response;
}

export async function handleAuthCallback(
  req: Request,
  dependencies: AuthCallbackDependencies,
) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = resolveSafeInternalRedirect(url.searchParams.get("next"), url.origin);
  const recoveryIntent = next === PASSWORD_RECOVERY_PATH;
  const correlationId =
    normalizePasswordResetCorrelationId(url.searchParams.get("request_id")) ??
    crypto.randomUUID();
  const authHeaders = new Headers();

  if (!code) {
    return authRedirect(
      new URL(
        recoveryIntent
          ? "/login?error=recovery_link_invalid"
          : `/login?next=${encodeURIComponent(next)}&error=missing_verification_code`,
        url.origin,
      ),
      authHeaders,
    );
  }

  try {
    const supabase = await dependencies.createClient(authHeaders);
    let passwordRecovery = false;
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") passwordRecovery = true;
    });
    let exchangeResult: { error: unknown };
    try {
      exchangeResult = await supabase.auth.exchangeCodeForSession(code);
    } finally {
      authListener.subscription.unsubscribe();
    }
    const { error } = exchangeResult;

    if (!error) {
      if (passwordRecovery) {
        const response = authRedirect(new URL(PASSWORD_RECOVERY_PATH, url.origin), authHeaders);
        response.cookies.set(
          PASSWORD_RECOVERY_COOKIE,
          correlationId,
          passwordRecoveryCookieOptions(),
        );
        dependencies.captureOperationalIssue(
          "password_recovery",
          "info",
          "PASSWORD_RECOVERY_CALLBACK",
          { correlation_id: correlationId, redirect_type: "recovery" },
        );
        return response;
      }

      return authRedirect(new URL(next, url.origin), authHeaders);
    }

    dependencies.captureOperationalIssue(
      "auth_callback",
      "warning",
      "Supabase auth callback exchange failed.",
      { next_path: next, has_code: true },
    );
  } catch (error) {
    dependencies.captureOperationalIssue(
      "auth_callback",
      "error",
      "Supabase auth callback unavailable.",
      {
        next_path: next,
        error_name: error instanceof Error ? error.name : "unknown",
      },
    );
  }

  return authRedirect(
    new URL(
      recoveryIntent
        ? "/login?error=recovery_link_invalid"
        : `/login?next=${encodeURIComponent(next)}&error=verification_failed`,
      url.origin,
    ),
    authHeaders,
  );
}
