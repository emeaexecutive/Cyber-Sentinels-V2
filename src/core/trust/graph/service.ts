import type { CreateTrustEntityInput, UpdateTrustEntityInput } from "../entities/index.ts";
import { safeTrustMetadata, validateTrustEntity } from "../entities/index.ts";
import { createTrustEvent, type TrustEvent } from "../events/index.ts";
import type { TrustGraphRepository } from "../repositories/index.ts";
import type {
  TrustEntity,
  TrustEvidence,
  TrustRelationship,
  TrustSource,
} from "../types/index.ts";

export type TrustGraphContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

function bounded(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError("Graph limit is invalid.");
  return Math.min(value, 500);
}

function confidence(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError("Confidence must be between 0 and 1.");
  }
  return value;
}

function reference(value: string, field: string, maximum = 256): string {
  const result = value.trim();
  if (!result || result.length > maximum || !/^[A-Za-z0-9][A-Za-z0-9_.:@/-]*$/.test(result)) {
    throw new TypeError(`${field} is invalid.`);
  }
  return result;
}

export class TrustGraphService {
  private readonly repository: TrustGraphRepository;
  private readonly idFactory: () => string;
  private readonly now: () => string;

  constructor(
    repository: TrustGraphRepository,
    dependencies: { idFactory?: () => string; now?: () => string } = {},
  ) {
    this.repository = repository;
    this.idFactory = dependencies.idFactory ?? (() => crypto.randomUUID());
    this.now = dependencies.now ?? (() => new Date().toISOString());
  }

  private event(
    context: TrustGraphContext,
    input: Omit<TrustEvent, "id" | "tenantId" | "actorId" | "occurredAt" | "correlationId">,
  ): TrustEvent {
    return createTrustEvent({
      ...input,
      id: this.idFactory(),
      tenantId: context.tenantId,
      actorId: context.actorId,
      occurredAt: this.now(),
      correlationId: context.correlationId,
    });
  }

  async createEntity(
    context: TrustGraphContext,
    input: Omit<CreateTrustEntityInput, "id" | "tenantId">,
  ): Promise<TrustEntity> {
    const timestamp = this.now();
    const entity = validateTrustEntity({
      id: this.idFactory(),
      tenantId: context.tenantId,
      entityType: input.entityType,
      entityName: input.entityName,
      status: input.status ?? "ACTIVE",
      metadata: safeTrustMetadata(input.metadata),
      version: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    });
    return this.repository.createEntity(
      entity,
      this.event(context, {
        entityId: entity.id,
        eventType: "ENTITY_CREATED",
        resourceType: "ENTITY",
        resourceId: entity.id,
        version: 1,
        metadata: { entityType: entity.entityType },
      }),
    );
  }

  async updateEntity(
    context: TrustGraphContext,
    entityId: string,
    input: UpdateTrustEntityInput,
  ): Promise<TrustEntity> {
    const current = await this.requireEntity(context.tenantId, entityId);
    if (current.status === "DELETED") throw Object.assign(new Error("Deleted entities are immutable."), { status: 409, code: "ENTITY_DELETED" });
    const version = current.version + 1;
    if (input.entityName !== undefined && !input.entityName.trim()) {
      throw new TypeError("Entity name cannot be empty.");
    }
    if (input.status !== undefined && !["ACTIVE", "SUSPENDED", "REVOKED"].includes(input.status)) {
      throw new TypeError("Entity status is invalid.");
    }
    const patch = {
      ...(input.entityName === undefined ? {} : { entityName: input.entityName.trim() }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.metadata === undefined ? {} : { metadata: safeTrustMetadata(input.metadata) }),
    };
    return this.repository.updateEntity(
      context.tenantId,
      entityId,
      input.expectedVersion,
      patch,
      this.event(context, {
        entityId,
        eventType: "ENTITY_UPDATED",
        resourceType: "ENTITY",
        resourceId: entityId,
        version,
        metadata: { fieldsChanged: Object.keys(patch).sort().join(",") },
      }),
    );
  }

  async deleteEntity(
    context: TrustGraphContext,
    entityId: string,
    expectedVersion: number,
  ): Promise<TrustEntity> {
    const current = await this.requireEntity(context.tenantId, entityId);
    return this.repository.deleteEntity(
      context.tenantId,
      entityId,
      expectedVersion,
      this.event(context, {
        entityId,
        eventType: "ENTITY_DELETED",
        resourceType: "ENTITY",
        resourceId: entityId,
        version: current.version + 1,
        metadata: { deletion: "tombstone" },
      }),
    );
  }

  async attachEvidence(
    context: TrustGraphContext,
    input: Omit<TrustEvidence, "id" | "tenantId" | "version" | "createdAt">,
  ): Promise<TrustEvidence> {
    await this.requireEntity(context.tenantId, input.entityId);
    const evidence: TrustEvidence = {
      ...input,
      id: this.idFactory(),
      tenantId: context.tenantId,
      source: reference(input.source, "Evidence source"),
      provider: reference(input.provider, "Evidence provider", 128),
      evidenceType: reference(input.evidenceType, "Evidence type", 128),
      confidence: confidence(input.confidence),
      metadata: safeTrustMetadata(input.metadata),
      version: 1,
      createdAt: this.now(),
    };
    return this.repository.attachEvidence(
      evidence,
      this.event(context, {
        entityId: evidence.entityId,
        eventType: "EVIDENCE_ADDED",
        resourceType: "EVIDENCE",
        resourceId: evidence.id,
        version: 1,
        metadata: { evidenceType: evidence.evidenceType, provider: evidence.provider },
      }),
    );
  }

  async createRelationship(
    context: TrustGraphContext,
    input: Omit<TrustRelationship, "id" | "tenantId" | "version" | "createdAt" | "removedAt">,
  ): Promise<TrustRelationship> {
    if (input.sourceEntityId === input.targetEntityId) {
      throw new TypeError("Self relationships are not permitted.");
    }
    await Promise.all([
      this.requireEntity(context.tenantId, input.sourceEntityId),
      this.requireEntity(context.tenantId, input.targetEntityId),
    ]);
    if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(input.relationshipType)) {
      throw new TypeError("Relationship type must use the uppercase graph vocabulary.");
    }
    const relationship: TrustRelationship = {
      ...input,
      id: this.idFactory(),
      tenantId: context.tenantId,
      relationshipType: reference(
        input.relationshipType,
        "Relationship type",
        64,
      ),
      confidence: confidence(input.confidence),
      metadata: safeTrustMetadata(input.metadata),
      version: 1,
      createdAt: this.now(),
      removedAt: null,
    };
    return this.repository.createRelationship(
      relationship,
      this.event(context, {
        entityId: relationship.sourceEntityId,
        eventType: "RELATIONSHIP_ADDED",
        resourceType: "RELATIONSHIP",
        resourceId: relationship.id,
        version: 1,
        metadata: { relationshipType: relationship.relationshipType },
      }),
    );
  }

  async removeRelationship(
    context: TrustGraphContext,
    relationshipId: string,
    expectedVersion: number,
  ): Promise<TrustRelationship> {
    const current = await this.repository.findRelationship(context.tenantId, relationshipId);
    if (!current || current.removedAt) {
      throw Object.assign(new Error("Relationship was not found."), { status: 404, code: "RELATIONSHIP_NOT_FOUND" });
    }
    return this.repository.removeRelationship(
      context.tenantId,
      relationshipId,
      expectedVersion,
      this.event(context, {
        entityId: current.sourceEntityId,
        eventType: "RELATIONSHIP_REMOVED",
        resourceType: "RELATIONSHIP",
        resourceId: relationshipId,
        version: current.version + 1,
        metadata: { relationshipType: current.relationshipType },
      }),
    );
  }

  updateProvider(
    context: TrustGraphContext,
    input: Omit<TrustSource, "tenantId" | "version" | "updatedAt"> & {
      expectedVersion?: number;
    },
  ): Promise<TrustSource> {
    const version = (input.expectedVersion ?? 0) + 1;
    const provider = reference(input.provider, "Provider", 128);
    const source: TrustSource = {
      tenantId: context.tenantId,
      provider,
      health: input.health,
      latencyMs: input.latencyMs,
      costAmount: input.costAmount,
      costCurrency: input.costCurrency,
      lastSeen: input.lastSeen,
      version,
      updatedAt: this.now(),
    };
    return this.repository.updateProvider(
      source,
      this.event(context, {
        entityId: null,
        eventType: "PROVIDER_UPDATED",
        resourceType: "PROVIDER",
        resourceId: source.provider,
        version,
        metadata: { health: source.health },
      }),
    );
  }

  async findNeighbours(tenantId: string, entityId: string, limit = 100) {
    await this.requireEntity(tenantId, entityId);
    const result = await this.repository.findNeighbours(tenantId, entityId, bounded(limit));
    const entities = result.entities.filter((item) => item.tenantId === tenantId);
    const entityIds = new Set([entityId, ...entities.map((item) => item.id)]);
    return {
      entities,
      relationships: result.relationships.filter(
        (item) =>
          item.tenantId === tenantId &&
          entityIds.has(item.sourceEntityId) &&
          entityIds.has(item.targetEntityId),
      ),
    };
  }

  async findEvidence(tenantId: string, entityId: string, limit = 100) {
    await this.requireEntity(tenantId, entityId);
    return (await this.repository.findEvidence(tenantId, entityId, bounded(limit))).filter(
      (item) => item.tenantId === tenantId && item.entityId === entityId,
    );
  }

  async entityTimeline(tenantId: string, entityId: string, limit = 200) {
    await this.requireEntity(tenantId, entityId);
    return this.repository.entityTimeline(tenantId, entityId, bounded(limit));
  }

  async entitySummary(tenantId: string, entityId: string) {
    const summary = await this.repository.entitySummary(tenantId, entityId);
    return summary?.entity.tenantId === tenantId && summary.entity.id === entityId
      ? summary
      : null;
  }

  async entityGraph(tenantId: string, entityId: string, limit = 100) {
    const entity = await this.requireEntity(tenantId, entityId);
    const [neighbours, evidence] = await Promise.all([
      this.findNeighbours(tenantId, entityId, limit),
      this.findEvidence(tenantId, entityId, limit),
    ]);
    return {
      entity,
      neighbours: neighbours.entities,
      relationships: neighbours.relationships,
      evidence,
      generatedAt: this.now(),
    };
  }

  async requireEntity(tenantId: string, entityId: string): Promise<TrustEntity> {
    const entity = await this.repository.findEntity(tenantId, entityId);
    if (!entity) throw Object.assign(new Error("Trust Entity was not found."), { status: 404, code: "ENTITY_NOT_FOUND" });
    return entity;
  }
}
