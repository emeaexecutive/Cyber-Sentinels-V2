import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeRedirect(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/command-center";
  }

  return path;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = getSafeRedirect(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login", url.origin));
}
