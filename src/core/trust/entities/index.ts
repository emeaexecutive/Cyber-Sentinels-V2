import {
  trustEntityTypes,
  type SafeMetadata,
  type TrustEntity,
  type TrustEntityStatus,
} from "../types/index.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deniedMetadata = /address|credential|document|email|ip|password|payload|phone|secret|token/i;

export type CreateTrustEntityInput = Pick<
  TrustEntity,
  "id" | "tenantId" | "entityType" | "entityName"
> & {
  status?: TrustEntityStatus;
  metadata?: Record<string, unknown>;
};

export type UpdateTrustEntityInput = {
  entityName?: string;
  status?: Exclude<TrustEntityStatus, "DELETED">;
  metadata?: Record<string, unknown>;
  expectedVersion: number;
};

export function safeTrustMetadata(value: Record<string, unknown> = {}): SafeMetadata {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !deniedMetadata.test(key))
      .filter((entry): entry is [string, string | number | boolean | null] =>
        entry[1] === null || ["string", "number", "boolean"].includes(typeof entry[1]),
      ),
  );
}

export function validateTrustEntity(entity: TrustEntity): TrustEntity {
  if (!uuid.test(entity.id) || !uuid.test(entity.tenantId)) {
    throw new TypeError("Trust Entity identifiers must be UUIDs.");
  }
  if (!trustEntityTypes.includes(entity.entityType)) throw new TypeError("Entity type is invalid.");
  if (!entity.entityName.trim() || entity.entityName.length > 200) {
    throw new TypeError("Entity name must be between 1 and 200 characters.");
  }
  if (!["ACTIVE", "SUSPENDED", "REVOKED", "DELETED"].includes(entity.status)) {
    throw new TypeError("Entity status is invalid.");
  }
  if (!Number.isSafeInteger(entity.version) || entity.version < 1) {
    throw new TypeError("Entity version is invalid.");
  }
  return { ...entity, entityName: entity.entityName.trim(), metadata: safeTrustMetadata(entity.metadata) };
}
