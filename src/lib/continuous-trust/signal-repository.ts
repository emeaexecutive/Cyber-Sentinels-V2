import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CanonicalTrustEvent } from "../trust-events/types.ts";
import type { TrustDecisionContract } from "../trust-architecture/decision-contracts.ts";
import type { TrustStateDecision } from "../trust-state/types.ts";
import type {
  SignalDrift,
  SignalIngestionResult,
  SignalPolicyDecision,
  TrustSignal,
  TrustSignalProcessingStatus,
} from "./signal-types.ts";
import { normalizeTrustAlert } from "./alert-contract.ts";

function failure(operation: string, error: unknown): never {
  const candidate = error as { code?: string; message?: string };
  console.error("Continuous Trust signal persistence failed.", {
    operation,
    code: candidate.code ?? "UNKNOWN",
  });
  const message = candidate.message ?? "";
  if (/entity is unavailable/i.test(message)) {
    throw Object.assign(new Error("The requested trust entity was not found in this tenant."), {
      status: 404,
      code: "TRUST_ENTITY_NOT_FOUND",
    });
  }
  if (/idempotency key conflicts/i.test(message)) {
    throw Object.assign(new Error("The idempotency key was already used for different content."), {
      status: 409,
      code: "IDEMPOTENCY_CONFLICT",
    });
  }
  throw Object.assign(new Error(`${operation} failed safely.`), {
    status: 500,
    code: "CONTINUOUS_TRUST_SIGNAL_PERSISTENCE_FAILED",
  });
}

function rows<T>(result: { data: T[] | null; error: unknown }, operation: string): T[] {
  if (result.error) failure(operation, result.error);
  return result.data ?? [];
}

function mapSignal(row: Record<string, unknown>): TrustSignal {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    entityId: String(row.entity_id),
    entityType: String(row.entity_type) as TrustSignal["entityType"],
    signalType: String(row.signal_type) as TrustSignal["signalType"],
    source: String(row.source),
    provider: row.provider ? String(row.provider) : null,
    observedAt: String(row.observed_at),
    receivedAt: String(row.received_at),
    severity: String(row.severity) as TrustSignal["severity"],
    confidence: Number(row.confidence),
    status: String(row.status) as TrustSignal["status"],
    fingerprint: String(row.fingerprint),
    correlationId: String(row.correlation_id),
    causationId: row.causation_id ? String(row.causation_id) : null,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata as TrustSignal["metadata"]
        : {},
    createdAt: String(row.created_at),
  };
}

const signalFields =
  "id,tenant_id,entity_id,entity_type,signal_type,source,provider,observed_at,received_at,severity,confidence,status,fingerprint,correlation_id,causation_id,metadata,created_at";

export function continuousTrustSignalRepository() {
  const db = createServiceRoleClient();
  return {
    async ingest(
      signal: TrustSignal,
      idempotencyKeyHash: string,
      actorId: string,
      event: CanonicalTrustEvent,
    ): Promise<SignalIngestionResult> {
      const result = await db.rpc("ingest_continuous_trust_signal_v1", {
        p_signal: signal,
        p_idempotency_key_hash: idempotencyKeyHash,
        p_actor_id: actorId,
        p_trust_event: event,
      });
      if (result.error) {
        if (/event chain conflict/i.test(result.error.message)) {
          throw Object.assign(new Error("Canonical Replay chain changed; retry ingestion."), {
            status: 409,
            code: "TRUST_EVENT_CHAIN_CONFLICT",
          });
        }
        failure("Signal ingestion", result.error);
      }
      return result.data as SignalIngestionResult;
    },

    async recordRejection(input: {
      tenantId: string;
      actorId: string;
      correlationId: string;
      errorCode: string;
      event: CanonicalTrustEvent;
    }) {
      const result = await db.rpc("record_continuous_trust_signal_rejection_v1", {
        p_tenant_id: input.tenantId,
        p_actor_id: input.actorId,
        p_correlation_id: input.correlationId,
        p_error_code: input.errorCode,
        p_trust_event: input.event,
      });
      if (result.error) {
        if (/event chain conflict/i.test(result.error.message)) {
          throw Object.assign(new Error("Canonical Replay chain changed; retry rejection audit."), {
            status: 409,
            code: "TRUST_EVENT_CHAIN_CONFLICT",
          });
        }
        failure("Signal rejection audit", result.error);
      }
      return result.data as { status: "RECORDED"; eventId: string };
    },

    async signal(tenantId: string, signalId: string) {
      const result = await db
        .from("trust_signals")
        .select(signalFields)
        .eq("tenant_id", tenantId)
        .eq("id", signalId)
        .maybeSingle();
      if (result.error) failure("Signal lookup", result.error);
      return result.data ? mapSignal(result.data as Record<string, unknown>) : null;
    },

    async claim(tenantId: string, signalId: string, workerId: string) {
      const result = await db.rpc("claim_continuous_trust_signal_v1", {
        p_tenant_id: tenantId,
        p_signal_id: signalId,
        p_worker_id: workerId,
      });
      if (result.error) failure("Signal claim", result.error);
      return result.data as { status: "CLAIMED" | "BUSY" | "PROCESSED" | "FAILED_TERMINAL"; signalId: string; attempt?: number };
    },

    async claimJobs(limit: number, workerId: string) {
      const result = await db.rpc("claim_continuous_trust_jobs_v1", {
        p_limit: limit,
        p_worker_id: workerId,
      });
      return rows(result, "Signal job claim") as Array<{
        tenant_id: string;
        signal_id: string;
        status: TrustSignalProcessingStatus;
        attempts: number;
      }>;
    },

    async project(tenantId: string, signalId: string) {
      const result = await db.rpc("project_continuous_trust_signal_v1", {
        p_tenant_id: tenantId,
        p_signal_id: signalId,
      });
      if (result.error) failure("Signal evidence projection", result.error);
      return result.data as { signalId: string; evidenceId: string; projected: boolean };
    },

    async finalize(input: {
      tenantId: string;
      signalId: string;
      policyDecision: SignalPolicyDecision;
      drift: SignalDrift[];
      assessmentId: string | null;
      event: CanonicalTrustEvent;
    }) {
      const result = await db.rpc("finalize_continuous_trust_signal_v1", {
        p_tenant_id: input.tenantId,
        p_signal_id: input.signalId,
        p_policy_decision: input.policyDecision,
        p_drift: input.drift,
        p_assessment_id: input.assessmentId,
        p_trust_event: input.event,
      });
      if (result.error) {
        if (/event chain conflict/i.test(result.error.message)) {
          throw Object.assign(new Error("Canonical Replay chain changed; retry processing."), {
            status: 409,
            code: "TRUST_EVENT_CHAIN_CONFLICT",
          });
        }
        failure("Signal finalization", result.error);
      }
      return result.data as Record<string, unknown>;
    },

    async fail(tenantId: string, signalId: string, errorCode: string, retryable: boolean) {
      const result = await db.rpc("fail_continuous_trust_signal_v1", {
        p_tenant_id: tenantId,
        p_signal_id: signalId,
        p_error_code: errorCode,
        p_retryable: retryable,
      });
      if (result.error) failure("Signal failure recording", result.error);
      return result.data as Record<string, unknown>;
    },

    async listSignals(tenantId: string, entityId: string, limit: number, before?: string | null) {
      let query = db
        .from("trust_signals")
        .select(`${signalFields},trust_signal_processing(status,attempts,last_error_code,processed_at)`)
        .eq("tenant_id", tenantId)
        .eq("entity_id", entityId)
        .order("received_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);
      if (before) query = query.lt("received_at", before);
      const result = await query;
      return rows(result, "Signal history");
    },

    async recentSignals(tenantId: string, limit: number) {
      const result = await db
        .from("trust_signals")
        .select(`${signalFields},trust_signal_processing(status,attempts,last_error_code,processed_at)`)
        .eq("tenant_id", tenantId)
        .order("received_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);
      return rows(result, "Recent trust signals");
    },

    async transitions(tenantId: string, entityId: string, limit: number) {
      const result = await db
        .from("trust_state_decisions")
        .select("state_decision_id,prior_state,next_state,policy_id,policy_version,confidence,decided_at,reason_codes,decision_hash")
        .eq("enterprise_id", tenantId)
        .eq("subject_id", entityId)
        .order("decided_at", { ascending: false })
        .limit(limit);
      return rows(result, "Trust state transitions");
    },

    async reviews(tenantId: string, entityId: string | null, limit: number) {
      let query = db
        .from("trust_manual_reviews")
        .select("id,entity_id,status,requested_by,assigned_to,reason,signal_ids,policy_decision_id,decision,decision_reason,created_at,completed_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (entityId) query = query.eq("entity_id", entityId);
      const result = await query;
      return rows(result, "Manual review list");
    },

    async review(tenantId: string, reviewId: string) {
      const result = await db
        .from("trust_manual_reviews")
        .select("id,entity_id,status,requested_by,assigned_to,reason,signal_ids,policy_decision_id,decision,decision_reason,created_at,completed_at")
        .eq("tenant_id", tenantId)
        .eq("id", reviewId)
        .maybeSingle();
      if (result.error) failure("Manual review lookup", result.error);
      return result.data;
    },

    async transitionReview(
      tenantId: string,
      reviewId: string,
      actorId: string,
      status: string,
      reason: string,
      decision: string,
      event: CanonicalTrustEvent,
      correlationId: string,
    ) {
      const result = await db.rpc("transition_continuous_trust_review_v1", {
        p_tenant_id: tenantId,
        p_review_id: reviewId,
        p_actor_id: actorId,
        p_next_status: status,
        p_reason: reason,
        p_decision: decision,
        p_trust_event: event,
        p_correlation_id: correlationId,
      });
      if (result.error) {
        if (/event chain conflict/i.test(result.error.message)) {
          throw Object.assign(new Error("Canonical Replay chain changed; retry review."), {
            status: 409,
            code: "TRUST_EVENT_CHAIN_CONFLICT",
          });
        }
        if (/not found/i.test(result.error.message)) {
          throw Object.assign(new Error("Manual review was not found."), { status: 404, code: "MANUAL_REVIEW_NOT_FOUND" });
        }
        if (/transition/i.test(result.error.message)) {
          throw Object.assign(new Error("The manual review transition is not permitted."), { status: 409, code: "MANUAL_REVIEW_TRANSITION_DENIED" });
        }
        failure("Manual review transition", result.error);
      }
      return result.data as Record<string, unknown>;
    },

    async alert(tenantId: string, alertId: string) {
      const result = await db
        .from("trust_alerts")
        .select("id,alert_type,status,subject_type,subject_reference,enterprise_id,alert_title,alert_description,summary,severity,detected_at,acknowledged_at,resolved_at,reason_codes,signal_ids,policy_decision_id,evidence_references,remediation_guidance,assigned_to,updated_at")
        .eq("enterprise_id", tenantId)
        .eq("id", alertId)
        .maybeSingle();
      if (result.error) failure("Continuous Trust alert lookup", result.error);
      return result.data ? normalizeTrustAlert(result.data as Record<string, unknown>) : null;
    },

    async transitionAlert(input: {
      tenantId: string;
      alertId: string;
      actorId: string;
      status: string;
      note: string;
      event: CanonicalTrustEvent;
      correlationId: string;
    }) {
      const result = await db.rpc("transition_continuous_trust_alert_v2", {
        p_tenant_id: input.tenantId,
        p_alert_id: input.alertId,
        p_actor_id: input.actorId,
        p_next_state: input.status,
        p_note: input.note,
        p_trust_event: input.event,
        p_correlation_id: input.correlationId,
      });
      if (result.error) {
        if (/event chain conflict/i.test(result.error.message)) {
          return { status: "CHAIN_CONFLICT" as const };
        }
        if (/not found/i.test(result.error.message)) {
          throw Object.assign(new Error("Alert was not found."), { status: 404, code: "ALERT_NOT_FOUND" });
        }
        if (/transition/i.test(result.error.message)) {
          throw Object.assign(new Error("The alert transition is not permitted."), { status: 409, code: "ALERT_TRANSITION_DENIED" });
        }
        failure("Continuous Trust alert transition", result.error);
      }
      return result.data as Record<string, unknown>;
    },

    async applyOverride(input: {
      contract: TrustDecisionContract;
      decision: TrustStateDecision;
      event: CanonicalTrustEvent;
      override: Record<string, unknown>;
      correlationId: string;
    }) {
      const result = await db.rpc("apply_continuous_trust_override_v1", {
        p_contract: input.contract,
        p_decision: input.decision,
        p_trust_event: input.event,
        p_override: input.override,
        p_correlation_id: input.correlationId,
      });
      if (result.error) {
        if (/event chain conflict/i.test(result.error.message)) {
          return { status: "CHAIN_CONFLICT" as const };
        }
        if (/compare-and-set conflict/i.test(result.error.message)) {
          return { status: "STATE_CONFLICT" as const };
        }
        if (/invalid trust state transition/i.test(result.error.message)) {
          throw Object.assign(new Error("The requested trust-state override is not permitted."), {
            status: 409,
            code: "INVALID_STATE_TRANSITION",
          });
        }
        failure("Manual trust override", result.error);
      }
      return result.data as Record<string, unknown>;
    },
  };
}
