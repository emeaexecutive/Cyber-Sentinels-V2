import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { calculateIdentityConfidence } from "./core";
import type { SignalEvidenceDraft } from "./types";

export async function bridgeHopaeCallbackToIdentity(result: Record<string, unknown>) {
  if (result.duplicate === true || typeof result.correlationId !== "string") return { bridged: false, reason: "not_applicable" };
  const database = createServiceRoleClient();
  const session = await database.from("hopae_verifications").select("verification_id,workspace_id").eq("correlation_id", result.correlationId).maybeSingle();
  if (session.error || !session.data) return { bridged: false, reason: "identity_request_not_linked" };
  const transaction = await database.from("identity_provider_transactions").select("id,enterprise_id,verification_request_id,signal_type").eq("enterprise_id", session.data.workspace_id).eq("provider_id", "hopae_connect").eq("provider_session_id", session.data.verification_id).maybeSingle();
  if (transaction.error) {
    if (transaction.error.code === "42P01") return { bridged: false, reason: "identity_schema_not_deployed" };
    throw transaction.error;
  }
  if (!transaction.data) return { bridged: false, reason: "identity_request_not_linked" };
  const quality = result.evidenceQuality && typeof result.evidenceQuality === "object" ? result.evidenceQuality as Record<string, unknown> : {};
  const accepted = quality.status === "accepted";
  const normalized = await database.from("normalized_identity_evidence").select("source_digest,assurance_level,outcome,expires_at").eq("tenant_id", session.data.workspace_id).eq("provider_session_id", session.data.verification_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const confidence = accepted ? Math.max(60, Math.min(95, Number(normalized.data?.assurance_level ?? 80) * 20)) : 0;
  const outcome = accepted ? "VERIFIED" : "INCONCLUSIVE";
  const observedAt = new Date().toISOString();
  const evidenceUpdate = await database.from("identity_signal_evidence").update({ signal_status: accepted ? "PASS" : "INCONCLUSIVE", outcome, confidence, server_verified: accepted, signature_verified: true, provider_event_id: typeof result.eventId === "string" ? result.eventId : null, provider_reference: session.data.verification_id, payload_hash: normalized.data?.source_digest ?? null, normalized_value: accepted ? { assuranceLevel: Number(normalized.data?.assurance_level ?? 0), providerOutcome: String(normalized.data?.outcome ?? "unknown") } : null, provenance: { source: "signed_callback", mappingVersion: "identity-signal-v1", collectedAt: observedAt }, source_digest: normalized.data?.source_digest ?? null, reason_codes: [accepted ? "HOPAE_SIGNED_CALLBACK_EVIDENCE_ACCEPTED" : "HOPAE_EVIDENCE_QUALITY_NOT_ACCEPTED"], limitations: Array.isArray(quality.limitations) ? quality.limitations : [], expires_at: normalized.data?.expires_at ?? null, observed_at: observedAt }).eq("provider_transaction_id", transaction.data.id);
  if (evidenceUpdate.error) throw evidenceUpdate.error;
  const transactionUpdate = await database.from("identity_provider_transactions").update({ status: accepted ? "SUCCEEDED" : "INCONCLUSIVE", completed_at: new Date().toISOString(), error_code: accepted ? null : "EVIDENCE_QUALITY_NOT_ACCEPTED" }).eq("id", transaction.data.id);
  if (transactionUpdate.error) throw transactionUpdate.error;
  const evidenceRows = await database.from("identity_signal_evidence").select("signal_type,provider_id,signal_status,outcome,confidence,server_verified,signature_verified,provider_event_id,provider_reference,payload_hash,normalized_value,provenance,source_digest,reason_codes,limitations,attributes,observed_at,expires_at").eq("verification_request_id", transaction.data.verification_request_id);
  if (evidenceRows.error) throw evidenceRows.error;
  const drafts = (evidenceRows.data ?? []).map((row) => ({ signalType: row.signal_type, providerId: row.provider_id, status: row.signal_status, outcome: row.outcome, confidence: Number(row.confidence), riskScore: null, riskFlags: [], serverVerified: row.server_verified, signatureVerified: row.signature_verified, providerEventId: row.provider_event_id, providerReference: row.provider_reference, providerTransactionId: row.provider_reference, providerRequestId: null, payloadHash: row.payload_hash, normalizedValue: row.normalized_value, provenance: row.provenance, sourceDigest: row.source_digest, reasonCodes: row.reason_codes, limitations: row.limitations, attributes: row.attributes, observedAt: row.observed_at, expiresAt: row.expires_at })) as SignalEvidenceDraft[];
  const resultConfidence = calculateIdentityConfidence(drafts);
  const identityRequest = await database.from("identity_verification_requests").select("subject_id").eq("id", transaction.data.verification_request_id).single();
  if (identityRequest.error || !identityRequest.data) throw identityRequest.error ?? new Error("Linked identity request is unavailable.");
  const confidenceWrite = await database.from("identity_confidence_results").upsert({ enterprise_id: transaction.data.enterprise_id, subject_id: identityRequest.data.subject_id, verification_request_id: transaction.data.verification_request_id, score: resultConfidence.score, band: resultConfidence.band, status: resultConfidence.status, verified_signal_count: resultConfidence.verifiedSignalCount, total_signal_count: resultConfidence.totalSignalCount, contradiction_count: resultConfidence.contradictionCount, reason_codes: resultConfidence.reasonCodes, methodology_version: resultConfidence.methodologyVersion, computed_at: new Date().toISOString() }, { onConflict: "verification_request_id" });
  if (confidenceWrite.error) throw confidenceWrite.error;
  const requestStatus = drafts.every((draft) => draft.status === "PASS" && draft.serverVerified && draft.signatureVerified) ? "COMPLETED" : "PARTIAL";
  const requestUpdate = await database.from("identity_verification_requests").update({ status: requestStatus, completed_at: observedAt, updated_at: observedAt }).eq("enterprise_id", transaction.data.enterprise_id).eq("id", transaction.data.verification_request_id);
  if (requestUpdate.error) throw requestUpdate.error;
  const audit = await database.from("identity_audit_events").insert({ enterprise_id: transaction.data.enterprise_id, subject_id: identityRequest.data.subject_id, verification_request_id: transaction.data.verification_request_id, actor_type: "PROVIDER", event_type: "HOPAE_IDENTITY_EVIDENCE_BRIDGED", correlation_id: result.correlationId, metadata: { accepted, providerSessionReference: session.data.verification_id } });
  if (audit.error) throw audit.error;
  return { bridged: true, accepted };
}
