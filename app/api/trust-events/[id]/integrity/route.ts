import { verifyTrustEventHash } from "@/src/lib/trust-events/hash";
import { trustEventCorrelationId, trustEventFailure, trustEventReadContext, trustEventResponse } from "@/src/lib/trust-events/http";
import type { CanonicalTrustEvent } from "@/src/lib/trust-events/types";

export const dynamic = "force-dynamic";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = trustEventCorrelationId(request);
  try {
    const auth = await trustEventReadContext(request);
    const { id } = await context.params;
    if (!uuidPattern.test(id)) return trustEventResponse({ ok: false, code: "INVALID_EVENT_ID", error: "A valid event ID is required." }, 400, correlationId);
    const current = await auth.supabase.from("trust_events").select("canonical_event,sequence,previous_hash,event_hash").eq("enterprise_id", auth.enterpriseId).eq("event_id", id).eq("schema_version", "trust-event-v1").maybeSingle();
    if (current.error) throw current.error;
    if (!current.data) return trustEventResponse({ ok: false, code: "TRUST_EVENT_NOT_FOUND", error: "Trust Event was not found." }, 404, correlationId);
    const event = current.data.canonical_event as CanonicalTrustEvent;
    const storageFieldsValid = event.eventId === id && event.enterpriseId === auth.enterpriseId && event.sequence === current.data.sequence && event.previousHash === current.data.previous_hash && event.eventHash === current.data.event_hash;
    let previousLinkValid = event.sequence === 1 && event.previousHash === null;
    if (event.sequence > 1) {
      const previous = await auth.supabase.from("trust_events").select("event_hash").eq("enterprise_id", auth.enterpriseId).eq("sequence", event.sequence - 1).eq("schema_version", "trust-event-v1").maybeSingle();
      if (previous.error) throw previous.error;
      previousLinkValid = previous.data?.event_hash === event.previousHash;
    }
    const hashValid = verifyTrustEventHash(event);
    return trustEventResponse({ ok: true, integrity: { valid: hashValid && previousLinkValid && storageFieldsValid, hashValid, previousLinkValid, storageFieldsValid, eventHash: event.eventHash, previousHash: event.previousHash, sequence: event.sequence, canonicalization: event.canonicalization, hashAlgorithm: event.hashAlgorithm } }, 200, correlationId);
  } catch (error) { return trustEventFailure(error, correlationId); }
}
