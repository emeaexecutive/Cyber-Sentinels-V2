import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackTrustEvent, type TrustTrackingEventType } from "@/lib/tracking/trust-event-tracker";

export const dynamic = "force-dynamic";

const eventTypes: TrustTrackingEventType[] = [
  "actor_detected",
  "session_started",
  "provider_signal_received",
  "trust_score_changed",
  "step_up_required",
  "workflow_allowed",
  "workflow_paused",
  "workflow_escalated",
  "actor_blocked",
  "governance_review_created",
  "reviewer_decision_recorded",
  "receipt_generated",
  "replay_event_written",
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("signals")
    .select("id,event,metadata,created_at")
    .in("event", eventTypes)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ ok: !error, events: error ? [] : data ?? [] }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "invalid_event_input" }, { status: 400 });
  const eventType = eventTypes.includes(body.event_type as TrustTrackingEventType)
    ? (body.event_type as TrustTrackingEventType)
    : "actor_detected";
  const event = await trackTrustEvent(supabase, {
    event_type: eventType,
    actor_id: String(body.actor_id ?? user.id).slice(0, 120),
    actor_type: ["human", "agent", "NHI", "workflow"].includes(String(body.actor_type)) ? (String(body.actor_type) as any) : "human",
    workflow_id: String(body.workflow_id ?? crypto.randomUUID()).slice(0, 120),
    decision: ["allow", "step_up", "review", "escalate", "block", "insufficient evidence"].includes(String(body.decision)) ? (String(body.decision) as any) : "review",
    source: "Runtime Intelligence",
    evidence_refs: Array.isArray(body.evidence_refs) ? body.evidence_refs.map(String).slice(0, 20) : [],
  }, user.email ?? user.id);

  return NextResponse.json({ ok: true, event }, { status: 201 });
}
