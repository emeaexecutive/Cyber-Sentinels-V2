import Stripe from "stripe";
import { StripeIdentityAdapter } from "./provider-resilience";
import type { ProviderVerificationClient } from "./provider-resilience";
import type { AdapterContext, SignalEvidenceDraft } from "./types";

export type StripeIdentityWebhookDependencies = {
  secret: () => string;
  liveMode: () => boolean;
  client: () => ProviderVerificationClient;
  lookup: (sessionId: string) => Promise<AdapterContext>;
  reserve: (input: { provider: string; eventId: string; eventType: string; rawBody: string }) => Promise<{ reserved: boolean; status?: string }>;
  complete: (provider: string, eventId: string, status: "processed" | "failed", reason?: string) => Promise<void>;
  persist: (context: AdapterContext, evidence: SignalEvidenceDraft) => Promise<void>;
};

const provider = "stripe_identity";
const supported = new Set(["identity.verification_session.verified", "identity.verification_session.requires_input"]);

export function createStripeIdentityWebhook(deps: StripeIdentityWebhookDependencies) {
  return async function POST(req: Request) {
    const signature = req.headers.get("stripe-signature");
    if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });
    let secret: string;
    let liveMode: boolean;
    try {
      secret = deps.secret();
      liveMode = deps.liveMode();
      if (!secret.trim()) throw new Error("Missing configuration");
    } catch {
      return Response.json({ error: "Identity webhook is not configured" }, { status: 503 });
    }
    let event: Stripe.Event;
    let rawBody: string;
    try {
      if (Number(req.headers.get("content-length")) > 1_000_000) return Response.json({ error: "Payload too large" }, { status: 413 });
      rawBody = await req.text();
      if (Buffer.byteLength(rawBody, "utf8") > 1_000_000) return Response.json({ error: "Payload too large" }, { status: 413 });
      // The SDK verifies the timestamp and signature before parsing the raw JSON.
      event = Stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      return Response.json({ error: "Invalid signature or payload" }, { status: 400 });
    }
    // This destination supports the API key's own account, not Connect/organization events.
    if (!event || event.livemode !== liveMode || event.account || event.context) return Response.json({ error: "Identity environment or account mismatch" }, { status: 400 });
    if (!supported.has(event.type)) return Response.json({ received: true, ignored: true });
    const session = event.data?.object as Stripe.Identity.VerificationSession;
    if (!/^evt_[a-zA-Z0-9]+$/.test(event.id) || session?.object !== "identity.verification_session" || !/^vs_[a-zA-Z0-9]+$/.test(session.id) || session.livemode !== liveMode) {
      return Response.json({ error: "Invalid Identity event" }, { status: 400 });
    }
    let reserved = false;
    try {
      const intake = await deps.reserve({ provider, eventId: event.id, eventType: event.type, rawBody });
      if (!intake.reserved) return intake.status === "processed"
        ? Response.json({ received: true, duplicate: true })
        : Response.json({ error: "Identity event is not completed" }, { status: 503 });
      reserved = true;
      const context = await deps.lookup(session.id);
      const result = await new StripeIdentityAdapter(deps.client()).collectSignal("IDENTITY_ASSERTION", {
        ...context, input: { providerReference: session.id, environment: liveMode ? "production" : "sandbox" },
      });
      if (result.evidence.providerReference !== session.id || result.evidence.normalizedValue?.environment !== (liveMode ? "production" : "sandbox")) throw new Error("Identity binding mismatch");
      // Only normalized evidence crosses persistence. No canonical authority decision is made.
      await deps.persist(context, { ...result.evidence, signatureVerified: true, providerEventId: event.id });
      await deps.complete(provider, event.id, "processed");
      return Response.json({ received: true });
    } catch {
      if (reserved) await deps.complete(provider, event.id, "failed", "identity_processing_failed").catch(() => undefined);
      return Response.json({ error: "Identity webhook processing failed" }, { status: 503 });
    }
  };
}
