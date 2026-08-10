import { NextResponse } from "next/server";
import { captureOperationalIssue } from "@/lib/operational-monitoring";
import { createClient } from "@/lib/supabase/server";

function getSafeRedirect(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/operational-entities";
  }

  return path;
}

function authRedirect(url: URL, authHeaders: Headers) {
  const response = NextResponse.redirect(url);
  response.headers.set(
    "Cache-Control",
    authHeaders.get("Cache-Control") ??
      "private, no-cache, no-store, must-revalidate, max-age=0"
  );
  response.headers.set("Expires", authHeaders.get("Expires") ?? "0");
  response.headers.set("Pragma", authHeaders.get("Pragma") ?? "no-cache");
  return response;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = getSafeRedirect(url.searchParams.get("next"));
  const authHeaders = new Headers();

  if (!code) {
    return authRedirect(
      new URL(
        `/login?next=${encodeURIComponent(next)}&error=missing_verification_code`,
        url.origin
      ),
      authHeaders
    );
  }

  try {
    const supabase = await createClient(authHeaders);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return authRedirect(new URL(next, url.origin), authHeaders);
    }

    captureOperationalIssue("auth_callback", "warning", "Supabase auth callback exchange failed.", {
      next_path: next,
      has_code: Boolean(code),
    });
  } catch (error) {
    captureOperationalIssue("auth_callback", "error", "Supabase auth callback unavailable.", {
      next_path: next,
      error_name: error instanceof Error ? error.name : "unknown",
    });
  }

  return authRedirect(
    new URL(
      `/login?next=${encodeURIComponent(next)}&error=verification_failed`,
      url.origin
    ),
    authHeaders
  );
}
