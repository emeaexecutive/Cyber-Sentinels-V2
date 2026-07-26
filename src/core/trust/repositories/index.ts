import type { TrustEvent } from "../events/index.ts";
import type {
  TrustEntity,
  TrustEntityGraph,
  TrustEntitySummary,
  TrustEntityType,
  TrustEvidence,
  TrustGraphStatistics,
  TrustGraphTimelineItem,
  TrustRelationship,
  TrustSource,
} from "../types/index.ts";

export interface TrustGraphRepository {
  createEntity(entity: TrustEntity, event: TrustEvent): Promise<TrustEntity>;
  updateEntity(
    tenantId: string,
    entityId: string,
    expectedVersion: number,
    patch: Partial<Pick<TrustEntity, "entityName" | "status" | "metadata">>,
    event: TrustEvent,
  ): Promise<TrustEntity>;
  deleteEntity(
    tenantId: string,
    entityId: string,
    expectedVersion: number,
    event: TrustEvent,
  ): Promise<TrustEntity>;
  attachEvidence(evidence: TrustEvidence, event: TrustEvent): Promise<TrustEvidence>;
  createRelationship(
    relationship: TrustRelationship,
    event: TrustEvent,
  ): Promise<TrustRelationship>;
  removeRelationship(
    tenantId: string,
    relationshipId: string,
    expectedVersion: number,
    event: TrustEvent,
  ): Promise<TrustRelationship>;
  updateProvider(source: TrustSource, event: TrustEvent): Promise<TrustSource>;
  findEntity(tenantId: string, entityId: string): Promise<TrustEntity | null>;
  findRelationship(tenantId: string, relationshipId: string): Promise<TrustRelationship | null>;
  findNeighbours(
    tenantId: string,
    entityId: string,
    limit: number,
  ): Promise<{ entities: TrustEntity[]; relationships: TrustRelationship[] }>;
  findEvidence(tenantId: string, entityId: string, limit: number): Promise<TrustEvidence[]>;
  entityTimeline(
    tenantId: string,
    entityId: string,
    limit: number,
  ): Promise<TrustGraphTimelineItem[]>;
  entitySummary(tenantId: string, entityId: string): Promise<TrustEntitySummary | null>;
  entityGraph(tenantId: string, entityId: string, limit: number): Promise<TrustEntityGraph | null>;
  findEntitiesByEvidenceFingerprint(
    tenantId: string,
    evidenceType: string,
    matchKeyHash: string,
    limit: number,
  ): Promise<TrustEntity[]>;
  findProviderFailures(tenantId: string, limit: number): Promise<TrustSource[]>;
  findLinkedEntities(
    tenantId: string,
    entityId: string,
    entityType: TrustEntityType,
    limit: number,
  ): Promise<TrustEntity[]>;
  findOrphanEntities(tenantId: string, limit: number): Promise<TrustEntity[]>;
  providerHealth(tenantId: string): Promise<TrustSource[]>;
  statistics(tenantId: string): Promise<TrustGraphStatistics>;
}
