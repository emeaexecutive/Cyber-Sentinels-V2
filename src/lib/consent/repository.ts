import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CanonicalTrustEvent } from "@/src/lib/trust-events/types";
import type { ConsentReceipt } from "./types.ts";
import { verifyConsentReceipt } from "./receipt.ts";
import { normalizeConsentPersistResult } from "./persistence-result.ts";

type SupabaseError = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  name?: unknown;
};

function safeDiagnostic(value: unknown) {
  const text = String(value ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "[uuid]")
    .replace(/\b[A-Za-z0-9_-]{80,}\b/g, "[redacted]")
    .slice(0, 500);
  return text || undefined;
}

function fail(
  operation: string,
  targetType: "table" | "rpc",
  target: string,
  error: unknown,
  correlationId?: string,
): never {
  const candidate = error as SupabaseError;
  console.error("Consent persistence operation failed.", {
    correlationId: correlationId ?? "unavailable",
    operation,
    internalCode: "CONSENT_PERSISTENCE_FAILED",
    status: 500,
    errorName: safeDiagnostic(candidate?.name) ?? "SupabaseError",
    environment: safeDiagnostic(process.env.VERCEL_ENV ?? process.env.NODE_ENV) ?? "unknown",
    targetType,
    target,
    supabaseCode: safeDiagnostic(candidate?.code) ?? "UNKNOWN",
    supabaseMessage: safeDiagnostic(candidate?.message) ?? "Unavailable",
    supabaseDetails: safeDiagnostic(candidate?.details) ?? "Unavailable",
    supabaseHint: safeDiagnostic(candidate?.hint) ?? "Unavailable",
  });
  throw Object.assign(new Error(`${operation} failed safely.`), {
    status: 500,
    code: "CONSENT_PERSISTENCE_FAILED",
  });
}

export function consentRepository() {
  const database = createServiceRoleClient();
  return {
    async chainHead(enterpriseId: string, correlationId?: string) {
      const result = await database.from("trust_event_chain_heads").select("last_sequence,last_event_hash").eq("enterprise_id", enterpriseId).eq("partition_key", "default").maybeSingle();
      if (result.error) fail("consent.chain_head.read", "table", "trust_event_chain_heads", result.error, correlationId);
      return { sequence: Number(result.data?.last_sequence ?? 0), eventHash: result.data?.last_event_hash ? String(result.data.last_event_hash) : null };
    },
    async persist(input: { receipt: ConsentReceipt; subjectKey: string; idempotencyKey: string; requestHash: string; trustEvents: CanonicalTrustEvent[]; correlationId: string }) {
      const result = await database.rpc("persist_consent_change_v1", { p_receipt: input.receipt, p_subject_key: input.subjectKey, p_idempotency_key: input.idempotencyKey, p_request_hash: input.requestHash, p_trust_events: input.trustEvents, p_correlation_id: input.correlationId });
      if (result.error) {
        if (/chain conflict/i.test(result.error.message)) return { status: "CHAIN_CONFLICT" as const };
        fail("consent.receipt.persist", "rpc", "persist_consent_change_v1", result.error, input.correlationId);
      }
      try {
        return normalizeConsentPersistResult(result.data);
      } catch (error) {
        fail("consent.receipt.normalize", "rpc", "persist_consent_change_v1", error, input.correlationId);
      }
    },
    async history(enterpriseId: string, subjectKeys: string[], limit: number, cursor?: { occurredAt: string; receiptId: string }) {
      let query = database.from("consent_receipts").select("receipt_id,policy_version,region_profile,categories,consent_action,occurred_at,expires_at,receipt_hash,hash_algorithm,canonicalization").eq("enterprise_id", enterpriseId).in("subject_key", subjectKeys).order("occurred_at", { ascending: false }).order("receipt_id", { ascending: false }).limit(limit + 1);
      if (cursor) query = query.or(`occurred_at.lt.${cursor.occurredAt},and(occurred_at.eq.${cursor.occurredAt},receipt_id.lt.${cursor.receiptId})`);
      const result = await query; if (result.error) fail("consent.history.read", "table", "consent_receipts", result.error); return result.data ?? [];
    },
    async receipt(enterpriseId: string, subjectKeys: string[], receiptId: string) {
      const result = await database.from("consent_receipts").select("receipt_id,enterprise_id,policy_version,banner_version,preference_schema_version,region_profile,language,categories,purposes,providers,consent_action,occurred_at,received_at,expires_at,source,coarse_country,receipt_hash,hash_algorithm,canonicalization,canonical_receipt").eq("enterprise_id", enterpriseId).in("subject_key", subjectKeys).eq("receipt_id", receiptId).maybeSingle();
      if (result.error) fail("consent.receipt.read", "table", "consent_receipts", result.error);
      if (!result.data) return null;
      const canonical = result.data.canonical_receipt as unknown as ConsentReceipt;
      const safe = { ...result.data } as Omit<typeof result.data, "canonical_receipt"> & { canonical_receipt?: unknown };
      delete safe.canonical_receipt;
      return { ...safe, integrity_valid: verifyConsentReceipt(canonical) };
    },
    async catalogue(enterpriseId?: string) {
      const scope = enterpriseId ?? "00000000-0000-0000-0000-000000000000";
      const [cookies, trackers] = await Promise.all([
        database.from("consent_cookies").select("name,domain,provider_key,category_key,purpose,duration,storage_type,first_or_third_party,active,registration_source,last_reviewed,notes").or(`enterprise_id.is.null,enterprise_id.eq.${scope}`).eq("active", true),
        database.from("consent_tracker_catalogue").select("tracker_key,name,domain,provider_key,category_key,purpose,duration,storage_type,first_or_third_party,active,registration_source,classification_status,last_reviewed,notes").or(`enterprise_id.is.null,enterprise_id.eq.${scope}`).eq("active", true),
      ]);
      if (cookies.error || trackers.error) fail("consent.catalogue.read", "table", cookies.error ? "consent_cookies" : "consent_tracker_catalogue", cookies.error ?? trackers.error);
      return { cookies: cookies.data ?? [], trackers: trackers.data ?? [] };
    },
    async adminSummary(enterpriseId: string) {
      const [receipts, trackers, policies] = await Promise.all([
        database.from("consent_receipts").select("consent_action,region_profile,language,categories,policy_version").eq("enterprise_id", enterpriseId).limit(10000),
        database.from("consent_tracker_catalogue").select("classification_status,last_reviewed").eq("enterprise_id", enterpriseId),
        database.from("consent_policy_versions").select("version,status,effective_at,requires_reconsent,locale").or(`enterprise_id.is.null,enterprise_id.eq.${enterpriseId}`).order("effective_at", { ascending: false }),
      ]);
      if (receipts.error || trackers.error || policies.error) fail("consent.admin_summary.read", "table", receipts.error ? "consent_receipts" : trackers.error ? "consent_tracker_catalogue" : "consent_policy_versions", receipts.error ?? trackers.error ?? policies.error);
      return { receipts: receipts.data ?? [], trackers: trackers.data ?? [], policies: policies.data ?? [] };
    },
    async createPolicy(input: { policy: Record<string, unknown>; trustEvents: CanonicalTrustEvent[]; correlationId: string; actorReference: string }) { const result = await database.rpc("create_consent_policy_v1", { p_policy: input.policy, p_trust_events: input.trustEvents, p_correlation_id: input.correlationId, p_actor_reference: input.actorReference }); if (result.error) fail("consent.policy.create", "rpc", "create_consent_policy_v1", result.error, input.correlationId); return result.data; },
  };
}
