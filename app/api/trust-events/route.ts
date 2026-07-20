import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import type { TrustEvent } from "@/lib/ai-trust/types";
import { encodeTrustEventCursor, pagination, trustEventCorrelationId, trustEventFailure, trustEventReadContext, trustEventResponse } from "@/src/lib/trust-events/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = trustEventCorrelationId(request);
  try {
    const context = await trustEventReadContext(request);
    const { limit, cursor } = pagination(request);
    let query = context.supabase.from("trust_events").select("event_id,canonical_event,received_at").eq("enterprise_id", context.enterpriseId).eq("schema_version", "trust-event-v1").order("received_at", { ascending: false }).order("event_id", { ascending: false }).limit(limit + 1);
    if (cursor) query = query.or(`received_at.lt.${cursor.receivedAt},and(received_at.eq.${cursor.receivedAt},event_id.lt.${cursor.eventId})`);
    const result = await query;
    if (result.error) throw result.error;
    const rows = result.data ?? [];
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    return trustEventResponse({ ok: true, events: page.map((row) => row.canonical_event), pagination: { limit, hasMore, nextCursor: hasMore ? encodeTrustEventCursor(page.at(-1)) : null } }, 200, correlationId);
  } catch (error) { return trustEventFailure(error, correlationId); }
}

async function readLegacyPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  return Object.fromEntries((await request.formData()).entries()) as Record<string, unknown>;
}

// Backward-compatible non-canonical ingestion. Canonical v1 writes are accepted
// only by the provider gateway and its service-role append RPC.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const payload = await readLegacyPayload(request);
  const eventType = String(payload.event_type ?? "").trim();
  if (!eventType) return NextResponse.json({ ok: false, error: "event_type is required" }, { status: 400 });
  const actor = user.email ?? user.id;
  const metadata = { ...(payload.metadata && typeof payload.metadata === "object" ? payload.metadata as Record<string, unknown> : {}), actor, owner_user_id: user.id };
  const { data: event, error } = await supabase.from("trust_events").insert({
    actor_type: String(payload.actor_type ?? "user"), actor_id: payload.actor_id || null,
    actor_label: String(payload.actor_label ?? actor), event_type: eventType,
    event_source: String(payload.event_source ?? "api.trust_events"), risk_level: String(payload.risk_level ?? "low"),
    case_id: payload.case_id || null, passport_id: payload.passport_id || null, agent_id: payload.agent_id || null,
    evidence_id: payload.evidence_id || null, decision_id: payload.decision_id || null, metadata,
  }).select("*").single<TrustEvent>();
  if (error || !event) {
    console.error("trust event insert failed", error);
    return NextResponse.json({ ok: false, error: "Could not create trust event" }, { status: 500 });
  }
  await createAuditLog(supabase, "trust_event_created", actor, { trust_event_id: event.id, event_type: event.event_type, agent_id: event.agent_id, passport_id: event.passport_id, actor });
  await createSignal(supabase, "Trust event created", { trust_event_id: event.id, event_type: event.event_type, agent_id: event.agent_id, passport_id: event.passport_id, actor });
  return NextResponse.json({ ok: true, event_id: event.id, timestamp: event.created_at, status: "created" }, { status: 201 });
}
