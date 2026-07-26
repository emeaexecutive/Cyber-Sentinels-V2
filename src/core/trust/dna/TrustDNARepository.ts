import type { TrustEntity, TrustEvidence, TrustSource } from "../types/index.ts";
import type { TrustScoreHistoryEntry } from "./TrustHistory.ts";
import type { TrustProfile } from "./TrustProfile.ts";

export interface TrustDNARepository {
  findEntity(tenantId: string, entityId: string): Promise<TrustEntity | null>;
  findEvidence(tenantId: string, entityId: string, limit: number): Promise<TrustEvidence[]>;
  providerHealth(tenantId: string): Promise<TrustSource[]>;
  findLatestProfile(tenantId: string, entityId: string): Promise<TrustProfile | null>;
  findHistory(
    tenantId: string,
    entityId: string,
    limit: number,
  ): Promise<TrustScoreHistoryEntry[]>;
  saveProfile(profile: TrustProfile): Promise<TrustProfile>;
}
