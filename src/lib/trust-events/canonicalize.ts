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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hashPattern = /^[a-f0-9]{64}$/;
const referencePattern = /^[A-Za-z0-9][A-Za-z0-9_.:@/-]{0,255}$/;

function assertUnicode(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError("Canonical JSON rejects lone UTF-16 surrogates.");
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) throw new TypeError("Canonical JSON rejects lone UTF-16 surrogates.");
  }
}

function canonicalNumber(value: number) {
  if (!Number.isFinite(value)) throw new TypeError("Canonical JSON rejects non-finite numbers.");
  return Object.is(value, -0) ? "0" : JSON.stringify(value);
}

function serialize(value: unknown, seen: Set<object>): string {
  if (value === null) return "null";
  if (typeof value === "string") { assertUnicode(value); return JSON.stringify(value); }
  if (typeof value === "number") return canonicalNumber(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (["undefined", "function", "symbol", "bigint"].includes(typeof value)) throw new TypeError(`Canonical JSON rejects ${typeof value} values.`);
  if (typeof value !== "object") throw new TypeError("Unsupported canonical JSON value.");
  if (seen.has(value)) throw new TypeError("Canonical JSON rejects cyclic structures.");
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((entry) => serialize(entry, seen)).join(",")}]`;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError("Canonical JSON accepts only plain objects and arrays.");
    return `{${Object.keys(value).sort().map((key) => {
      assertUnicode(key);
      return `${JSON.stringify(key)}:${serialize((value as Record<string, unknown>)[key], seen)}`;
    }).join(",")}}`;
  } finally { seen.delete(value); }
}

export function canonicalizeJson(value: JsonValue | Record<string, unknown>) {
  return serialize(value, new Set());
}

export function normalizeUtcTimestamp(value: string, field = "timestamp") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) throw new TypeError(`${field} must be an ISO 8601 timestamp.`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${field} must be a valid timestamp.`);
  return new Date(milliseconds).toISOString();
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
