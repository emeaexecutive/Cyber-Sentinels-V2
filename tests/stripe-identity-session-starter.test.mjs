import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { startStripeIdentitySession } from "../lib/identity-signals/runtime.ts";
import { StripeIdentityAdapter } from "../lib/identity-signals/provider-resilience.ts";
import { IdentitySignalOrchestrator } from "../lib/identity-signals/orchestrator.ts";

const context = { enterpriseId: "11111111-1111-4111-8111-111111111111", subjectId: "22222222-2222-4222-8222-222222222222", verificationRequestId: "33333333-3333-4333-8333-333333333333", correlationId: "44444444-4444-4444-8444-444444444444", purpose: "employment", input: {} };

test("startStripeIdentitySession invokes the real create method with minimum config and bound, PII-free metadata", async () => {
  const calls = [];
  const result = await startStripeIdentitySession(context, {
    secretKey: "sk_test_fixture",
    createSession: async (params) => { calls.push(params); return { id: "vs_started", client_secret: "vs_started_secret_abc", url: "https://verify.stripe.com/start/abc" }; },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "document");
  assert.deepEqual(calls[0].metadata, { enterprise_id: context.enterpriseId, subject_id: context.subjectId, verification_request_id: context.verificationRequestId });
  assert.equal(Object.keys(calls[0].metadata).length, 3);
  assert.equal(result.providerSessionId, "vs_started");
  assert.equal(result.clientSecret, "vs_started_secret_abc");
  assert.equal(result.url, "https://verify.stripe.com/start/abc");
});

test("Stripe session creation failure fails closed", async () => {
  await assert.rejects(() => startStripeIdentitySession(context, { secretKey: "sk_test_fixture", createSession: async () => { throw new Error("stripe_down"); } }), /stripe_down/);
});

test("a malformed Stripe session response is rejected rather than trusted", async () => {
  await assert.rejects(() => startStripeIdentitySession(context, { secretKey: "sk_test_fixture", createSession: async () => ({ id: "not-a-session-id" }) }));
});

test("missing Stripe secret key fails closed", async () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    await assert.rejects(() => startStripeIdentitySession(context));
  } finally {
    if (originalKey !== undefined) process.env.STRIPE_SECRET_KEY = originalKey;
  }
});

test("StripeIdentityAdapter starts a session when no existing reference is supplied and never embeds client_secret in persisted evidence", async () => {
  const starter = async () => ({ providerSessionId: "vs_new", clientSecret: "vs_new_secret_xyz", url: "https://verify.stripe.com/start/xyz" });
  const adapter = new StripeIdentityAdapter(undefined, starter);
  const result = await adapter.collectSignal("IDENTITY_ASSERTION", context);
  assert.equal(result.transactionStatus, "INCONCLUSIVE");
  assert.equal(result.providerSessionId, "vs_new");
  assert.equal(result.evidence.status, "PENDING");
  assert.equal("decision" in result.evidence, false);
  assert.equal(JSON.stringify(result.evidence).includes("vs_new_secret_xyz"), false);
  assert.deepEqual(result.clientPayload, { clientSecret: "vs_new_secret_xyz", url: "https://verify.stripe.com/start/xyz" });
});

test("StripeIdentityAdapter fails closed when Stripe session creation throws", async () => {
  const starter = async () => { throw new Error("STRIPE_DOWN"); };
  const adapter = new StripeIdentityAdapter(undefined, starter);
  const result = await adapter.collectSignal("IDENTITY_ASSERTION", context);
  assert.equal(result.transactionStatus, "UNAVAILABLE");
  assert.equal(result.errorCode, "STRIPE_SESSION_START_FAILED");
  assert.notEqual(result.evidence.outcome, "VERIFIED");
  assert.equal(result.evidence.serverVerified, false);
});

test("an existing providerReference bypasses the starter and preserves the authoritative retrieval path", async () => {
  let starterCalled = false;
  const starter = async () => { starterCalled = true; return { providerSessionId: "vs_should_not_be_used", clientSecret: null, url: null }; };
  const client = { async retrieve(reference) { return { provider: "stripe_identity", provider_reference: reference, verification_type: "document", identity_subject: "s1", credential_type: "identity_document", document_verified: true, liveness_verified: null, biometric_match: null, database_match: null, assurance_level: "HIGH", provider_outcome: "VERIFIED", provider_reason_codes: ["OK"], verified_at: "2026-01-01T00:00:00.000Z", expires_at: null, environment: "sandbox", evidence_provenance: "PROVIDER_API", account_reference: context.enterpriseId }; } };
  const adapter = new StripeIdentityAdapter(client, starter);
  const result = await adapter.collectSignal("IDENTITY_ASSERTION", { ...context, input: { providerReference: "vs_existing" } });
  assert.equal(starterCalled, false);
  assert.equal(result.evidence.outcome, "VERIFIED");
});

function fakeRepository(saveCollectionImpl) {
  const savedTransactions = [];
  return {
    savedTransactions,
    async findRequest() { return null; },
    async assertSubject() {},
    async createRequest(input) { return { id: "44444444-4444-4444-8444-444444444444", correlation_id: "55555555-5555-4555-8555-555555555555", idempotency_key: input.idempotencyKey, request_hash: input.requestHash }; },
    async saveCollection(input) {
      if (saveCollectionImpl) return saveCollectionImpl(input);
      savedTransactions.push(input.result);
      return input.result.evidence;
    },
    async finalize(input) { return input.confidence; },
    async requestDetails() { return { request: {}, transactions: [], evidence: [], confidence: null }; },
  };
}

const neverSelectedAdapter = {
  providerId: "hopae_connect",
  signals: ["IDENTITY_ASSERTION"],
  async getCapabilities() { return [{ providerId: "hopae_connect", signalType: "IDENTITY_ASSERTION", implementationStatus: "IMPLEMENTED", runtimeStatus: "DISABLED", serverVerified: true, limitations: [] }]; },
  async healthCheck() { return { providerId: "hopae_connect", available: false, state: "DISABLED", reasonCode: "HOPAE_DISABLED", checkedAt: new Date().toISOString() }; },
  async collectSignal() { throw new Error("hopae_connect must not be selected when signalInputs.stripe_identity explicitly requests Stripe"); },
  async verifyCallback() { return []; },
};

test("orchestrator persists Stripe provider_session_id linkage and returns only safe client completion data, never granting ALLOW", async () => {
  const repository = fakeRepository();
  const stripeAdapter = new StripeIdentityAdapter(undefined, async () => ({ providerSessionId: "vs_linked_123", clientSecret: "vs_linked_123_secret", url: "https://verify.stripe.com/start/linked" }));
  const orchestrator = new IdentitySignalOrchestrator({ repository, adapters: [neverSelectedAdapter, stripeAdapter] });
  const result = await orchestrator.execute({ enterpriseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", subjectId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", requestedSignals: ["IDENTITY_ASSERTION"], purpose: "employment", idempotencyKey: "stripe-start-key-001", actorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", signalInputs: { stripe_identity: {} } });
  assert.equal(repository.savedTransactions.length, 1);
  assert.equal(repository.savedTransactions[0].providerSessionId, "vs_linked_123");
  assert.equal(repository.savedTransactions[0].evidence.providerId, "stripe_identity");
  assert.deepEqual(result.providerSessionStarts.stripe_identity, { clientSecret: "vs_linked_123_secret", url: "https://verify.stripe.com/start/linked" });
  assert.equal(result.status, "PARTIAL");
  assert.equal(JSON.stringify(result).includes("vs_linked_123_secret") && JSON.stringify(result.details).includes("vs_linked_123_secret"), false);
  assert.equal(JSON.stringify(result).includes("ALLOW"), false);
});

test("without an explicit stripe_identity selection, default adapter ordering is preserved", async () => {
  const repository = fakeRepository();
  let defaultAdapterCalled = false;
  const defaultAdapter = { providerId: "hopae_connect", signals: ["IDENTITY_ASSERTION"], async getCapabilities() { return [{ providerId: "hopae_connect", signalType: "IDENTITY_ASSERTION", implementationStatus: "IMPLEMENTED", runtimeStatus: "DISABLED", serverVerified: true, limitations: [] }]; }, async healthCheck() { return { providerId: "hopae_connect", available: false, state: "DISABLED", reasonCode: "HOPAE_DISABLED", checkedAt: new Date().toISOString() }; }, async collectSignal(signalType) { defaultAdapterCalled = true; return { transactionStatus: "BLOCKED", errorCode: "HOPAE_DISABLED", limitations: [], evidence: { signalType, providerId: "hopae_connect", status: "BLOCKED", outcome: "BLOCKED", confidence: 0, riskScore: null, riskFlags: [], serverVerified: false, signatureVerified: false, providerEventId: null, providerReference: null, providerTransactionId: null, providerRequestId: null, payloadHash: null, normalizedValue: null, provenance: { source: "none", mappingVersion: "identity-signal-v1", collectedAt: new Date().toISOString() }, reasonCodes: ["HOPAE_DISABLED"], limitations: [], observedAt: new Date().toISOString() } }; }, async verifyCallback() { return []; } };
  const stripeAdapter = new StripeIdentityAdapter(undefined, async () => ({ providerSessionId: "vs_should_not_start", clientSecret: "s", url: null }));
  const orchestrator = new IdentitySignalOrchestrator({ repository, adapters: [defaultAdapter, stripeAdapter] });
  await orchestrator.execute({ enterpriseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", subjectId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", requestedSignals: ["IDENTITY_ASSERTION"], purpose: "employment", idempotencyKey: "stripe-default-key-001", actorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", signalInputs: {} });
  assert.equal(defaultAdapterCalled, true);
});

test("persistence failure after a successful Stripe session start fails the whole request closed", async () => {
  const repository = fakeRepository(async () => { throw new Error("DB_UNAVAILABLE"); });
  const stripeAdapter = new StripeIdentityAdapter(undefined, async () => ({ providerSessionId: "vs_orphan_risk", clientSecret: "secret", url: "https://verify.stripe.com/start/orphan" }));
  const orchestrator = new IdentitySignalOrchestrator({ repository, adapters: [stripeAdapter] });
  await assert.rejects(() => orchestrator.execute({ enterpriseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", subjectId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", requestedSignals: ["IDENTITY_ASSERTION"], purpose: "employment", idempotencyKey: "stripe-persist-fail-001", actorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", signalInputs: { stripe_identity: {} } }), /DB_UNAVAILABLE/);
});

test("existing Stripe Identity webhook binding and unrelated billing webhook remain unmodified", async () => {
  const webhookRoute = await readFile(new URL("../app/api/stripe/identity/webhook/route.ts", import.meta.url), "utf8");
  assert.match(webhookRoute, /lookupStripeIdentitySession/);
  assert.match(webhookRoute, /persistStripeIdentityEvidence/);
  const runtimeSource = await readFile(new URL("../lib/identity-signals/runtime.ts", import.meta.url), "utf8");
  assert.match(runtimeSource, /strictBinding && \(session\.metadata\?\.enterprise_id !== context\.enterpriseId \|\| session\.metadata\?\.subject_id !== context\.subjectId\)/);
  const billingRoute = await readFile(new URL("../app/api/stripe/webhook/route.ts", import.meta.url), "utf8");
  assert.match(billingRoute, /getStripeWebhookSecretEnv/);
  assert.doesNotMatch(billingRoute, /identity_provider_transactions|verificationSessions|identity\/webhook/);
});

test("POST /api/identity/verifications wires signalInputs.stripe_identity and returns only safe completion data", async () => {
  const route = await readFile(new URL("../app/api/identity/verifications/route.ts", import.meta.url), "utf8");
  assert.match(route, /signalInputs\.stripe_identity/);
  assert.match(route, /startStripeIdentitySession/);
  assert.match(route, /providerSessionStarts/);
  assert.doesNotMatch(route, /STRIPE_SECRET_KEY|STRIPE_IDENTITY_WEBHOOK_SECRET/);
});

test("Stripe session metadata construction never includes PII fields", async () => {
  const source = await readFile(new URL("../lib/identity-signals/runtime.ts", import.meta.url), "utf8");
  const metadataBlockMatch = source.match(/metadata:\s*{([^}]*)}/s);
  assert.ok(metadataBlockMatch);
  assert.doesNotMatch(metadataBlockMatch[1], /email|name|ssn|document_number|dob|address/i);
  assert.match(metadataBlockMatch[1], /enterprise_id/);
  assert.match(metadataBlockMatch[1], /subject_id/);
  assert.match(metadataBlockMatch[1], /verification_request_id/);
});
