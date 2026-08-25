import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hashCanonical } from "@/src/lib/trust-core/hash";
import {
  transitionSentinelLifecycle,
  type SentinelAgent,
  type SentinelLifecycleRecord,
  type SentinelLifecycleState,
  type SentinelRole,
} from "./sentinel-agents";

type Row = Record<string, unknown>;
type SentinelLifecycleContext = { enterpriseId: string; user: User; role: string };

export class SentinelLifecycleServerError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = "SentinelLifecycleServerError";
  }
}

function fail(message: string, error: unknown): never {
  const candidate = error as { code?: string } | null;
  throw new SentinelLifecycleServerError(message, 503, candidate?.code ?? "SENTINEL_LIFECYCLE_PERSISTENCE_FAILED");
}

function lifecycleState(value: unknown): SentinelLifecycleState {
  return String(value) === "active" || String(value) === "restored" ? "ACTIVE" : "PAUSED";
}

export async function loadSentinelLifecycleRecords(input: {
  supabase: SupabaseClient;
  enterpriseId: string;
  sentinels: SentinelAgent[];
}): Promise<Partial<Record<SentinelRole, SentinelLifecycleRecord>>> {
  if (!input.sentinels.length) return {};
  const result = await input.supabase
    .from("operational_entities")
    .select("entity_id,enterprise_id,identity_profile_reference,lifecycle_state,created_at,updated_at")
    .eq("enterprise_id", input.enterpriseId)
    .in("entity_id", input.sentinels.map((item) => item.sentinelId));
  if (result.error) fail("Sentinel Operational Entity lifecycle is unavailable.", result.error);
  const byId = new Map(input.sentinels.map((item) => [item.sentinelId, item]));
  const records: Partial<Record<SentinelRole, SentinelLifecycleRecord>> = {};
  for (const candidate of result.data ?? []) {
    const row = candidate as Row;
    const sentinel = byId.get(String(row.entity_id));
    if (!sentinel || String(row.enterprise_id) !== input.enterpriseId || String(row.identity_profile_reference) !== sentinel.identity.identityReference) {
      throw new SentinelLifecycleServerError("Stored Sentinel identity scope is inconsistent.", 409, "SENTINEL_IDENTITY_SCOPE_MISMATCH");
    }
    records[sentinel.role] = {
      state: lifecycleState(row.lifecycle_state),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
  return records;
}

export async function persistSentinelLifecycle(input: {
  context: SentinelLifecycleContext;
  sentinel: SentinelAgent;
  requestedState: SentinelLifecycleState;
  occurredAt: string;
  correlationId: string;
}) {
  const transition = transitionSentinelLifecycle({
    enterpriseId: input.context.enterpriseId,
    sentinel: input.sentinel,
    requestedState: input.requestedState,
    actorRole: input.context.role,
    occurredAt: input.occurredAt,
  });
  const db = createServiceRoleClient();
  const existing = await db
    .from("operational_entities")
    .select("entity_id,enterprise_id,identity_profile_reference,created_at")
    .eq("enterprise_id", input.context.enterpriseId)
    .eq("entity_id", input.sentinel.sentinelId)
    .maybeSingle();
  if (existing.error) fail("Sentinel Operational Entity resolution failed.", existing.error);
  if (existing.data && String(existing.data.identity_profile_reference) !== input.sentinel.identity.identityReference) {
    throw new SentinelLifecycleServerError("Sentinel identity conflicts with an existing Operational Entity.", 409, "SENTINEL_IDENTITY_CONFLICT");
  }

  const common = {
    lifecycle_state: transition.operationalEntityLifecycleState,
    current_trust_state: input.requestedState === "PAUSED" ? "suspended" : "degraded",
    current_evidence_state: "derived_from_canonical_evidence",
    suspended_at: input.requestedState === "PAUSED" ? input.occurredAt : null,
    updated_at: input.occurredAt,
  };
  const canonicalDigest = hashCanonical({
    sentinelId: input.sentinel.sentinelId,
    enterpriseId: input.context.enterpriseId,
    identityReference: input.sentinel.identity.identityReference,
    lifecycleState: transition.operationalEntityLifecycleState,
    authorityReference: input.sentinel.identity.authorityReference,
    occurredAt: input.occurredAt,
  });
  const persistence = existing.data
    ? await db.from("operational_entities").update({ ...common, canonical_digest: canonicalDigest }).eq("enterprise_id", input.context.enterpriseId).eq("entity_id", input.sentinel.sentinelId)
    : await db.from("operational_entities").insert({
        entity_id: input.sentinel.sentinelId,
        enterprise_id: input.context.enterpriseId,
        entity_type: "service",
        display_reference: input.sentinel.name,
        canonical_trust_object_id: `sentinel:${input.sentinel.role.toLowerCase()}:v1`,
        accountable_owner_id: input.sentinel.identity.owner,
        organization_reference: `enterprise:${input.context.enterpriseId}`,
        provider_references: [],
        external_identity_references: [],
        identity_profile_reference: input.sentinel.identity.identityReference,
        current_authority_references: [input.sentinel.identity.authorityReference],
        environment_references: [input.sentinel.identity.runtimeReference],
        workflow_references: ["workflow:sentinel-observation"],
        current_consequence_classification: "moderate",
        revoked_at: null,
        supersedes_entity_version_id: null,
        canonical_digest: canonicalDigest,
        created_at: input.occurredAt,
        ...common,
      });
  if (persistence.error) fail("Sentinel Operational Entity lifecycle update failed.", persistence.error);

  const audit = await db.from("trust_architecture_audit_log").insert({
    enterprise_id: input.context.enterpriseId,
    action: input.requestedState === "PAUSED" ? "PAUSE_SENTINEL" : "RESUME_SENTINEL",
    actor_reference: `user:${input.context.user.id}`,
    target_type: "OPERATIONAL_ENTITY",
    target_id: input.sentinel.sentinelId,
    correlation_id: input.correlationId,
    metadata: {
      eventDigest: transition.eventDigest,
      previousState: transition.previousState,
      currentState: transition.currentState,
      canonicalSystemAffected: false,
      destructiveKillPerformed: false,
    },
  });
  if (audit.error) fail("Sentinel lifecycle audit append failed.", audit.error);

  return {
    ...transition,
    action: input.requestedState === "PAUSED" ? "PAUSE_SENTINEL" as const : "RESUME_SENTINEL" as const,
    persistencePerformed: true as const,
    storage: "EXISTING_OPERATIONAL_ENTITIES" as const,
    auditLog: "EXISTING_TRUST_ARCHITECTURE_AUDIT_LOG" as const,
  };
}
