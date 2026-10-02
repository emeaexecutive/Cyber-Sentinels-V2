import { createHash } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { classifyWebhookReplay } from "./replay";

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
    const original = await client.from("webhook_event_ledger").select("id,event_type,payload_hash,processing_status").eq("provider", input.provider).eq("event_id", input.eventId).maybeSingle();
    if (original.error) throw original.error;
    if (!original.data) return { reserved: false, duplicateOf: null, status: "duplicate" };
    const replayState = classifyWebhookReplay({
      eventType: original.data.event_type,
      payloadHash: original.data.payload_hash,
      processingStatus: original.data.processing_status,
    }, { eventType: row.event_type, payloadHash: row.payload_hash });
    if (replayState === "payload_mismatch") return { reserved: false, duplicateOf: original.data.id, status: replayState };
    if (replayState === "retry") {
      const retry = await client.from("webhook_event_ledger")
        .update({ processing_status: "processing", error_category: null, processed_at: null })
        .eq("id", original.data.id).eq("processing_status", "failed").select("id").maybeSingle();
      if (retry.error) throw retry.error;
      if (retry.data) return { reserved: true, id: retry.data.id, duplicateOf: original.data.id, retry: true };
      const current = await client.from("webhook_event_ledger").select("processing_status").eq("id", original.data.id).maybeSingle();
      if (current.error) throw current.error;
      return { reserved: false, duplicateOf: original.data.id, status: current.data?.processing_status ?? "processing" };
    }
    return { reserved: false, duplicateOf: original.data.id, status: replayState };
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
