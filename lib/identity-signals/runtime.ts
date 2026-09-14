import Stripe from "stripe";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { AdapterContext } from "./types";
import type { ProviderVerificationClient, ProviderVerificationResult } from "./provider-resilience";

export function stripeIdentityConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.STRIPE_SECRET_KEY?.trim() && env.STRIPE_IDENTITY_WEBHOOK_SECRET?.trim());
}

export function personaConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.PERSONA_API_KEY?.trim() && env.PERSONA_WEBHOOK_SECRET?.trim());
}

export function createStripeIdentityClient(options: { secretKey?: string; expectedAccount?: string | null } = {}): ProviderVerificationClient | null {
  const secretKey = options.secretKey ?? process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return null;
  const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });
  return {
    async retrieve(reference: string, context: AdapterContext) {
      const session = await stripe.identity.verificationSessions.retrieve(reference);
      if (options.expectedAccount && session.livemode !== (options.expectedAccount === "live")) throw new Error("STRIPE_ENVIRONMENT_MISMATCH");
      if (session.metadata?.enterprise_id && session.metadata.enterprise_id !== context.enterpriseId) throw new Error("STRIPE_ACCOUNT_BINDING_MISMATCH");
      if (session.metadata?.subject_id && session.metadata.subject_id !== context.subjectId) throw new Error("STRIPE_SUBJECT_BINDING_MISMATCH");
      const verified = session.status === "verified";
      const result: ProviderVerificationResult = {
        provider: "stripe_identity",
        provider_reference: session.id,
        verification_type: session.type,
        identity_subject: session.metadata?.subject_digest ?? context.subjectId,
        credential_type: "stripe_identity_verification_session",
        document_verified: verified,
        liveness_verified: verified,
        biometric_match: verified,
        database_match: null,
        assurance_level: verified ? "HIGH" as const : "LOW" as const,
        provider_outcome: verified ? "VERIFIED" as const : session.status === "requires_input" ? "PENDING" as const : "FAILED" as const,
        provider_reason_codes: [session.status.toUpperCase()],
        verified_at: verified ? new Date(session.created * 1000).toISOString() : null,
        expires_at: null,
        environment: session.livemode ? "production" as const : "sandbox" as const,
        evidence_provenance: "PROVIDER_API" as const,
        account_reference: context.enterpriseId,
      };
      return result;
    },
  };
}

export function verifyStripeWebhookSignature(rawBody: string, signature: string, secret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET): boolean {
  if (!secret || !signature) return false;
  const timestamp = signature.match(/(?:^|,)t=(\d+)/)?.[1];
  const value = signature.match(/(?:^|,)v1=([^,]+)/)?.[1];
  if (!timestamp || !value || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return expected.length === value.length && timingSafeEqual(Buffer.from(expected), Buffer.from(value));
}

export function createPersonaIdentityClient(options: { apiKey?: string; baseUrl?: string } = {}): ProviderVerificationClient | null {
  const apiKey = options.apiKey ?? process.env.PERSONA_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = options.baseUrl ?? process.env.PERSONA_API_BASE_URL ?? "https://withpersona.com/api/v1";
  return {
    async retrieve(reference: string, context: AdapterContext) {
      const response = await fetch(`${baseUrl}/inquiries/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${apiKey}`, "Persona-Version": "2023-01-05" } });
      if (!response.ok) throw new Error(`PERSONA_PROVIDER_${response.status}`);
      const body = await response.json() as Record<string, any>;
      const attributes = body.data?.attributes ?? {};
      if (attributes.account_id && attributes.account_id !== context.enterpriseId) throw new Error("PERSONA_ACCOUNT_BINDING_MISMATCH");
      const verified = attributes.status === "completed" || attributes.inquiry_status === "completed";
      return {
        provider: "persona", provider_reference: String(body.data?.id ?? reference), verification_type: "inquiry", identity_subject: String(attributes.reference_id ?? context.subjectId), credential_type: "persona_inquiry",
        document_verified: verified, liveness_verified: verified, biometric_match: verified, database_match: null, assurance_level: verified ? "HIGH" as const : "LOW" as const,
        provider_outcome: verified ? "VERIFIED" as const : attributes.status === "pending" ? "PENDING" as const : "FAILED" as const,
        provider_reason_codes: [String(attributes.status ?? "UNKNOWN").toUpperCase()], verified_at: verified ? new Date().toISOString() : null, expires_at: null,
        environment: "production" as const, evidence_provenance: "PROVIDER_API" as const, account_reference: context.enterpriseId,
      };
    },
  };
}
