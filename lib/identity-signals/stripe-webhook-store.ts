import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { AdapterContext, SignalEvidenceDraft } from "./types";

export async function lookupStripeIdentitySession(sessionId: string): Promise<AdapterContext> {
  const database = createServiceRoleClient();
  const transaction = await database.from("identity_provider_transactions")
    .select("id,enterprise_id,verification_request_id")
    .eq("provider_id", "stripe_identity").eq("signal_type", "IDENTITY_ASSERTION")
    .eq("provider_session_id", sessionId).single();
  if (transaction.error || !transaction.data) throw new Error("Identity session is not linked");
  const request = await database.from("identity_verification_requests")
    .select("id,enterprise_id,subject_id,correlation_id,purpose,status")
    .eq("enterprise_id", transaction.data.enterprise_id).eq("id", transaction.data.verification_request_id).single();
  if (request.error || !request.data || request.data.status === "CANCELLED") throw new Error("Identity request is unavailable");
  return {
    enterpriseId: request.data.enterprise_id, subjectId: request.data.subject_id,
    verificationRequestId: request.data.id, correlationId: request.data.correlation_id,
    purpose: request.data.purpose, input: { transactionId: transaction.data.id },
  };
}

export async function persistStripeIdentityEvidence(context: AdapterContext, evidence: SignalEvidenceDraft) {
  // Append evidence to the existing request; authorization and policy evaluation remain separate.
  const result = await createServiceRoleClient().from("identity_signal_evidence").insert({
    enterprise_id: context.enterpriseId, subject_id: context.subjectId,
    verification_request_id: context.verificationRequestId, provider_transaction_id: context.input.transactionId,
    signal_type: evidence.signalType, provider_id: evidence.providerId,
    signal_status: evidence.status, outcome: evidence.outcome, confidence: evidence.confidence,
    server_verified: evidence.serverVerified, signature_verified: evidence.signatureVerified,
    provider_event_id: evidence.providerEventId, provider_reference: evidence.providerReference,
    payload_hash: evidence.payloadHash, normalized_value: evidence.normalizedValue,
    provenance: evidence.provenance, source_digest: evidence.sourceDigest,
    reason_codes: evidence.reasonCodes, limitations: evidence.limitations,
    attributes: evidence.attributes ?? {}, observed_at: evidence.observedAt, expires_at: evidence.expiresAt ?? null,
  });
  if (result.error) throw new Error("Identity evidence persistence failed");
}
