import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeRedirect(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/passport";
  }

  return path;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = getSafeRedirect(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/login?next=${encodeURIComponent(next)}&error=missing_verification_code`,
        url.origin
      )
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }

    console.warn("Supabase auth callback exchange failed.", error);
  } catch (error) {
    console.error("Supabase auth callback unavailable.", error);
  }

  return NextResponse.redirect(
    new URL(
      `/login?next=${encodeURIComponent(next)}&error=verification_failed`,
      url.origin
    )
  );
}
