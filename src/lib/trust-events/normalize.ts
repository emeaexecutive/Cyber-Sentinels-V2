import { normalizeUtcTimestamp } from "./canonicalize.ts";
import { redactSensitiveFields } from "./redaction.ts";
import type { NormalizedProviderEvent, ProviderEnvelope } from "./types.ts";

export function normalizeProviderEvent(event: NormalizedProviderEvent, envelope: ProviderEnvelope, receivedAt: Date) {
  const occurredAt = normalizeUtcTimestamp(event.occurredAt || envelope.occurredAt || receivedAt.toISOString(), "occurredAt");
  return {
    ...event,
    occurredAt,
    normalizedFacts: redactSensitiveFields(event.normalizedFacts) as Record<string, import("./types.ts").JsonValue>,
    reasonCodes: [...new Set(event.reasonCodes)].sort(),
    evidenceReferences: [...new Set(event.evidenceReferences)].sort(),
  };
}
