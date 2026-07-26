import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createTrustGraphRepository } from "../repositories/supabase.ts";
import type { ReplayEvent, ReplayEventType } from "./ReplayEvent.ts";
import type { ReplayRepository } from "./ReplayRepository.ts";

const eventFields =
  "event_id,tenant_id,identity_id,entity_id,event_type,title,description,occurred_at,event_time,source,actor_id,actor,provider,confidence,evidence_ids,prior_trust,resulting_trust,risk_before,risk_after,metadata,previous_event_hash,event_hash,created_at";

function failure(operation: string, error: unknown): never {
  const candidate = error as { code?: string };
  console.error("Trust Replay repository operation failed.", {
    operation,
    code: candidate.code ?? "UNKNOWN",
  });
  throw Object.assign(new Error("Replay operation failed safely."), {
    status: 500,
    code: "TRUST_REPLAY_PERSISTENCE_FAILED",
  });
}

function mapEvent(row: Record<string, unknown>): ReplayEvent {
  const identityId = String(row.identity_id);
  const occurredAt = String(row.event_time ?? row.occurred_at);
  return {
    id: String(row.event_id),
    tenantId: String(row.tenant_id),
    identityId,
    entityId: row.entity_id ? String(row.entity_id) : identityId,
    type: String(row.event_type) as ReplayEventType,
    title: String(row.title),
    description: String(row.description),
    occurredAt,
    eventTime: occurredAt,
    source: String(row.source),
    actorId: row.actor_id ? String(row.actor_id) : null,
    actor: row.actor ? String(row.actor) : row.actor_id ? String(row.actor_id) : null,
    provider: row.provider ? String(row.provider) : null,
    confidence: row.confidence === null ? null : Number(row.confidence),
    evidenceIds: Array.isArray(row.evidence_ids) ? row.evidence_ids.map(String) : [],
    priorRisk: row.risk_before === null ? null : Number(row.risk_before),
    resultingRisk: row.risk_after === null ? null : Number(row.risk_after),
    priorTrust: row.prior_trust === null ? null : Number(row.prior_trust),
    resultingTrust: row.resulting_trust === null ? null : Number(row.resulting_trust),
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as ReplayEvent["metadata"])
        : {},
    previousEventHash: row.previous_event_hash ? String(row.previous_event_hash) : null,
    integrityHash: row.event_hash ? String(row.event_hash) : null,
    createdAt: String(row.created_at),
  };
}

export function createReplayRepository(client: SupabaseClient): ReplayRepository {
  const graph = createTrustGraphRepository(client);
  let writer: SupabaseClient | null = null;

  return {
    findEntity: graph.findEntity,

    async findByIdentity(tenantId, identityId, limit) {
      const result = await client
        .from("replay_events")
        .select(eventFields)
        .eq("tenant_id", tenantId)
        .eq("identity_id", identityId)
        .order("occurred_at", { ascending: true })
        .order("event_id", { ascending: true })
        .limit(Math.min(Math.max(limit, 1), 500));
      if (result.error) failure("find legacy identity replay", result.error);
      return (result.data ?? []).map((row) => mapEvent(row as Record<string, unknown>));
    },

    async findByEntity(tenantId, entityId, search) {
      let query = client
        .from("replay_events")
        .select(eventFields)
        .eq("tenant_id", tenantId)
        .eq("entity_id", entityId)
        .order("event_time", { ascending: true })
        .order("event_id", { ascending: true })
        .limit(Math.min(Math.max(search.limit, 1), 500));
      if (search.from) query = query.gte("event_time", search.from);
      if (search.to) query = query.lte("event_time", search.to);
      if (search.riskMin !== undefined) query = query.gte("risk_after", search.riskMin);
      if (search.riskMax !== undefined) query = query.lte("risk_after", search.riskMax);
      if (search.trustMin !== undefined) query = query.gte("trust_after", search.trustMin);
      if (search.trustMax !== undefined) query = query.lte("trust_after", search.trustMax);
      if (search.provider) query = query.eq("provider", search.provider);
      if (search.actor) query = query.eq("actor", search.actor);
      if (search.evidenceType) {
        query = query.contains("metadata", { evidenceType: search.evidenceType });
      }
      if (search.eventTypes?.length) query = query.in("event_type", search.eventTypes);
      const result = await query;
      if (result.error) failure("search entity replay", result.error);
      return (result.data ?? []).map((row) => mapEvent(row as Record<string, unknown>));
    },

    async append(event) {
      writer ??= createServiceRoleClient();
      const result = await writer.rpc("append_replay_event_v2", {
        p_event: event,
      });
      if (result.error) failure("append replay event", result.error);
      return mapEvent(result.data as Record<string, unknown>);
    },
  };
}
