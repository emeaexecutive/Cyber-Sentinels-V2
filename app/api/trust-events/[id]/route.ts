import { trustEventCorrelationId, trustEventFailure, trustEventReadContext, trustEventResponse } from "@/src/lib/trust-events/http";

export const dynamic = "force-dynamic";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = trustEventCorrelationId(request);
  try {
    const auth = await trustEventReadContext(request);
    const { id } = await context.params;
    if (!uuidPattern.test(id)) return trustEventResponse({ ok: false, code: "INVALID_EVENT_ID", error: "A valid event ID is required." }, 400, correlationId);
    const result = await auth.supabase.from("trust_events").select("canonical_event").eq("enterprise_id", auth.enterpriseId).eq("event_id", id).eq("schema_version", "trust-event-v1").maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return trustEventResponse({ ok: false, code: "TRUST_EVENT_NOT_FOUND", error: "Trust Event was not found." }, 404, correlationId);
    return trustEventResponse({ ok: true, event: result.data.canonical_event }, 200, correlationId);
  } catch (error) { return trustEventFailure(error, correlationId); }
}
