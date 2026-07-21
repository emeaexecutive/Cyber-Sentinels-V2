import {
  TRUST_EVENT_CANONICALIZATION,
  TRUST_EVENT_HASH_ALGORITHM,
  TRUST_EVENT_SCHEMA_VERSION,
  providerProtocols,
  trustEventActorTypes,
  trustEventSubjectTypes,
  type CanonicalTrustEvent,
  type JsonValue,
  type UnsignedTrustEvent,
} from "./types.ts";
import { assertTrustEventType } from "./event-types.ts";
import { canonicalize as canonicalizeCore } from "../trust-core/canonicalize.ts";
import { normalizeUtcTimestamp as normalizeCoreTimestamp } from "../trust-core/time.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hashPattern = /^[a-f0-9]{64}$/;
const referencePattern = /^[A-Za-z0-9][A-Za-z0-9_.:@/-]{0,255}$/;

export function canonicalizeJson(value: JsonValue | Record<string, unknown>) {
  return canonicalizeCore(value);
}

export function normalizeUtcTimestamp(value: string, field = "timestamp") {
  return normalizeCoreTimestamp(value, field);
}

function assertReference(value: unknown, field: string) {
  if (typeof value !== "string" || !referencePattern.test(value)) throw new TypeError(`${field} is invalid.`);
}

function assertOptionalReference(value: unknown, field: string) {
  if (value !== null) assertReference(value, field);
}

function assertFacts(value: unknown): asserts value is Record<string, JsonValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("normalizedFacts must be an object.");
  canonicalizeJson(value as Record<string, unknown>);
}

export function normalizeTrustEvent(event: UnsignedTrustEvent): UnsignedTrustEvent {
  if (!uuidPattern.test(event.eventId) || !uuidPattern.test(event.enterpriseId)) throw new TypeError("eventId and enterpriseId must be UUIDs.");
  if (event.schemaVersion !== TRUST_EVENT_SCHEMA_VERSION) throw new TypeError("Unsupported Trust Event schema version.");
  assertTrustEventType(event.eventType);
  if (!trustEventSubjectTypes.includes(event.subject?.type)) throw new TypeError("Unsupported subject type.");
  if (!trustEventActorTypes.includes(event.actor?.type)) throw new TypeError("Unsupported actor type.");
  assertReference(event.subject?.id, "subject.id"); assertReference(event.actor?.id, "actor.id");
  for (const [field, reference, type] of [["workflow", event.workflow, "WORKFLOW"], ["session", event.session, "SESSION"], ["authority", event.authority, "AUTHORITY"]] as const) {
    if (reference !== null) { if (reference?.type !== type) throw new TypeError(`${field}.type is invalid.`); assertReference(reference.id, `${field}.id`); }
  }
  if (!providerProtocols.includes(event.provider.protocol)) throw new TypeError("Unsupported provider protocol.");
  assertReference(event.provider.key, "provider.key");
  if (typeof event.provider.serverVerified !== "boolean") throw new TypeError("provider.serverVerified must be boolean.");
  assertOptionalReference(event.provider.eventId, "provider.eventId");
  assertOptionalReference(event.provider.transactionId, "provider.transactionId");
  assertOptionalReference(event.provider.deliveryId, "provider.deliveryId");
  assertFacts(event.normalizedFacts);
  if (!Array.isArray(event.reasonCodes) || event.reasonCodes.length > 256 || !event.reasonCodes.every((item) => typeof item === "string" && referencePattern.test(item))) throw new TypeError("reasonCodes are invalid.");
  if (!Array.isArray(event.evidenceReferences) || event.evidenceReferences.length > 256 || !event.evidenceReferences.every((item) => typeof item === "string" && referencePattern.test(item))) throw new TypeError("evidenceReferences are invalid.");
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 1) throw new TypeError("sequence must be a positive safe integer.");
  if (event.previousHash !== null && !hashPattern.test(event.previousHash)) throw new TypeError("previousHash is invalid.");
  if (event.eventHash !== undefined && !hashPattern.test(event.eventHash)) throw new TypeError("eventHash is invalid.");
  if (!event.ordering || typeof event.ordering !== "object" || typeof event.ordering.late !== "boolean") throw new TypeError("ordering metadata is invalid.");
  if (event.ordering.supersedesEventId !== null && !uuidPattern.test(event.ordering.supersedesEventId)) throw new TypeError("ordering.supersedesEventId is invalid.");
  if (event.ordering.providerSequence !== null && (!Number.isSafeInteger(event.ordering.providerSequence) || event.ordering.providerSequence < 0)) throw new TypeError("ordering.providerSequence is invalid.");
  if (event.canonicalization !== TRUST_EVENT_CANONICALIZATION || event.hashAlgorithm !== TRUST_EVENT_HASH_ALGORITHM) throw new TypeError("Integrity algorithm metadata is invalid.");
  return { ...event, occurredAt: normalizeUtcTimestamp(event.occurredAt, "occurredAt"), receivedAt: normalizeUtcTimestamp(event.receivedAt, "receivedAt"), reasonCodes: [...new Set(event.reasonCodes)].sort(), evidenceReferences: [...new Set(event.evidenceReferences)].sort() };
}

export function canonicalizeTrustEvent(event: UnsignedTrustEvent | CanonicalTrustEvent) {
  const normalized = normalizeTrustEvent(event);
  const hashPayload = { ...normalized } as Record<string, unknown>;
  delete hashPayload.eventHash;
  return canonicalizeJson(hashPayload as unknown as Record<string, unknown>);
}
