import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyTimestampedHmacSha256 } from "../lib/providers/callback-security.ts";
import { ProviderError } from "../lib/providers/errors.ts";
import { buildNormalizedIdentityEvidence } from "../lib/providers/evidence-normalizer.ts";

const rawBody = JSON.stringify({ event: "verification.completed", eventId: "evt_1", data: { verificationId: "verification_1" } });
const secret = "test-webhook-secret";
const now = new Date("2026-07-17T12:00:00.000Z");
const timestamp = Math.floor(now.getTime() / 1000);
const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

test("timestamped HMAC verifies the exact raw body and returns a source digest", () => {
  const result = verifyTimestampedHmacSha256({ provider: "hopae_connect", rawBody, signatureHeader: `t=${timestamp},v1=${signature}`, secret, correlationId: "correlation-1", receivedAt: now });
  assert.equal(result.timestamp, timestamp);
  assert.match(result.sourceDigest, /^[a-f0-9]{64}$/);
});

test("missing, forged, expired, and future callback signatures fail closed", () => {
  for (const input of [
    { signatureHeader: "", receivedAt: now, code: "CALLBACK_SIGNATURE_INVALID" },
    { signatureHeader: `t=${timestamp},v1=${"0".repeat(64)}`, receivedAt: now, code: "CALLBACK_SIGNATURE_INVALID" },
    { signatureHeader: `t=${timestamp},v1=${signature}`, receivedAt: new Date(now.getTime() + 301_000), code: "CALLBACK_TIMESTAMP_INVALID" },
    { signatureHeader: `t=${timestamp},v1=${signature}`, receivedAt: new Date(now.getTime() - 301_000), code: "CALLBACK_TIMESTAMP_INVALID" },
  ]) {
    assert.throws(() => verifyTimestampedHmacSha256({ provider: "hopae_connect", rawBody, signatureHeader: input.signatureHeader, secret, correlationId: "correlation-1", receivedAt: input.receivedAt }), (error) => error instanceof ProviderError && error.code === input.code);
  }
});

test("normalized identity evidence is deterministic, tenant-scoped, and digest-only", () => {
  const callback = { provider: "hopae_connect", eventId: "evt_1", eventType: "verification.completed", providerSessionId: "verification_1", providerTimestamp: now.toISOString(), signatureTimestamp: timestamp, sourceDigest: "a".repeat(64), payload: {} };
  const context = { tenantId: "11111111-1111-4111-8111-111111111111", actorId: "actor-1", trustSessionId: "22222222-2222-4222-8222-222222222222", correlationId: "33333333-3333-4333-8333-333333333333" };
  const first = buildNormalizedIdentityEvidence({ callback, context, evidenceType: "IDENTITY_SESSION", outcome: "PASSED", observedAt: now.toISOString(), mappingVersion: "mapping-1" });
  const second = buildNormalizedIdentityEvidence({ callback, context, evidenceType: "IDENTITY_SESSION", outcome: "PASSED", observedAt: now.toISOString(), mappingVersion: "mapping-1" });
  assert.equal(first.idempotencyKey, second.idempotencyKey);
  assert.equal(first.tenantId, context.tenantId);
  assert.equal(first.sourceDigest, "a".repeat(64));
  assert.equal("rawPayload" in first, false);
});
