import { getStripeIdentityWebhookSecretEnv, getStripeSecretKeyEnv } from "@/lib/env";
import { createStripeIdentityClient } from "@/lib/identity-signals/runtime";
import { createStripeIdentityWebhook } from "@/lib/identity-signals/stripe-webhook";
import { lookupStripeIdentitySession, persistStripeIdentityEvidence } from "@/lib/identity-signals/stripe-webhook-store";
import { completeWebhookEvent, reserveWebhookEvent } from "@/lib/webhooks/event-ledger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function liveMode() {
  const key = getStripeSecretKeyEnv("Stripe Identity webhook").trim();
  if (!/^(sk|rk)_(test|live)_/.test(key)) throw new Error("Unknown Stripe environment");
  return /^(sk|rk)_live_/.test(key);
}

export const POST = createStripeIdentityWebhook({
  secret: () => getStripeIdentityWebhookSecretEnv("Stripe Identity webhook"),
  liveMode,
  client: () => {
    const client = createStripeIdentityClient({ expectedAccount: liveMode() ? "live" : "test", strictBinding: true });
    if (!client) throw new Error("Stripe Identity is not configured");
    return client;
  },
  lookup: lookupStripeIdentitySession,
  persist: persistStripeIdentityEvidence,
  reserve: reserveWebhookEvent,
  complete: completeWebhookEvent,
});
