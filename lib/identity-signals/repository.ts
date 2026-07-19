import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { AdapterCollectionResult, ConfidenceResult, IdentitySignalType } from "./types";

function databaseFailure(operation: string, error: { message?: string; code?: string } | null) {
  const detail = error?.code === "42P01" ? "Identity Signal Engine migration is not deployed." : error?.message ?? "Unknown database error.";
  const failure = new Error(`${operation} failed. ${detail}`) as Error & { code?: string };
  failure.code = error?.code;
  return failure;
}

export function identityRepository() {
  const database = createServiceRoleClient();
  return {
    async createSubject(input: { enterpriseId: string; subjectType: string; displayLabel?: string | null; externalReferenceHash?: string | null; metadata?: Record<string, unknown>; actorId: string; correlationId: string }) {
      const result = await database.from("identity_subjects").insert({ enterprise_id: input.enterpriseId, subject_type: input.subjectType, display_label: input.displayLabel ?? null, external_reference_hash: input.externalReferenceHash ?? null, metadata: input.metadata ?? {}, created_by: input.actorId }).select("*").single();
      if (result.error || !result.data) throw databaseFailure("Identity subject creation", result.error);
      const audit = await database.from("identity_audit_events").insert({ enterprise_id: input.enterpriseId, subject_id: result.data.id, actor_id: input.actorId, actor_type: "USER", event_type: "IDENTITY_SUBJECT_CREATED", correlation_id: input.correlationId, metadata: { subjectType: input.subjectType } });
      if (audit.error) throw databaseFailure("Identity subject audit persistence", audit.error);
      return result.data;
    },
    async findRequest(enterpriseId: string, idempotencyKey: string, operation = "identity_verification") {
      const result = await database.from("identity_verification_requests").select("*").eq("enterprise_id", enterpriseId).eq("operation", operation).eq("idempotency_key", idempotencyKey).maybeSingle();
      if (result.error) throw databaseFailure("Idempotency lookup", result.error);
      return result.data;
    },
    async assertSubject(enterpriseId: string, subjectId: string) {
      const result = await database.from("identity_subjects").select("id").eq("enterprise_id", enterpriseId).eq("id", subjectId).maybeSingle();
      if (result.error) throw databaseFailure("Identity subject lookup", result.error);
      if (!result.data) {
        const missing = new Error("Subject is unknown or outside the selected enterprise.") as Error & { status?: number; code?: string };
        missing.status = 404; missing.code = "SUBJECT_NOT_FOUND"; throw missing;
      }
    },
    async createRequest(input: { enterpriseId: string; subjectId: string; requestedSignals: IdentitySignalType[]; purpose: string; operation: "identity_verification"; idempotencyKey: string; requestHash: string; actorId: string; correlationId?: string }) {
      const result = await database.from("identity_verification_requests").insert({ enterprise_id: input.enterpriseId, subject_id: input.subjectId, operation: input.operation, requested_signals: input.requestedSignals, purpose: input.purpose, status: "RUNNING", idempotency_key: input.idempotencyKey, request_hash: input.requestHash, requested_by: input.actorId, ...(input.correlationId ? { correlation_id: input.correlationId } : {}), started_at: new Date().toISOString() }).select("*").single();
      if (result.error || !result.data) throw databaseFailure("Identity verification request creation", result.error);
      const audit = await database.from("identity_audit_events").insert({ enterprise_id: input.enterpriseId, subject_id: input.subjectId, verification_request_id: result.data.id, actor_id: input.actorId, actor_type: "USER", event_type: "IDENTITY_VERIFICATION_STARTED", correlation_id: result.data.correlation_id, metadata: { requestedSignals: input.requestedSignals, purpose: input.purpose } });
      if (audit.error) throw databaseFailure("Identity verification start audit persistence", audit.error);
      return result.data;
    },
    async saveCollection(input: { enterpriseId: string; subjectId: string; requestId: string; result: AdapterCollectionResult; latencyMs: number }) {
      const transaction = await database.from("identity_provider_transactions").insert({ enterprise_id: input.enterpriseId, verification_request_id: input.requestId, provider_id: input.result.evidence.providerId, signal_type: input.result.evidence.signalType, provider_session_id: input.result.providerSessionId ?? input.result.evidence.providerReference, provider_request_id: input.result.providerRequestId ?? input.result.evidence.providerRequestId, provider_event_id: input.result.providerEventId ?? input.result.evidence.providerEventId, provider_transaction_id: input.result.providerTransactionId ?? input.result.evidence.providerTransactionId, payload_hash: input.result.evidence.payloadHash, status: input.result.transactionStatus, completed_at: new Date().toISOString(), latency_ms: input.latencyMs, error_code: input.result.errorCode ?? null, limitations: input.result.limitations }).select("id").single();
      if (transaction.error || !transaction.data) throw databaseFailure("Provider transaction persistence", transaction.error);
      const evidence = input.result.evidence;
      const saved = await database.from("identity_signal_evidence").insert({ enterprise_id: input.enterpriseId, subject_id: input.subjectId, verification_request_id: input.requestId, provider_transaction_id: transaction.data.id, signal_type: evidence.signalType, provider_id: evidence.providerId, signal_status: evidence.status, outcome: evidence.outcome, confidence: evidence.confidence, server_verified: evidence.serverVerified, signature_verified: evidence.signatureVerified, provider_event_id: evidence.providerEventId, provider_reference: evidence.providerReference, payload_hash: evidence.payloadHash, normalized_value: evidence.normalizedValue, provenance: evidence.provenance, source_digest: evidence.sourceDigest ?? null, reason_codes: evidence.reasonCodes, limitations: evidence.limitations, attributes: evidence.attributes ?? {}, observed_at: evidence.observedAt, expires_at: evidence.expiresAt ?? null }).select("*").single();
      if (saved.error || !saved.data) throw databaseFailure("Identity evidence persistence", saved.error);
      return saved.data;
    },
    async finalize(input: { enterpriseId: string; subjectId: string; requestId: string; correlationId: string; actorId: string; requestStatus: "COMPLETED" | "PARTIAL"; confidence: ConfidenceResult }) {
      const confidence = await database.from("identity_confidence_results").upsert({ enterprise_id: input.enterpriseId, subject_id: input.subjectId, verification_request_id: input.requestId, score: input.confidence.score, band: input.confidence.band, status: input.confidence.status, verified_signal_count: input.confidence.verifiedSignalCount, total_signal_count: input.confidence.totalSignalCount, contradiction_count: input.confidence.contradictionCount, reason_codes: input.confidence.reasonCodes, methodology_version: input.confidence.methodologyVersion }, { onConflict: "verification_request_id" }).select("*").single();
      if (confidence.error || !confidence.data) throw databaseFailure("Identity confidence persistence", confidence.error);
      const update = await database.from("identity_verification_requests").update({ status: input.requestStatus, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("enterprise_id", input.enterpriseId).eq("id", input.requestId);
      if (update.error) throw databaseFailure("Identity verification finalization", update.error);
      const audit = await database.from("identity_audit_events").insert({ enterprise_id: input.enterpriseId, subject_id: input.subjectId, verification_request_id: input.requestId, actor_id: input.actorId, actor_type: "SYSTEM", event_type: "IDENTITY_VERIFICATION_COMPLETED", correlation_id: input.correlationId, metadata: { requestStatus: input.requestStatus, confidenceStatus: input.confidence.status, score: input.confidence.score } });
      if (audit.error) throw databaseFailure("Identity verification completion audit persistence", audit.error);
      return confidence.data;
    },
    async requestDetails(enterpriseId: string, requestId: string) {
      const [request, transactions, evidence, confidence] = await Promise.all([
        database.from("identity_verification_requests").select("*").eq("enterprise_id", enterpriseId).eq("id", requestId).maybeSingle(),
        database.from("identity_provider_transactions").select("*").eq("enterprise_id", enterpriseId).eq("verification_request_id", requestId).order("created_at"),
        database.from("identity_signal_evidence").select("*").eq("enterprise_id", enterpriseId).eq("verification_request_id", requestId).order("created_at"),
        database.from("identity_confidence_results").select("*").eq("enterprise_id", enterpriseId).eq("verification_request_id", requestId).maybeSingle(),
      ]);
      if (request.error || transactions.error || evidence.error || confidence.error) throw databaseFailure("Identity verification retrieval", request.error ?? transactions.error ?? evidence.error ?? confidence.error);
      if (!request.data) return null;
      return { request: request.data, transactions: transactions.data ?? [], evidence: evidence.data ?? [], confidence: confidence.data };
    },
    async dashboardSnapshot(enterpriseId: string, page: number, pageSize: number) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const [requests, subjectCount] = await Promise.all([
        database.from("identity_verification_requests")
          .select("id,subject_id,status,purpose,requested_signals,created_at,updated_at,completed_at", { count: "exact" })
          .eq("enterprise_id", enterpriseId)
          .order("updated_at", { ascending: false })
          .range(from, to),
        database.from("identity_subjects").select("id", { count: "exact", head: true }).eq("enterprise_id", enterpriseId),
      ]);
      if (requests.error || subjectCount.error) throw databaseFailure("Identity dashboard retrieval", requests.error ?? subjectCount.error);
      const requestRows = requests.data ?? [];
      if (!requestRows.length) return { requests: [], total: requests.count ?? 0, subjectCount: subjectCount.count ?? 0, page, pageSize };
      const requestIds = requestRows.map((row) => row.id);
      const subjectIds = [...new Set(requestRows.map((row) => row.subject_id))];
      const [subjects, evidence, confidence, transactions] = await Promise.all([
        database.from("identity_subjects").select("id,subject_type,display_label").eq("enterprise_id", enterpriseId).in("id", subjectIds),
        database.from("identity_signal_evidence").select("verification_request_id,signal_status,outcome,server_verified,signature_verified,provider_reference,provider_transaction_id,source_digest,reason_codes").eq("enterprise_id", enterpriseId).in("verification_request_id", requestIds),
        database.from("identity_confidence_results").select("verification_request_id,score,status,verified_signal_count,total_signal_count,reason_codes,computed_at").eq("enterprise_id", enterpriseId).in("verification_request_id", requestIds),
        database.from("identity_provider_transactions").select("verification_request_id,error_code,status,completed_at").eq("enterprise_id", enterpriseId).in("verification_request_id", requestIds),
      ]);
      if (subjects.error || evidence.error || confidence.error || transactions.error) throw databaseFailure("Identity dashboard evidence retrieval", subjects.error ?? evidence.error ?? confidence.error ?? transactions.error);
      const rows = requestRows.map((request) => {
        const requestEvidence = (evidence.data ?? []).filter((row) => row.verification_request_id === request.id);
        const requestTransactions = (transactions.data ?? []).filter((row) => row.verification_request_id === request.id);
        return {
          ...request,
          subject: (subjects.data ?? []).find((row) => row.id === request.subject_id) ?? null,
          evidence: requestEvidence,
          confidence: (confidence.data ?? []).find((row) => row.verification_request_id === request.id) ?? null,
          providerErrors: requestTransactions.filter((row) => Boolean(row.error_code)).map((row) => row.error_code),
        };
      });
      return { requests: rows, total: requests.count ?? rows.length, subjectCount: subjectCount.count ?? 0, page, pageSize };
    },
    async subjectSignals(enterpriseId: string, subjectId: string) {
      const result = await database.from("identity_signal_evidence").select("*").eq("enterprise_id", enterpriseId).eq("subject_id", subjectId).order("observed_at", { ascending: false }).limit(200);
      if (result.error) throw databaseFailure("Identity signals retrieval", result.error);
      return result.data ?? [];
    },
    async subjectConfidence(enterpriseId: string, subjectId: string) {
      const result = await database.from("identity_confidence_results").select("*").eq("enterprise_id", enterpriseId).eq("subject_id", subjectId).order("computed_at", { ascending: false }).limit(1).maybeSingle();
      if (result.error) throw databaseFailure("Identity confidence retrieval", result.error);
      return result.data;
    },
    async capabilities(enterpriseId?: string) {
      const query = database.from("identity_provider_capabilities").select("*");
      const scoped = enterpriseId ? query.or(`enterprise_id.is.null,enterprise_id.eq.${enterpriseId}`) : query.is("enterprise_id", null);
      const result = await scoped.order("provider_id").order("signal_type");
      if (result.error) throw databaseFailure("Provider capability retrieval", result.error);
      return result.data ?? [];
    },
    async providerRuntimeEvidence(enterpriseId: string) {
      const [registry, transactions, evidence, executions] = await Promise.all([
        database.from("provider_registry").select("provider_id,enabled,configured_state,health_status,last_successful_call,last_failed_call,last_health_check"),
        database.from("identity_provider_transactions").select("id,provider_id,provider_session_id,provider_transaction_id,status,error_code,limitations,created_at").eq("enterprise_id", enterpriseId).order("created_at", { ascending: false }).limit(200),
        database.from("identity_signal_evidence").select("provider_id,provider_transaction_id,provider_reference,signal_status,outcome,server_verified,signature_verified,source_digest,reason_codes,created_at").eq("enterprise_id", enterpriseId).order("created_at", { ascending: false }).limit(200),
        database.from("provider_execution_records").select("provider_id,provider_session_id,status,signature_status,idempotency_status,normalized_evidence_reference,updated_at").eq("tenant_id", enterpriseId).order("updated_at", { ascending: false }).limit(200),
      ]);
      if (registry.error || transactions.error || evidence.error || executions.error) throw databaseFailure("Provider runtime truth retrieval", registry.error ?? transactions.error ?? evidence.error ?? executions.error);
      return { registry: registry.data ?? [], transactions: transactions.data ?? [], evidence: evidence.data ?? [], executions: executions.data ?? [] };
    },
  };
}

export type IdentityRepository = ReturnType<typeof identityRepository>;
