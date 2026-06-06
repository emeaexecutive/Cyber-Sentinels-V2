import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sessionId = stringValue(body.session_id);

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "session_id_required" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });
  }

  const { data: signals, error } = await supabase
    .from("interview_risk_signals")
    .select("signal_type,status,risk_level,metadata")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("interview analyze signal fetch failed", error);
    return NextResponse.json({ ok: false, error: "interview_analysis_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    session_id: sessionId,
    signals: signals ?? [],
    summary: "Placeholder analysis only. Biometric providers are not connected.",
  });
}
