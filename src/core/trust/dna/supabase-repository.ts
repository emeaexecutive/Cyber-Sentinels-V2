import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createTrustGraphRepository } from "../repositories/supabase.ts";
import type { TrustEntityType } from "../types/index.ts";
import type { TrustDimension, TrustDimensionName } from "./TrustDimension.ts";
import type { TrustDNARepository } from "./TrustDNARepository.ts";
import type { TrustRiskBand, TrustProfile, TrustVector } from "./TrustProfile.ts";

function failure(operation: string, error: unknown): never {
  const candidate = error as { code?: string; message?: string };
  const conflict = candidate.code === "P0001" && /version|conflict/i.test(candidate.message ?? "");
  console.error("Trust DNA repository operation failed.", {
    operation,
    code: candidate.code ?? "UNKNOWN",
  });
  throw Object.assign(
    new Error(conflict ? "Trust DNA version conflict." : "Trust DNA operation failed safely."),
    {
      status: conflict ? 409 : 500,
      code: conflict ? "TRUST_DNA_VERSION_CONFLICT" : "TRUST_DNA_PERSISTENCE_FAILED",
    },
  );
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function dimension(row: Record<string, unknown>): TrustDimension {
  const reasons = stringArray(row.reasons);
  return {
    name: String(row.dimension_name) as TrustDimensionName,
    score: Number(row.score),
    confidence: Number(row.confidence),
    weight: Number(row.weight),
    reason: String(row.reason ?? reasons[0] ?? "No explanation recorded."),
    reasons,
    lastUpdated: String(row.last_updated),
    evidenceIds: stringArray(row.evidence_ids),
    evidenceMissing: Boolean(row.evidence_missing),
    riskIndicators: stringArray(row.risk_indicators),
    recommendedActions: stringArray(row.recommended_actions),
    history: [],
  };
}

function profile(row: Record<string, unknown>, dimensions: TrustDimension[]): TrustProfile {
  const generatedAt = String(row.generated_at);
  return {
    profileId: String(row.profile_id),
    tenantId: String(row.tenant_id),
    entityId: String(row.entity_id),
    identityId: String(row.identity_id),
    entityType: String(row.entity_type) as TrustEntityType,
    profileVersion: "trust-dna-v2",
    version: Number(row.version),
    overallScore: Number(row.overall_score),
    overallConfidence: Number(row.overall_confidence),
    evidenceCompleteness: Number(row.evidence_completeness),
    dimensions,
    dimensionBreakdown: dimensions,
    vector: (row.vector ?? {}) as TrustVector,
    evidenceUsed: stringArray(row.evidence_used),
    evidenceMissing: stringArray(row.evidence_missing),
    riskIndicators: stringArray(row.risk_indicators),
    recommendedActions: stringArray(row.recommended_actions),
    riskBand: String(row.risk_band) as TrustRiskBand,
    explanation: stringArray(row.explanation),
    generatedAt,
    lastRecalculated: generatedAt,
  };
}

const profileFields =
  "profile_id,tenant_id,identity_id,entity_id,entity_type,profile_version,version,overall_score,overall_confidence,evidence_completeness,risk_band,vector,evidence_used,evidence_missing,risk_indicators,recommended_actions,explanation,generated_at";
const dimensionFields =
  "dimension_name,score,confidence,weight,reason,reasons,last_updated,evidence_ids,evidence_missing,risk_indicators,recommended_actions";

export function createTrustDNARepository(readClient: SupabaseClient): TrustDNARepository {
  const graph = createTrustGraphRepository(readClient);
  let writer: SupabaseClient | null = null;

  return {
    findEntity: graph.findEntity,
    findEvidence: graph.findEvidence,
    providerHealth: graph.providerHealth,

    async findLatestProfile(tenantId, entityId) {
      const profileResult = await readClient
        .from("trust_profiles")
        .select(profileFields)
        .eq("tenant_id", tenantId)
        .eq("entity_id", entityId)
        .eq("profile_version", "trust-dna-v2")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (profileResult.error) failure("find latest profile", profileResult.error);
      if (!profileResult.data) return null;
      const profileId = String(profileResult.data.profile_id);
      const dimensionResult = await readClient
        .from("trust_dimension_scores")
        .select(dimensionFields)
        .eq("tenant_id", tenantId)
        .eq("profile_id", profileId)
        .order("dimension_name");
      if (dimensionResult.error) failure("find profile dimensions", dimensionResult.error);
      return profile(
        profileResult.data as Record<string, unknown>,
        (dimensionResult.data ?? []).map((row) => dimension(row as Record<string, unknown>)),
      );
    },

    async findHistory(tenantId, entityId, limit) {
      const result = await readClient
        .from("trust_score_history")
        .select(
          "id,tenant_id,entity_id,profile_id,version,overall_score,overall_confidence,evidence_completeness,score_change,reason,calculated_at",
        )
        .eq("tenant_id", tenantId)
        .eq("entity_id", entityId)
        .order("version", { ascending: false })
        .limit(limit);
      if (result.error) failure("find score history", result.error);
      return (result.data ?? []).map((row) => ({
        id: String(row.id),
        tenantId: String(row.tenant_id),
        entityId: String(row.entity_id),
        profileId: String(row.profile_id),
        version: Number(row.version),
        overallScore: Number(row.overall_score),
        overallConfidence: Number(row.overall_confidence),
        evidenceCompleteness: Number(row.evidence_completeness),
        change: row.score_change === null ? null : Number(row.score_change),
        reason: String(row.reason),
        calculatedAt: String(row.calculated_at),
      }));
    },

    async saveProfile(value) {
      writer ??= createServiceRoleClient();
      const result = await writer.rpc("persist_trust_dna_v2", {
        p_profile: value,
        p_dimensions: value.dimensions,
      });
      if (result.error) failure("persist profile", result.error);
      return value;
    },
  };
}
