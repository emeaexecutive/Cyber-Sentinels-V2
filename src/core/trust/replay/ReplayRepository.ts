import type { TrustEntity } from "../types/index.ts";
import type { ReplayEvent, ReplayEventType } from "./ReplayEvent.ts";

export type ReplaySearch = {
  from?: string;
  to?: string;
  riskMin?: number;
  riskMax?: number;
  provider?: string;
  actor?: string;
  evidenceType?: string;
  trustMin?: number;
  trustMax?: number;
  eventTypes?: ReplayEventType[];
  limit: number;
};

export interface ReplayRepository {
  findEntity(tenantId: string, entityId: string): Promise<TrustEntity | null>;
  findByIdentity(tenantId: string, identityId: string, limit: number): Promise<ReplayEvent[]>;
  findByEntity(
    tenantId: string,
    entityId: string,
    search: ReplaySearch,
  ): Promise<ReplayEvent[]>;
  append(event: ReplayEvent): Promise<ReplayEvent>;
}
