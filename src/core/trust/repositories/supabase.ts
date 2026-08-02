import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { TrustEvent } from "../events/index.ts";
import type { TrustGraphRepository } from "./index.ts";
import type {
  SafeMetadata,
  TrustEntity,
  TrustEntityGraph,
  TrustEntityStatus,
  TrustEntityType,
  TrustEvidence,
  TrustGraphTimelineItem,
  TrustRelationship,
  TrustSource,
} from "../types/index.ts";

function failure(operation: string, error: unknown): never {
  const candidate = error as { code?: string; message?: string };
  const conflict = candidate.code === "P0001" && /version|conflict/i.test(candidate.message ?? "");
  console.error("Trust Graph repository operation failed.", {
    operation,
    code: candidate.code ?? "UNKNOWN",
  });
  throw Object.assign(
    new Error(conflict ? "Trust Graph version conflict." : "Trust Graph operation failed safely."),
    {
      status: conflict ? 409 : 500,
      code: conflict ? "VERSION_CONFLICT" : "TRUST_GRAPH_PERSISTENCE_FAILED",
    },
  );
}

function metadata(value: unknown): SafeMetadata {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as SafeMetadata)
    : {};
}

function entity(row: Record<string, unknown>): TrustEntity {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    entityType: String(row.entity_type) as TrustEntityType,
    entityName: String(row.entity_name),
    status: String(row.status) as TrustEntityStatus,
    metadata: metadata(row.metadata),
    version: Number(row.version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}

function evidence(row: Record<string, unknown>): TrustEvidence {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    entityId: String(row.entity_id),
    source: String(row.source),
    provider: String(row.provider),
    evidenceType: String(row.evidence_type),
    confidence: Number(row.confidence),
    metadata: metadata(row.metadata),
    version: Number(row.version),
    createdAt: String(row.created_at),
  };
}

function relationship(row: Record<string, unknown>): TrustRelationship {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    sourceEntityId: String(row.source_entity),
    targetEntityId: String(row.target_entity),
    relationshipType: String(row.relationship_type),
    confidence: Number(row.confidence),
    metadata: metadata(row.metadata),
    version: Number(row.version),
    createdAt: String(row.created_at),
    removedAt: row.removed_at ? String(row.removed_at) : null,
  };
}

function source(row: Record<string, unknown>): TrustSource {
  return {
    tenantId: String(row.tenant_id),
    provider: String(row.provider),
    health: String(row.health) as TrustSource["health"],
    latencyMs: row.latency === null ? null : Number(row.latency),
    costAmount: row.cost === null ? null : Number(row.cost),
    costCurrency: row.cost_currency ? String(row.cost_currency) : null,
    lastSeen: row.last_seen ? String(row.last_seen) : null,
    version: Number(row.version),
    updatedAt: String(row.updated_at),
  };
}

const entityFields = "id,tenant_id,entity_type,entity_name,status,metadata,version,created_at,updated_at,deleted_at";
const evidenceFields = "id,tenant_id,entity_id,source,provider,evidence_type,confidence,metadata,version,created_at";
const relationshipFields = "id,tenant_id,source_entity,target_entity,relationship_type,confidence,metadata,version,created_at,removed_at";
const sourceFields = "tenant_id,provider,health,latency,cost,cost_currency,last_seen,version,updated_at";

export function createTrustGraphRepository(readClient: SupabaseClient): TrustGraphRepository {
  let writer: SupabaseClient | null = null;

  async function mutate<T>(
    action: string,
    payload: Record<string, unknown>,
    event: TrustEvent,
    mapper: (row: Record<string, unknown>) => T,
  ): Promise<T> {
    writer ??= createServiceRoleClient();
    const result = await writer.rpc("mutate_trust_graph_v1", {
      p_action: action,
      p_payload: payload,
      p_event: event,
    });
    if (result.error) failure(action, result.error);
    const record = (result.data as { record?: Record<string, unknown> } | null)?.record;
    if (!record) failure(action, { code: "EMPTY_MUTATION_RESULT" });
    return mapper(record);
  }

  const repository: TrustGraphRepository = {
    createEntity(value, event) {
      return mutate("CREATE_ENTITY", value as unknown as Record<string, unknown>, event, entity);
    },
    updateEntity(tenantId, entityId, expectedVersion, patch, event) {
      return mutate(
        "UPDATE_ENTITY",
        { tenantId, entityId, expectedVersion, patch },
        event,
        entity,
      );
    },
    deleteEntity(tenantId, entityId, expectedVersion, event) {
      return mutate("DELETE_ENTITY", { tenantId, entityId, expectedVersion }, event, entity);
    },
    attachEvidence(value, event) {
      return mutate("ATTACH_EVIDENCE", value as unknown as Record<string, unknown>, event, evidence);
    },
    createRelationship(value, event) {
      return mutate(
        "CREATE_RELATIONSHIP",
        value as unknown as Record<string, unknown>,
        event,
        relationship,
      );
    },
    removeRelationship(tenantId, relationshipId, expectedVersion, event) {
      return mutate(
        "REMOVE_RELATIONSHIP",
        { tenantId, relationshipId, expectedVersion },
        event,
        relationship,
      );
    },
    updateProvider(value, event) {
      return mutate(
        "UPDATE_PROVIDER",
        value as unknown as Record<string, unknown>,
        event,
        source,
      );
    },

    async findEntity(tenantId, entityId) {
      const result = await readClient
        .from("trust_entities")
        .select(entityFields)
        .eq("tenant_id", tenantId)
        .eq("id", entityId)
        .maybeSingle();
      if (result.error) failure("find entity", result.error);
      return result.data ? entity(result.data as Record<string, unknown>) : null;
    },

    async findRelationship(tenantId, relationshipId) {
      const result = await readClient
        .from("trust_graph_relationships_v2")
        .select(relationshipFields)
        .eq("tenant_id", tenantId)
        .eq("id", relationshipId)
        .maybeSingle();
      if (result.error) failure("find relationship", result.error);
      return result.data ? relationship(result.data as Record<string, unknown>) : null;
    },

    async findNeighbours(tenantId, entityId, limit) {
      const relationshipsResult = await readClient
        .from("trust_graph_relationships_v2")
        .select(relationshipFields)
        .eq("tenant_id", tenantId)
        .is("removed_at", null)
        .or(`source_entity.eq.${entityId},target_entity.eq.${entityId}`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (relationshipsResult.error) failure("find neighbour relationships", relationshipsResult.error);
      const relationships = (relationshipsResult.data ?? []).map((row) =>
        relationship(row as Record<string, unknown>),
      );
      const entityIds = [
        ...new Set(
          relationships
            .flatMap((item) => [item.sourceEntityId, item.targetEntityId])
            .filter((id) => id !== entityId),
        ),
      ];
      if (!entityIds.length) return { entities: [], relationships };
      const entitiesResult = await readClient
        .from("trust_entities")
        .select(entityFields)
        .eq("tenant_id", tenantId)
        .in("id", entityIds)
        .neq("status", "DELETED");
      if (entitiesResult.error) failure("find neighbour entities", entitiesResult.error);
      return {
        entities: (entitiesResult.data ?? []).map((row) => entity(row as Record<string, unknown>)),
        relationships,
      };
    },

    async findEvidence(tenantId, entityId, limit) {
      const result = await readClient
        .from("trust_evidence")
        .select(evidenceFields)
        .eq("tenant_id", tenantId)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);
      if (result.error) failure("find entity evidence", result.error);
      return (result.data ?? []).map((row) => evidence(row as Record<string, unknown>));
    },

    async entityTimeline(tenantId, entityId, limit) {
      const [eventsResult, evidenceResult] = await Promise.all([
        readClient
          .from("trust_graph_events")
          .select("id,event_type,version,occurred_at,metadata")
          .eq("tenant_id", tenantId)
          .eq("entity_id", entityId)
          .order("occurred_at", { ascending: false })
          .limit(limit),
        readClient
          .from("trust_evidence")
          .select("id,evidence_type,version,created_at,metadata")
          .eq("tenant_id", tenantId)
          .eq("entity_id", entityId)
          .order("created_at", { ascending: false })
          .limit(limit),
      ]);
      if (eventsResult.error) failure("find entity events", eventsResult.error);
      if (evidenceResult.error) failure("find timeline evidence", evidenceResult.error);
      const items: TrustGraphTimelineItem[] = [
        ...(eventsResult.data ?? []).map((row) => ({
          id: String(row.id),
          type: "EVENT" as const,
          title: String(row.event_type),
          occurredAt: String(row.occurred_at),
          version: Number(row.version),
          metadata: metadata(row.metadata),
        })),
        ...(evidenceResult.data ?? []).map((row) => ({
          id: String(row.id),
          type: "EVIDENCE" as const,
          title: String(row.evidence_type),
          occurredAt: String(row.created_at),
          version: Number(row.version),
          metadata: metadata(row.metadata),
        })),
      ];
      return items
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
        .slice(0, limit);
    },

    async entitySummary(tenantId, entityId) {
      const result = await readClient.rpc("trust_entity_summary_v1", {
        p_tenant_id: tenantId,
        p_entity_id: entityId,
      });
      if (result.error) failure("entity summary", result.error);
      if (!result.data) return null;
      const row = result.data as Record<string, unknown>;
      return {
        entity: entity(row.entity as Record<string, unknown>),
        evidenceCount: Number(row.evidence_count),
        activeRelationshipCount: Number(row.active_relationship_count),
        inboundRelationshipCount: Number(row.inbound_relationship_count),
        outboundRelationshipCount: Number(row.outbound_relationship_count),
        providerCount: Number(row.provider_count),
        latestActivityAt: String(row.latest_activity_at),
      };
    },

    async entityGraph(tenantId, entityId, limit): Promise<TrustEntityGraph | null> {
      const root = await repository.findEntity(tenantId, entityId);
      if (!root) return null;
      const [neighbours, evidenceRows] = await Promise.all([
        repository.findNeighbours(tenantId, entityId, limit),
        repository.findEvidence(tenantId, entityId, limit),
      ]);
      return {
        entity: root,
        neighbours: neighbours.entities,
        relationships: neighbours.relationships,
        evidence: evidenceRows,
        generatedAt: new Date().toISOString(),
      };
    },

    async findEntitiesByEvidenceFingerprint(tenantId, evidenceType, matchKeyHash, limit) {
      if (!/^[a-f0-9]{64}$/.test(matchKeyHash)) throw new TypeError("Evidence match key must be SHA-256.");
      const evidenceResult = await readClient
        .from("trust_evidence")
        .select("entity_id")
        .eq("tenant_id", tenantId)
        .eq("evidence_type", evidenceType)
        .contains("metadata", { matchKeyHash })
        .limit(limit);
      if (evidenceResult.error) failure("find evidence fingerprint", evidenceResult.error);
      const ids = [...new Set((evidenceResult.data ?? []).map((row) => String(row.entity_id)))];
      if (!ids.length) return [];
      const entityResult = await readClient
        .from("trust_entities")
        .select(entityFields)
        .eq("tenant_id", tenantId)
        .in("id", ids)
        .neq("status", "DELETED");
      if (entityResult.error) failure("find fingerprint entities", entityResult.error);
      return (entityResult.data ?? []).map((row) => entity(row as Record<string, unknown>));
    },

    async findProviderFailures(tenantId, limit) {
      const result = await readClient
        .from("trust_sources")
        .select(sourceFields)
        .eq("tenant_id", tenantId)
        .in("health", ["DEGRADED", "UNAVAILABLE", "MISCONFIGURED"])
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (result.error) failure("find provider failures", result.error);
      return (result.data ?? []).map((row) => source(row as Record<string, unknown>));
    },

    async findLinkedEntities(tenantId, entityId, entityType, limit) {
      const neighbours = await repository.findNeighbours(tenantId, entityId, limit);
      return neighbours.entities.filter((item) => item.entityType === entityType);
    },

    async findOrphanEntities(tenantId, limit) {
      const result = await readClient.rpc("trust_graph_orphans_v1", {
        p_tenant_id: tenantId,
        p_limit: limit,
      });
      if (result.error) failure("find orphan entities", result.error);
      return ((result.data as Record<string, unknown>[] | null) ?? []).map(entity);
    },

    async providerHealth(tenantId) {
      const result = await readClient
        .from("trust_sources")
        .select(sourceFields)
        .eq("tenant_id", tenantId)
        .order("provider");
      if (result.error) failure("provider health", result.error);
      return (result.data ?? []).map((row) => source(row as Record<string, unknown>));
    },

    async statistics(tenantId) {
      const result = await readClient.rpc("trust_graph_statistics_v1", {
        p_tenant_id: tenantId,
      });
      if (result.error) failure("trust graph statistics", result.error);
      const row = result.data as Record<string, unknown>;
      return {
        tenantId,
        entities: Number(row.entities),
        activeEntities: Number(row.active_entities),
        evidence: Number(row.evidence),
        activeRelationships: Number(row.active_relationships),
        providers: Number(row.providers),
        orphanEntities: Number(row.orphan_entities),
        measuredAt: String(row.measured_at),
      };
    },
  };

  return repository;
}
