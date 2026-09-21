import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import Stripe from "stripe";
import { readFileSync } from "node:fs";
import { createStripeIdentityWebhook } from "../lib/identity-signals/stripe-webhook.ts";
import { createPersonaIdentityClient, createStripeIdentityClient, personaConfigured, stripeIdentityConfigured, verifyStripeWebhookSignature } from "../lib/identity-signals/runtime.ts";

test("provider runtime is credential gated", () => {
  assert.equal(stripeIdentityConfigured({}), false);
  assert.equal(personaConfigured({}), false);
  assert.equal(createStripeIdentityClient({}), null);
  assert.equal(createPersonaIdentityClient({}), null);
});

test("Stripe webhook signature accepts valid timestamped signatures and rejects invalid ones", () => {
  const body = JSON.stringify({ id: "evt_identity" });
  const secret = "whsec_identity_test";
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
  assert.equal(verifyStripeWebhookSignature(body, signature, secret), true);
  assert.equal(verifyStripeWebhookSignature(body, "t=1,v1=bad", secret), false);
  assert.equal(verifyStripeWebhookSignature(body, signature, "wrong"), false);
});

test("runtime credentials are never printed or embedded in normalized evidence", () => {
  const source = JSON.stringify({ stripe: process.env.STRIPE_SECRET_KEY ?? null, persona: process.env.PERSONA_API_KEY ?? null });
  assert.equal(source.includes("sk_live_"), false);
  assert.equal(source.includes("raw_document"), false);
});

const identitySecret = "whsec_identity_fixture";
const binding = { enterpriseId: "enterprise-1", subjectId: "subject-1", verificationRequestId: "request-1", correlationId: "correlation-1", purpose: "identity", input: { transactionId: "transaction-1" } };
function webhookFixture(options = {}) {
  const saved = [], fetched = [], ledger = new Map();
  let lookups = 0;
  const session = {
    id: "vs_fixture", object: "identity.verification_session", livemode: false, type: "document",
    status: "verified", created: Math.floor(Date.now() / 1000),
    metadata: { enterprise_id: binding.enterpriseId, subject_id: binding.subjectId, subject_digest: "private@example.com" },
    verified_outputs: { first_name: "PRIVATE_NAME", id_number: "PRIVATE_DOCUMENT" },
    document: "PRIVATE_IMAGE", selfie: "PRIVATE_SELFIE", biometric_data: "PRIVATE_BIOMETRIC",
    ...options.session,
  };
  const client = createStripeIdentityClient({ secretKey: "sk_test_fixture", expectedAccount: "test", strictBinding: true,
    retrieveSession: async (id) => { fetched.push(id); if (options.fetchFailure) throw new Error("PRIVATE_ERROR"); return session; },
  });
  const post = createStripeIdentityWebhook({
    secret: () => options.secret ?? identitySecret, liveMode: () => false, client: () => client,
    lookup: async () => { lookups++; if (options.unlinked) throw new Error("Unknown session"); return binding; },
    reserve: async ({ provider, eventId, rawBody }) => {
      assert.equal(provider, "stripe_identity");
      assert.equal(typeof rawBody, "string");
      if (options.ledgerFailure) throw new Error("Ledger unavailable");
      if (ledger.has(eventId)) return { reserved: false, status: ledger.get(eventId) };
      ledger.set(eventId, "processing"); return { reserved: true };
    },
    complete: async (_, id, status) => { ledger.set(id, status); },
    persist: async (context, evidence) => { assert.deepEqual(context, binding); if (options.persistFailure) throw new Error("Persistence failed"); saved.push(evidence); },
  });
  const event = { id: "evt_fixture", type: "identity.verification_session.verified", livemode: false, data: { object: { ...session, status: "verified" } }, ...options.event };
  const body = JSON.stringify(event, null, 2);
  function request(signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: identitySecret })) {
    return new Request("https://example.test/api/stripe/identity/webhook", { method: "POST", body, headers: signature === null ? {} : { "Stripe-Signature": signature } });
  }
  return { post, request, body, saved, fetched, ledger, lookups: () => lookups };
}

test("Identity verified event fetches authoritative evidence without producing ALLOW or raw PII", async () => {
  const f = webhookFixture();
  const response = await f.post(f.request());
  assert.equal(response.status, 200);
  assert.deepEqual(f.fetched, ["vs_fixture"]);
  assert.equal(f.saved[0].outcome, "VERIFIED");
  assert.equal(f.saved[0].signatureVerified, true);
  assert.equal(f.saved[0].normalizedValue.evidenceProvenance, "PROVIDER_API");
  assert.equal(f.saved[0].normalizedValue.livenessVerified, null);
  assert.equal(f.saved[0].normalizedValue.biometricMatch, null);
  assert.match(f.saved[0].limitations.join(" "), /does not authorize/);
  assert.doesNotMatch(JSON.stringify(f.saved), /PRIVATE_|private@example|ALLOW|verified_outputs|biometric_data/);
  assert.deepEqual(await response.json(), { received: true });
});

test("Identity requires_input event normalizes to pending, inconclusive evidence", async () => {
  const f = webhookFixture({ session: { status: "requires_input" }, event: { type: "identity.verification_session.requires_input" } });
  assert.equal((await f.post(f.request())).status, 200);
  assert.equal(f.saved[0].status, "PENDING");
  assert.equal(f.saved[0].outcome, "INCONCLUSIVE");
  assert.equal(f.saved[0].normalizedValue.providerOutcome, "PENDING");
});

test("Identity does not trust a verified event snapshot when the authoritative session requires input", async () => {
  const f = webhookFixture({ session: { status: "requires_input" } });
  assert.equal((await f.post(f.request())).status, 200);
  assert.equal(f.saved[0].outcome, "INCONCLUSIVE");
});

for (const [name, signature] of [["missing", null], ["invalid", "t=1,v1=bad"]]) {
  test(`Identity rejects ${name} signature before lookup, ledger or fetch`, async () => {
    const f = webhookFixture();
    assert.equal((await f.post(f.request(signature))).status, 400);
    assert.equal(f.lookups(), 0); assert.equal(f.ledger.size, 0); assert.equal(f.fetched.length, 0);
  });
}

test("Identity rejects billing secret, stale signatures and raw-body tampering", async () => {
  for (const settings of [{ secret: "whsec_billing" }, { timestamp: 1 }, { payload: "{}" }]) {
    const f = webhookFixture();
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: f.body, secret: identitySecret, ...settings });
    assert.equal((await f.post(f.request(signature))).status, 400);
    assert.equal(f.ledger.size, 0);
  }
});

test("Identity duplicates are acknowledged only after processing and never persisted twice", async () => {
  const f = webhookFixture();
  assert.equal((await f.post(f.request())).status, 200);
  assert.deepEqual(await (await f.post(f.request())).json(), { received: true, duplicate: true });
  assert.equal(f.saved.length, 1); assert.equal(f.fetched.length, 1);
  f.ledger.set("evt_fixture", "processing");
  assert.equal((await f.post(f.request())).status, 503);
});

for (const [name, options] of [
  ["event environment", { event: { livemode: true } }],
  ["connected account", { event: { account: "acct_other" } }],
  ["organization account", { event: { context: "acct_other" } }],
  ["session environment", { session: { livemode: true } }],
  ["unlinked session", { unlinked: true }],
  ["enterprise binding", { session: { metadata: { enterprise_id: "wrong", subject_id: binding.subjectId } } }],
  ["subject binding", { session: { metadata: { enterprise_id: binding.enterpriseId, subject_id: "wrong" } } }],
  ["missing binding", { session: { metadata: {} } }],
  ["request binding", { session: { metadata: { enterprise_id: binding.enterpriseId, subject_id: binding.subjectId, verification_request_id: "wrong" } } }],
  ["authoritative session", { session: { id: "vs_other" }, event: { data: { object: { id: "vs_fixture", object: "identity.verification_session", livemode: false } } } }],
  ["authoritative environment", { session: { livemode: true }, event: { data: { object: { id: "vs_fixture", object: "identity.verification_session", livemode: false } } } }],
  ["fetch failure", { fetchFailure: true }], ["ledger failure", { ledgerFailure: true }], ["persistence failure", { persistFailure: true }],
]) {
  test(`Identity fails closed on ${name}`, async () => {
    const f = webhookFixture(options);
    assert.ok((await f.post(f.request())).status >= 400);
    assert.equal(f.saved.length, 0);
    if (f.ledger.get("evt_fixture") === "failed") assert.equal((await f.post(f.request())).status, 503);
  });
}

test("Identity missing secret is unavailable; billing events are ignored", async () => {
  const missing = webhookFixture({ secret: "" });
  assert.equal((await missing.post(missing.request())).status, 503);
  const billing = webhookFixture({ event: { type: "checkout.session.completed" } });
  assert.deepEqual(await (await billing.post(billing.request())).json(), { received: true, ignored: true });
  assert.equal(billing.ledger.size, 0);
});

test("Identity persistence and ledger retain normalized fields and hashes only", () => {
  const store = readFileSync(new URL("../lib/identity-signals/stripe-webhook-store.ts", import.meta.url), "utf8");
  const ledger = readFileSync(new URL("../lib/webhooks/event-ledger.ts", import.meta.url), "utf8");
  assert.doesNotMatch(store, /rawBody|verified_outputs|selfie|biometric_data|canonical|ALLOW/);
  assert.match(ledger, /payload_hash: webhookPayloadHash\(input.rawBody\)/);
  assert.doesNotMatch(ledger, /raw_body:|payload: input.rawBody/);
  const route = readFileSync(new URL("../app/api/stripe/identity/webhook/route.ts", import.meta.url), "utf8");
  assert.match(route, /getStripeIdentityWebhookSecretEnv/);
  assert.doesNotMatch(route, /getStripeWebhookSecretEnv|billing/);
});
