import { createHash } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidOrNull = (value?: string | null) => value && uuidPattern.test(value) ? value : null;

export function webhookPayloadHash(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}

export async function reserveWebhookEvent(input: { provider: string; eventId: string; eventType: string; rawBody: string; tenantId?: string | null; workflowId?: string | null; correlationId?: string | null }) {
  const client = createServiceRoleClient();
  const row = {
    provider: input.provider,
    event_id: input.eventId,
    event_type: input.eventType,
    payload_hash: webhookPayloadHash(input.rawBody),
    signature_status: "verified",
    processing_status: "processing",
    tenant_id: uuidOrNull(input.tenantId),
    workflow_id: uuidOrNull(input.workflowId),
    correlation_id: input.correlationId ?? null,
    audit_reference: `webhook:${input.provider}:${input.eventId}`,
  };
  const { data, error } = await client.from("webhook_event_ledger").insert(row).select("id").single();
  if (error?.code === "23505") {
    const original = await client.from("webhook_event_ledger").select("id,processing_status").eq("provider", input.provider).eq("event_id", input.eventId).maybeSingle();
    return { reserved: false, duplicateOf: original.data?.id ?? null, status: original.data?.processing_status ?? "duplicate" };
  }
  if (error) throw error;
  return { reserved: true, id: data.id, duplicateOf: null };
}

export async function completeWebhookEvent(provider: string, eventId: string, status: "processed" | "failed", errorCategory?: string) {
  const { error } = await createServiceRoleClient().from("webhook_event_ledger").update({ processing_status: status, error_category: errorCategory ?? null, processed_at: new Date().toISOString() }).eq("provider", provider).eq("event_id", eventId);
  if (error) throw error;
}

export async function retainRejectedWebhookEvent(provider: string, rawBody: string, errorCategory: string) {
  const digest = webhookPayloadHash(rawBody);
  const { error } = await createServiceRoleClient().from("webhook_event_ledger").insert({ provider, event_id: `rejected:${digest}`, event_type: "unverified", payload_hash: digest, signature_status: "rejected", processing_status: "failed", error_category: errorCategory, processed_at: new Date().toISOString(), audit_reference: `webhook:${provider}:rejected:${digest.slice(0, 16)}` });
  if (error?.code !== "23505" && error) throw error;
}
