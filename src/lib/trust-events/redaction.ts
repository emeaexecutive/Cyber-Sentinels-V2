import type { JsonValue } from "./types.ts";

const prohibitedKey = /(access.?token|refresh.?token|authorization|api.?key|client.?secret|webhook.?secret|password|passcode|private.?key|raw.?payload|raw.?proof|prompt|document.?image|biometric|selfie|face.?image)/i;
const allowedScalar = new Set(["string", "number", "boolean"]);

export function redactSensitiveFields(value: unknown, depth = 0): JsonValue {
  if (depth > 8) return "[REDACTED_DEPTH]";
  if (value === null) return null;
  if (allowedScalar.has(typeof value)) {
    if (typeof value === "number" && !Number.isFinite(value)) return null;
    return value as string | number | boolean;
  }
  if (Array.isArray(value)) return value.slice(0, 100).map((entry) => redactSensitiveFields(entry, depth + 1));
  if (!value || typeof value !== "object") return "[REDACTED_UNSUPPORTED]";
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 200).map(([key, entry]) => [key, prohibitedKey.test(key) ? "[REDACTED]" : redactSensitiveFields(entry, depth + 1)]));
}

export function containsProhibitedEvidence(value: unknown) {
  if (!value || typeof value !== "object") return false;
  return Object.keys(value as Record<string, unknown>).some((key) => prohibitedKey.test(key)) || Object.values(value as Record<string, unknown>).some(containsProhibitedEvidence);
}
