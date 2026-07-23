import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReplayEvent, ReplayEventType, ReplayRepository } from "./index.ts";

export function createReplayRepository(client: SupabaseClient): ReplayRepository {
  return {
    async findByIdentity(tenantId, identityId, limit) {
      const result = await client
        .from("replay_events")
        .select("event_id,tenant_id,identity_id,event_type,title,description,occurred_at,source,confidence,evidence_ids,prior_trust,resulting_trust,actor_id,metadata")
        .eq("tenant_id", tenantId)
        .eq("identity_id", identityId)
        .order("occurred_at", { ascending: true })
        .order("event_id", { ascending: true })
        .limit(Math.min(Math.max(limit, 1), 500));
      if (result.error) {
        console.error("Trust Replay repository operation failed.", {
          code: result.error.code,
        });
        throw Object.assign(new Error("Replay could not be loaded safely."), {
          status: 500,
          code: "TRUST_REPLAY_PERSISTENCE_FAILED",
        });
      }
      return (result.data ?? []).map(
        (row): ReplayEvent => ({
          id: String(row.event_id),
          tenantId: String(row.tenant_id),
          identityId: String(row.identity_id),
          type: String(row.event_type) as ReplayEventType,
          title: String(row.title),
          description: String(row.description),
          occurredAt: String(row.occurred_at),
          source: String(row.source),
          confidence: row.confidence === null ? null : Number(row.confidence),
          evidenceIds: Array.isArray(row.evidence_ids) ? row.evidence_ids.map(String) : [],
          priorTrust: row.prior_trust === null ? null : Number(row.prior_trust),
          resultingTrust: row.resulting_trust === null ? null : Number(row.resulting_trust),
          actorId: row.actor_id ? String(row.actor_id) : null,
          metadata:
            row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
              ? (row.metadata as ReplayEvent["metadata"])
              : {},
        }),
      );
    },
  };
}
