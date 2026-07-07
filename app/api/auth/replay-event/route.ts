import { NextResponse } from "next/server";
import { recordAuthReplayEvent, type AuthReplayEventType } from "@/lib/auth/auth-replay-events";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const allowedEvents: AuthReplayEventType[] = [
  "login",
  "logout",
  "reset_password",
  "mfa_challenge",
  "geo_mismatch",
  "step_up_auth",
  "blocked_session",
  "suspicious_login",
  "session_restoration",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const eventType = String(body.event_type ?? "") as AuthReplayEventType;

  if (!allowedEvents.includes(eventType)) {
    return NextResponse.json({ ok: false, error: "invalid_auth_event" }, { status: 400 });
  }

  await recordAuthReplayEvent(supabase, {
    user,
    eventType,
    request,
    decision: ["allow", "step_up", "review", "block"].includes(String(body.decision))
      ? (String(body.decision) as "allow" | "step_up" | "review" | "block")
      : undefined,
    trustPosture: typeof body.trust_posture === "string" ? body.trust_posture : undefined,
    metadata: {
      client_context: typeof body.context === "object" && body.context !== null ? body.context : {},
    },
  });

  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
