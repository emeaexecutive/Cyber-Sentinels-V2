import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hashCanonical } from "@/src/lib/trust-core/hash";
import { captureOperationalIssue } from "@/lib/operational-monitoring";
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
  if (inserted.error) {
    if (inserted.error.code !== "23505") {
      captureOperationalIssue("public_api_webhook", "error", "WEBHOOK_EVENT_PERSISTENCE_FAILED", {
        event_id: payload.event_id,
        error_code: /^[A-Z0-9]{5}$/.test(inserted.error.code ?? "") ? inserted.error.code : "UNKNOWN",
      });
    }
    // A duplicate event must not be dispatched again by this first-attempt path.
    return;
  }
  if (!configured) return;

  let delivered = false;
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
      // A redirect is not acknowledgement by the configured destination and
      // must not forward signed event data or headers to another endpoint.
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    delivered = response.ok;
    if (!response.ok) captureOperationalIssue("public_api_webhook", "warning", "WEBHOOK_DELIVERY_REJECTED", {
      event_id: payload.event_id, http_status: response.status,
    });
  } catch {
    captureOperationalIssue("public_api_webhook", "warning", "WEBHOOK_DELIVERY_UNCONFIRMED", { event_id: payload.event_id });
  }
  // Transport acknowledgement is not independent proof of a destination effect.
  // Keep persistence failures separate so they cannot trigger a second dispatch.
  try {
    const updated = await db.from("public_api_webhook_events").update({
      delivery_state: delivered ? "DELIVERED" : "QUEUED",
      attempt_count: 1,
      last_attempted_at: new Date().toISOString(),
      next_attempt_at: delivered ? null : new Date(Date.now() + publicWebhookBackoffSeconds(1) * 1_000).toISOString(),
    }).eq("event_id", payload.event_id).eq("tenant_id", tenantId);
    if (updated.error) captureOperationalIssue("public_api_webhook", "error", "WEBHOOK_DELIVERY_STATE_FAILED", {
      event_id: payload.event_id,
      error_code: /^[A-Z0-9]{5}$/.test(updated.error.code ?? "") ? updated.error.code : "UNKNOWN",
      transport_acknowledged: delivered,
    });
  } catch {
    captureOperationalIssue("public_api_webhook", "error", "WEBHOOK_DELIVERY_STATE_FAILED", {
      event_id: payload.event_id, error_code: "UNKNOWN", transport_acknowledged: delivered,
    });
  }
}
