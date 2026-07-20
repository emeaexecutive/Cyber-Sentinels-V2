import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { CanonicalTrustEvent, JsonValue, ProviderEnvelope, TrustEventDisposition } from "./types.ts";
import type { EnvelopeReservation, TrustEventGatewayRepository } from "./gateway.ts";

function databaseError(operation: string, error: unknown): never {
  console.error(`${operation} failed.`, error);
  throw Object.assign(new Error(`${operation} failed safely.`), { code: "TRUST_EVENT_PERSISTENCE_FAILED", status: 500 });
}

export function supabaseTrustEventRepository(): TrustEventGatewayRepository {
  const database = createServiceRoleClient();
  return {
    async resolveEnterprise(providerKey: string, envelope: ProviderEnvelope, authenticatedEnterpriseId?: string) {
      if (authenticatedEnterpriseId) return authenticatedEnterpriseId;
      if (providerKey !== "hopae_connect" || !envelope.transactionId) return null;
      const result = await database.from("hopae_verifications").select("workspace_id").eq("verification_id", envelope.transactionId).maybeSingle();
      if (result.error) databaseError("Trust Event enterprise routing", result.error);
      return result.data?.workspace_id ? String(result.data.workspace_id) : null;
    },
    async isProviderEnabled(providerKey: string) {
      if (providerKey !== "hopae_connect") return true;
      const result = await database.from("provider_registry").select("enabled").eq("provider_id", providerKey).maybeSingle();
      if (result.error) databaseError("Trust Event provider enablement", result.error);
      return result.data?.enabled === true;
    },
    async reserveEnvelope(input) {
      const result = await database.rpc("reserve_trust_event_envelope_v1", {
        p_enterprise_id: input.enterpriseId, p_provider_key: input.providerKey, p_idempotency_key: input.idempotencyKey,
        p_request_hash: input.requestHash, p_provider_event_id: input.envelope.providerEventId, p_transaction_id: input.envelope.transactionId,
        p_delivery_id: input.envelope.deliveryId, p_nonce: input.envelope.nonce, p_occurred_at: input.envelope.occurredAt,
        p_received_at: input.receivedAt, p_provider_sequence: input.envelope.providerSequence, p_correlation_id: input.correlationId,
      });
      if (result.error || !result.data) databaseError("Trust Event envelope reservation", result.error);
      const value = result.data as Record<string, unknown>;
      return { status: String(value.status), envelopeId: String(value.envelopeId), eventIds: Array.isArray(value.eventIds) ? value.eventIds.map(String) : [], disposition: String(value.disposition ?? "ACCEPTED") } as EnvelopeReservation;
    },
    async recordRejectedEnvelope(input) {
      const result = await database.from("trust_event_envelopes").insert({ enterprise_id: input.enterpriseId ?? null, provider_key: input.providerKey, request_hash: input.requestHash, idempotency_key: `${input.correlationId}:${input.requestHash}`, received_at: input.receivedAt, processed_at: input.receivedAt, processing_disposition: input.disposition, reason_codes: input.reasonCodes, correlation_id: input.correlationId, protocol: input.protocol }).select("id").single();
      if (result.error || !result.data) { console.error("Rejected Trust Event envelope persistence failed.", { code: result.error?.code }); return; }
      const audit = await database.from("trust_event_audit").insert({ enterprise_id: input.enterpriseId ?? null, envelope_id: result.data.id, action: "ENVELOPE_REJECTED", disposition: input.disposition, correlation_id: input.correlationId, metadata: { providerKey: input.providerKey, protocol: input.protocol, reasonCodes: input.reasonCodes } });
      if (audit.error) console.error("Rejected Trust Event envelope audit persistence failed.", { code: audit.error.code });
    },
    async getChainHead(enterpriseId) {
      const result = await database.from("trust_event_chain_heads").select("last_sequence,last_event_hash").eq("enterprise_id", enterpriseId).eq("partition_key", "default").maybeSingle();
      if (result.error) databaseError("Trust Event chain-head retrieval", result.error);
      return { sequence: Number(result.data?.last_sequence ?? 0), eventHash: result.data?.last_event_hash ? String(result.data.last_event_hash) : null };
    },
    async persistEvidence(input: { enterpriseId: string; envelopeId: string; providerKey: string; classification: string; normalizedFacts: Record<string, JsonValue>; occurredAt: string; retentionExpiresAt: string | null }) {
      const result = await database.from("evidence_objects").insert({ enterprise_id: input.enterpriseId, envelope_id: input.envelopeId, provider_key: input.providerKey, evidence_classification: input.classification, storage_boundary: "NORMALIZED_LEDGER", normalized_facts: input.normalizedFacts, occurred_at: input.occurredAt, retention_expires_at: input.retentionExpiresAt }).select("id").single();
      if (result.error || !result.data) databaseError("Normalized evidence persistence", result.error);
      return `evidence:${result.data.id}`;
    },
    async appendEvent(input: { event: CanonicalTrustEvent; envelopeId: string; correlationId: string }) {
      const result = await database.rpc("append_trust_event_v1", { p_event: input.event, p_envelope_id: input.envelopeId, p_correlation_id: input.correlationId });
      if (result.error) databaseError("Canonical Trust Event append", result.error);
      return result.data === "APPENDED" ? "APPENDED" : "CHAIN_CONFLICT";
    },
    async completeEnvelope(input: { envelopeId: string; disposition: TrustEventDisposition; eventIds: string[]; reasonCodes: string[] }) {
      const result = await database.from("trust_event_envelopes").update({ processing_disposition: input.disposition, result_event_ids: input.eventIds, reason_codes: input.reasonCodes, processed_at: new Date().toISOString() }).eq("id", input.envelopeId);
      if (result.error) databaseError("Trust Event envelope completion", result.error);
    },
  };
}
