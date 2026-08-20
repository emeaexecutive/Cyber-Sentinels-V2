import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hashCanonical } from "@/src/lib/trust-core/hash";
import {
  PUBLIC_WEBHOOK_EVENT_TYPES,
  publicWebhookBackoffSeconds,
  signPublicWebhookPayload,
} from "./webhooks";

export async function emitPublicApiWebhookEvent(
  tenantId: string,
  eventType: (typeof PUBLIC_WEBHOOK_EVENT_TYPES)[number],
  subjectReference: string,
) {
  const timestamp = new Date().toISOString();
  const payload = {
    event_id: crypto.randomUUID(),
    timestamp,
    event_type: eventType,
    subject_reference: subjectReference,
  };
  const db = createServiceRoleClient();
  const url = process.env.PUBLIC_API_WEBHOOK_URL?.trim();
  const secret = process.env.PUBLIC_API_WEBHOOK_SECRET_CURRENT?.trim() ?? process.env.PUBLIC_API_WEBHOOK_SECRET?.trim();
  const configured = Boolean(url && secret);
  const inserted = await db.from("public_api_webhook_events").insert({
    event_id: payload.event_id,
    tenant_id: tenantId,
    event_type: eventType,
    subject_reference: subjectReference,
    payload,
    payload_digest: hashCanonical(payload),
    delivery_state: configured ? "QUEUED" : "NOT_CONFIGURED",
  });
  if (inserted.error && inserted.error.code !== "23505") return;
  if (!configured) return;

  try {
    const response = await fetch(url!, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cyber-sentinels-signature": signPublicWebhookPayload(payload, secret!),
        "x-cyber-sentinels-event-id": payload.event_id,
        "x-cyber-sentinels-timestamp": payload.timestamp,
        "idempotency-key": payload.event_id,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    await db.from("public_api_webhook_events").update({
      delivery_state: response.ok ? "DELIVERED" : "QUEUED",
      attempt_count: 1,
      last_attempted_at: new Date().toISOString(),
      next_attempt_at: response.ok ? null : new Date(Date.now() + publicWebhookBackoffSeconds(1) * 1_000).toISOString(),
    }).eq("event_id", payload.event_id);
  } catch {
    await db.from("public_api_webhook_events").update({
      delivery_state: "QUEUED",
      attempt_count: 1,
      last_attempted_at: new Date().toISOString(),
      next_attempt_at: new Date(Date.now() + publicWebhookBackoffSeconds(1) * 1_000).toISOString(),
    }).eq("event_id", payload.event_id);
  }
}
