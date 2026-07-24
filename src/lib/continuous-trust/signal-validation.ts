import { hashCanonical } from "../trust-core/hash.ts";
import {
  continuousEntityTypes,
  trustSignalSeverities,
  trustSignalStatuses,
  trustSignalTypes,
  type TrustSignal,
  type TrustSignalInput,
  type TrustSignalMetadata,
} from "./signal-types.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reference = /^[A-Za-z0-9][A-Za-z0-9_.:@/-]{0,159}$/;
const prohibitedMetadataKey = /(access.?token|refresh.?token|authorization|api.?key|client.?secret|webhook.?secret|password|passcode|private.?key|raw.?payload|raw.?proof|prompt|document.?image|biometric|selfie|face.?image|passport.?image|precise.?location|latitude|longitude|full.?ip)/i;

function requiredReference(value: unknown, field: string) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!reference.test(normalized)) throw Object.assign(new TypeError(`${field} is invalid.`), { status: 400, code: "SIGNAL_SCHEMA_INVALID" });
  return normalized;
}
function optionalReference(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return null;
  return requiredReference(value, field);
}

function timestamp(value: unknown, field: string, fallback?: string) {
  const date = new Date(typeof value === "string" && value ? value : fallback ?? "");
  if (!Number.isFinite(date.getTime())) throw Object.assign(new TypeError(`${field} must be an ISO timestamp.`), { status: 400, code: "SIGNAL_SCHEMA_INVALID" });
  return date.toISOString();
}

function enumValue<T extends readonly string[]>(values: T, value: unknown, field: string): T[number] {
  if (typeof value !== "string" || !values.includes(value.toUpperCase())) {
    throw Object.assign(new TypeError(`${field} is unsupported.`), { status: 400, code: "SIGNAL_SCHEMA_INVALID" });
  }
  return value.toUpperCase() as T[number];
}

function metadata(value: unknown): TrustSignalMetadata {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw Object.assign(new TypeError("metadata must be an object."), { status: 400, code: "SIGNAL_METADATA_INVALID" });
  }
  const entries = Object.entries(value);
  if (entries.length > 40) throw Object.assign(new TypeError("metadata has too many fields."), { status: 400, code: "SIGNAL_METADATA_INVALID" });
  const result: TrustSignalMetadata = {};
  for (const [key, item] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key) || prohibitedMetadataKey.test(key)) {
      throw Object.assign(new TypeError(`metadata.${key} is prohibited.`), { status: 400, code: "SIGNAL_METADATA_PROHIBITED" });
    }
    if (Array.isArray(item)) {
      if (item.length > 20 || item.some((entry) => !["string", "number", "boolean"].includes(typeof entry) && entry !== null)) {
        throw Object.assign(new TypeError(`metadata.${key} is invalid.`), { status: 400, code: "SIGNAL_METADATA_INVALID" });
      }
      result[key] = item.map((entry) => typeof entry === "string" ? entry.slice(0, 500) : entry);
    } else if (item === null || ["string", "number", "boolean"].includes(typeof item)) {
      result[key] = typeof item === "string" ? item.slice(0, 500) : item;
    } else {
      throw Object.assign(new TypeError(`metadata.${key} is invalid.`), { status: 400, code: "SIGNAL_METADATA_INVALID" });
    }
  }
  return result;
}

export function validateIdempotencyKey(value: unknown) {
  const key = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:@/-]{7,159}$/.test(key)) {
    throw Object.assign(new TypeError("A valid idempotency key is required."), { status: 400, code: "IDEMPOTENCY_KEY_REQUIRED" });
  }
  return key;
}

export function validateTrustSignal(
  raw: TrustSignalInput,
  context: { tenantId: string; actorId: string; correlationId: string; receivedAt?: string },
): { signal: TrustSignal; idempotencyKey: string } {
  const receivedAt = timestamp(raw.receivedAt, "receivedAt", context.receivedAt ?? new Date().toISOString());
  const observedAt = timestamp(raw.observedAt, "observedAt");
  if (Date.parse(observedAt) > Date.parse(receivedAt) + 300_000) {
    throw Object.assign(new TypeError("observedAt is too far in the future."), { status: 400, code: "SIGNAL_TIMESTAMP_INVALID" });
  }
  const confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw Object.assign(new TypeError("confidence must be between 0 and 1."), { status: 400, code: "SIGNAL_CONFIDENCE_INVALID" });
  }
  const signalId = raw.id === undefined ? crypto.randomUUID() : String(raw.id);
  if (!uuid.test(signalId) || !uuid.test(context.tenantId) || !uuid.test(context.correlationId)) {
    throw Object.assign(new TypeError("Signal, tenant and correlation identifiers must be UUIDs."), { status: 400, code: "SIGNAL_SCHEMA_INVALID" });
  }
  const causationId = raw.causationId ? String(raw.causationId) : null;
  if (causationId && !uuid.test(causationId)) {
    throw Object.assign(new TypeError("causationId must be a UUID."), { status: 400, code: "SIGNAL_SCHEMA_INVALID" });
  }
  const safeMetadata = metadata(raw.metadata);
  const unsigned = {
    id: signalId,
    tenantId: context.tenantId,
    entityId: requiredReference(raw.entityId, "entityId"),
    entityType: enumValue(continuousEntityTypes, raw.entityType, "entityType"),
    signalType: enumValue(trustSignalTypes, raw.signalType, "signalType"),
    source: requiredReference(raw.source, "source"),
    provider: optionalReference(raw.provider, "provider"),
    observedAt,
    receivedAt,
    severity: enumValue(trustSignalSeverities, raw.severity, "severity"),
    confidence,
    status: enumValue(trustSignalStatuses, raw.status, "status"),
    correlationId: context.correlationId,
    causationId,
    metadata: safeMetadata,
    createdAt: receivedAt,
  };
  return {
    signal: {
      ...unsigned,
      fingerprint: hashCanonical({
        tenantId: unsigned.tenantId,
        entityId: unsigned.entityId,
        entityType: unsigned.entityType,
        signalType: unsigned.signalType,
        source: unsigned.source,
        provider: unsigned.provider,
        observedAt: unsigned.observedAt,
        severity: unsigned.severity,
        confidence: unsigned.confidence,
        status: unsigned.status,
        metadata: unsigned.metadata,
      }),
    },
    idempotencyKey: validateIdempotencyKey(raw.idempotencyKey),
  };
}

export function assertSignalSourceAuthorized(
  signal: TrustSignal,
  role: "owner" | "admin" | "reviewer" | "observer",
) {
  if (role === "observer") {
    throw Object.assign(new Error("Observers cannot ingest trust signals."), { status: 403, code: "SIGNAL_SOURCE_DENIED" });
  }
  const source = signal.source.toLowerCase();
  if (signal.signalType === "PROVIDER" || source.startsWith("provider:") || source.startsWith("system:")) {
    throw Object.assign(new Error("Provider and system signals require their signed server-side ingestion path."), { status: 403, code: "SIGNAL_SOURCE_DENIED" });
  }
  if (role === "reviewer" && !["MANUAL_REVIEW", "IDENTITY", "DOCUMENT", "EMAIL", "PHONE"].includes(signal.signalType)) {
    throw Object.assign(new Error("This reviewer role cannot submit the requested signal category."), { status: 403, code: "SIGNAL_SOURCE_DENIED" });
  }
}
