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

  const [{ data: events, error: eventsError }, { data: signals, error }] = await Promise.all([
    supabase
      .from("interview_risk_events")
      .select("signal_type,signal_source,confidence_score,risk_reason,escalation_required,created_at")
      .eq("interview_session_id", sessionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("interview_risk_signals")
      .select("signal_type,status,risk_level,metadata")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
  ]);

  if (eventsError && error) {
    console.error("interview analyze signal fetch failed", error);
    return NextResponse.json({ ok: false, error: "interview_analysis_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    session_id: sessionId,
    risk_events: events ?? [],
    signals: signals ?? [],
    summary:
      "Placeholder analysis only. Biometric or detection providers are not connected, and no automated rejection is made.",
  });
}
