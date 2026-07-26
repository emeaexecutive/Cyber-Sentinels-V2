export const trustEntityTypes = [
  "HUMAN",
  "ORGANISATION",
  "AI_AGENT",
  "DEVICE",
  "IDENTITY",
  "EMAIL",
  "PHONE",
  "DOCUMENT",
  "WORKFLOW",
  "POLICY",
] as const;

export type TrustEntityType = (typeof trustEntityTypes)[number];
export type TrustEntityStatus = "ACTIVE" | "SUSPENDED" | "REVOKED" | "DELETED";

export type SafeMetadata = Record<string, string | number | boolean | null>;

export type TrustEntity = {
  id: string;
  tenantId: string;
  entityType: TrustEntityType;
  entityName: string;
  status: TrustEntityStatus;
  metadata: SafeMetadata;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TrustEvidence = {
  id: string;
  tenantId: string;
  entityId: string;
  source: string;
  provider: string;
  evidenceType: string;
  confidence: number;
  metadata: SafeMetadata;
  version: number;
  createdAt: string;
};

export type TrustRelationship = {
  id: string;
  tenantId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  confidence: number;
  metadata: SafeMetadata;
  version: number;
  createdAt: string;
  removedAt: string | null;
};

export type TrustSource = {
  tenantId: string;
  provider: string;
  health: "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "MISCONFIGURED" | "UNKNOWN";
  latencyMs: number | null;
  costAmount: number | null;
  costCurrency: string | null;
  lastSeen: string | null;
  version: number;
  updatedAt: string;
};

export type TrustEntityGraph = {
  entity: TrustEntity;
  neighbours: TrustEntity[];
  relationships: TrustRelationship[];
  evidence: TrustEvidence[];
  generatedAt: string;
};

export type TrustEntitySummary = {
  entity: TrustEntity;
  evidenceCount: number;
  activeRelationshipCount: number;
  inboundRelationshipCount: number;
  outboundRelationshipCount: number;
  providerCount: number;
  latestActivityAt: string;
};

export type TrustGraphTimelineItem = {
  id: string;
  type: "EVENT" | "EVIDENCE";
  title: string;
  occurredAt: string;
  version: number;
  metadata: SafeMetadata;
};

export type TrustGraphStatistics = {
  tenantId: string;
  entities: number;
  activeEntities: number;
  evidence: number;
  activeRelationships: number;
  providers: number;
  orphanEntities: number;
  measuredAt: string;
};
