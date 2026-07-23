import type { SafeMetadata } from "../types/index.ts";

export const trustGraphEventTypes = [
  "ENTITY_CREATED",
  "ENTITY_UPDATED",
  "ENTITY_DELETED",
  "EVIDENCE_ADDED",
  "RELATIONSHIP_ADDED",
  "RELATIONSHIP_REMOVED",
  "PROVIDER_UPDATED",
] as const;
export type TrustGraphEventType = (typeof trustGraphEventTypes)[number];

export type TrustEvent<TType extends TrustGraphEventType = TrustGraphEventType> = {
  id: string;
  tenantId: string;
  entityId: string | null;
  eventType: TType;
  resourceType: "ENTITY" | "EVIDENCE" | "RELATIONSHIP" | "PROVIDER";
  resourceId: string;
  actorId: string;
  version: number;
  occurredAt: string;
  metadata: SafeMetadata;
  correlationId: string;
};

export type EntityCreated = TrustEvent<"ENTITY_CREATED">;
export type EvidenceAdded = TrustEvent<"EVIDENCE_ADDED">;
export type RelationshipAdded = TrustEvent<"RELATIONSHIP_ADDED">;
export type RelationshipRemoved = TrustEvent<"RELATIONSHIP_REMOVED">;
export type ProviderUpdated = TrustEvent<"PROVIDER_UPDATED">;

export function createTrustEvent<TType extends TrustGraphEventType>(
  event: TrustEvent<TType>,
): TrustEvent<TType> {
  if (!trustGraphEventTypes.includes(event.eventType)) throw new TypeError("Trust event type is invalid.");
  if (!Number.isSafeInteger(event.version) || event.version < 1) {
    throw new TypeError("Trust event version is invalid.");
  }
  const occurredAt = new Date(event.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) throw new TypeError("Trust event timestamp is invalid.");
  return { ...event, occurredAt: occurredAt.toISOString() };
}
