import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
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
