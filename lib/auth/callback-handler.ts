import { NextResponse } from "next/server";
import { resolveSafeInternalRedirect } from "./safe-redirect.ts";

type AuthCallbackClient = {
  auth: {
    exchangeCodeForSession(code: string): Promise<{ error: unknown }>;
  };
};

type AuthCallbackDependencies = {
  createClient(headers: Headers): Promise<AuthCallbackClient>;
  captureOperationalIssue(
    surface: string,
    severity: "warning" | "error",
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
  const authHeaders = new Headers();

  if (!code) {
    return authRedirect(
      new URL(
        `/login?next=${encodeURIComponent(next)}&error=missing_verification_code`,
        url.origin,
      ),
      authHeaders,
    );
  }

  try {
    const supabase = await dependencies.createClient(authHeaders);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) return authRedirect(new URL(next, url.origin), authHeaders);

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
      `/login?next=${encodeURIComponent(next)}&error=verification_failed`,
      url.origin,
    ),
    authHeaders,
  );
}
