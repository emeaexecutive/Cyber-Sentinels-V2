import { createHmac, timingSafeEqual } from "node:crypto";

export const PUBLIC_WEBHOOK_EVENT_TYPES = [
  "decision.review_required",
  "decision.denied",
  "authority.revoked",
  "trust.material_change",
  "outcome.contradiction",
] as const;

export function signPublicWebhookPayload(payload: Record<string, unknown>, secret: string) {
  const body = JSON.stringify(payload);
  return `t=${payload.timestamp},v1=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

export function verifyPublicWebhookPayload(input: {
  payload: Record<string, unknown>;
  signature: string;
  secret: string;
  now?: number;
  toleranceSeconds?: number;
  seenEventIds?: Set<string>;
}) {
  const match = /^t=([^,]+),v1=([a-f0-9]{64})$/.exec(input.signature);
  if (!match || match[1] !== input.payload.timestamp) return false;
  const occurredAt = Date.parse(String(input.payload.timestamp));
  const tolerance = (input.toleranceSeconds ?? 300) * 1_000;
  if (!Number.isFinite(occurredAt) || Math.abs((input.now ?? Date.now()) - occurredAt) > tolerance) return false;
  const eventId = String(input.payload.event_id ?? "");
  if (!eventId || input.seenEventIds?.has(eventId)) return false;
  const expected = Buffer.from(signPublicWebhookPayload(input.payload, input.secret).split("v1=")[1], "hex");
  const supplied = Buffer.from(match[2], "hex");
  const valid = expected.length === supplied.length && timingSafeEqual(expected, supplied);
  if (valid) input.seenEventIds?.add(eventId);
  return valid;
}
