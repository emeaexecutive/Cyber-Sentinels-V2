import { NextResponse } from "next/server";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import type { TrustEvent } from "@/lib/ai-trust/types";

async function readPayload(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  }

  const formData = await req.formData();
  return Object.fromEntries(formData.entries()) as Record<string, unknown>;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let query = supabase.from("trust_events").select("*");

  if (!isAdminAllowlisted(user.email)) {
    query = query.contains("metadata", { owner_user_id: user.id });
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<TrustEvent[]>();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Could not retrieve trust events" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, trust_events: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await readPayload(req);
  const eventType = String(payload.event_type ?? "").trim();

  if (!eventType) {
    return NextResponse.json(
      { ok: false, error: "event_type is required" },
      { status: 400 }
    );
  }

  const actor = user.email ?? user.id;
  const metadata = {
    ...(payload.metadata && typeof payload.metadata === "object"
      ? (payload.metadata as Record<string, unknown>)
      : {}),
    actor,
    owner_user_id: user.id,
  };

  const { data: event, error } = await supabase
    .from("trust_events")
    .insert({
      actor_type: String(payload.actor_type ?? "user"),
      actor_id: payload.actor_id || null,
      actor_label: String(payload.actor_label ?? actor),
      event_type: eventType,
      event_source: String(payload.event_source ?? "api.trust_events"),
      risk_level: String(payload.risk_level ?? "low"),
      case_id: payload.case_id || null,
      passport_id: payload.passport_id || null,
      agent_id: payload.agent_id || null,
      evidence_id: payload.evidence_id || null,
      decision_id: payload.decision_id || null,
      metadata,
    })
    .select("*")
    .single<TrustEvent>();

  if (error || !event) {
    console.error("trust event insert failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not create trust event" },
      { status: 500 }
    );
  }

  await createAuditLog(supabase, "trust_event_created", actor, {
    trust_event_id: event.id,
    event_type: event.event_type,
    agent_id: event.agent_id,
    passport_id: event.passport_id,
    actor,
  });
  await createSignal(supabase, "Trust event created", {
    trust_event_id: event.id,
    event_type: event.event_type,
    agent_id: event.agent_id,
    passport_id: event.passport_id,
    actor,
  });

  return NextResponse.json({ ok: true, trust_event: event }, { status: 201 });
}
