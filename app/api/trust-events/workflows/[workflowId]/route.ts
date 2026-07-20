import { encodeTrustEventCursor, pagination, trustEventCorrelationId, trustEventFailure, trustEventReadContext, trustEventResponse } from "@/src/lib/trust-events/http";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ workflowId: string }> }) {
  const correlationId = trustEventCorrelationId(request);
  try {
    const auth = await trustEventReadContext(request); const { workflowId } = await context.params; const { limit, cursor } = pagination(request);
    if (!workflowId || workflowId.length > 256) throw Object.assign(new Error("workflowId is invalid."), { status: 400, code: "INVALID_WORKFLOW_ID" });
    let query = auth.supabase.from("trust_events").select("event_id,canonical_event,received_at").eq("enterprise_id", auth.enterpriseId).eq("schema_version", "trust-event-v1").eq("workflow_id", workflowId).order("received_at", { ascending: false }).order("event_id", { ascending: false }).limit(limit + 1);
    if (cursor) query = query.or(`received_at.lt.${cursor.receivedAt},and(received_at.eq.${cursor.receivedAt},event_id.lt.${cursor.eventId})`);
    const result = await query; if (result.error) throw result.error; const rows = result.data ?? []; const page = rows.slice(0, limit);
    return trustEventResponse({ ok: true, workflowId, events: page.map((row) => row.canonical_event), pagination: { limit, hasMore: rows.length > limit, nextCursor: rows.length > limit ? encodeTrustEventCursor(page.at(-1)) : null } }, 200, correlationId);
  } catch (error) { return trustEventFailure(error, correlationId); }
}
