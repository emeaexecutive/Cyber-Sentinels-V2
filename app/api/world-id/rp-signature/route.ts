import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRequestRateLimit } from "@/lib/security";
import { createWorldIdRpSignature } from "@/lib/providers/world-id-verifier";

export async function POST(request: Request) {
  const limited = checkRequestRateLimit({ route: "world-id-rp-signature", req: request, limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...createWorldIdRpSignature() }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "WORLD_ID_CONFIGURATION_INCOMPLETE" }, { status: 503 });
  }
}
