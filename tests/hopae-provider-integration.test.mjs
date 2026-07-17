import assert from "node:assert/strict";
import test from "node:test";
import { HopaeClient } from "../lib/providers/adapters/hopae/hopae-client.ts";
import { inspectHopaeProviderConfig } from "../lib/providers/adapters/hopae/hopae-config.ts";
import { hopaeStatusOutcome, normalizeHopaeIdentityEvidence } from "../lib/providers/adapters/hopae/hopae-normalizer.ts";
import { parseHopaeCallbackPayload } from "../lib/providers/adapters/hopae/hopae-types.ts";
import { ProviderError } from "../lib/providers/errors.ts";

const config = { enabled: true, environment: "sandbox", apiBaseUrl: "https://sandbox.api.hopae.com", clientId: "client", clientSecret: "secret", webhookSecret: "webhook", providerId: "smartid", callbackToleranceSeconds: 300, requestTimeoutMs: 1000, maxRetries: 2 };
const context = { tenantId: "11111111-1111-4111-8111-111111111111", actorId: "actor", trustSessionId: "22222222-2222-4222-8222-222222222222", correlationId: "33333333-3333-4333-8333-333333333333" };

function response(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json", ...headers } });
}

test("Hopae callback parser follows the documented event envelope", () => {
  assert.deepEqual(parseHopaeCallbackPayload({ event: "verification.completed", eventId: "evt_1", timestamp: "2026-07-17T12:00:00.000Z", data: { verificationId: "verification_1", event: { type: "verification.completed" } } }), {
    eventId: "evt_1", eventType: "verification.completed", verificationId: "verification_1", timestamp: "2026-07-17T12:00:00.000Z",
  });
  assert.equal(parseHopaeCallbackPayload({ event: "verification.completed", data: {} }), null);
  assert.equal(parseHopaeCallbackPayload({ event: "verification.unrecognized", eventId: "evt_2", data: { verificationId: "verification_2" } }), null);
});

test("session creation is never blindly retried", async () => {
  let calls = 0;
  const client = new HopaeClient(config, async () => { calls += 1; return response(503, { title: "SYSTEM_INTERNAL_ERROR" }); });
  await assert.rejects(() => client.createVerification({ context, purpose: "identity", redirectUri: "https://example.com/callback", idempotencyKey: "key" }), (error) => error instanceof ProviderError && error.code === "PROVIDER_UNAVAILABLE");
  assert.equal(calls, 1);
});

test("safe retrieval retries 429 and captures provider request ID", async () => {
  let calls = 0;
  const client = new HopaeClient(config, async () => {
    calls += 1;
    if (calls === 1) return response(429, { title: "rate limited" });
    return response(200, { verificationId: "verification_1", status: "awaiting_user_action", providerId: "smartid" }, { "x-request-id": "request-1" });
  });
  const result = await client.getVerification("verification_1", context.correlationId);
  assert.equal(calls, 2);
  assert.equal(result.requestId, "request-1");
  assert.equal(result.verification.status, "awaiting_user_action");
});

test("malformed provider responses fail without inventing session state", async () => {
  const client = new HopaeClient(config, async () => response(200, { status: "completed" }));
  await assert.rejects(() => client.getVerification("verification_1", context.correlationId), (error) => error instanceof ProviderError && error.code === "PROVIDER_INVALID_RESPONSE");
});

test("configuration rejects environment endpoint mismatch and missing server-selected eID", () => {
  const production = inspectHopaeProviderConfig({ HOPAE_ENABLED: "true", HOPAE_ENVIRONMENT: "production", HOPAE_API_BASE_URL: "https://sandbox.api.hopae.com", HOPAE_CLIENT_ID: "client", HOPAE_CLIENT_SECRET: "secret", HOPAE_WEBHOOK_SECRET: "webhook" });
  assert.equal(production.configured, false);
  assert.ok(production.invalid.includes("HOPAE_API_BASE_URL_PRODUCTION_MISMATCH"));
  assert.ok(production.missing.includes("HOPAE_PROVIDER_ID"));
});

test("Hopae normalization emits only genuine identity-session evidence", () => {
  const callback = { provider: "hopae_connect", eventId: "evt_1", eventType: "verification.completed", providerSessionId: "verification_1", providerTimestamp: "2026-07-17T12:00:00.000Z", signatureTimestamp: 1, sourceDigest: "a".repeat(64), payload: {} };
  const [evidence] = normalizeHopaeIdentityEvidence({ callback, context, statusPayload: { verificationId: "verification_1", status: "completed", providerId: "smartid" }, userInfoPayload: { provider_id: "smartid", verification_model: "disclosure", hopae_loa: 3, provenance: { _metadata: { verified_at: "2026-07-17T12:00:00.000Z" } } } });
  assert.equal(evidence.evidenceType, "IDENTITY_SESSION");
  assert.equal(evidence.outcome, "PASSED");
  assert.equal(evidence.assuranceLevel, 3);
  assert.equal(hopaeStatusOutcome("unknown-provider-status"), "UNKNOWN");
  assert.match(JSON.stringify(evidence), /does not synthesize document/);
  assert.doesNotMatch(JSON.stringify(evidence), /access_token|id_token|documentNumber/);
});
