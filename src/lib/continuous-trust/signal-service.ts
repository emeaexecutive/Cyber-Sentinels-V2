import "server-only";

import { hashCanonical } from "../trust-core/hash.ts";
import { signTrustEvent } from "../trust-events/hash.ts";
import {
  TRUST_EVENT_CANONICALIZATION,
  TRUST_EVENT_HASH_ALGORITHM,
  TRUST_EVENT_SCHEMA_VERSION,
  type CanonicalTrustEvent,
  type TrustEventSubjectType,
} from "../trust-events/types.ts";
import { recalculateContinuousTrust } from "./service.ts";
import { continuousTrustRepository } from "./repository.ts";
import { detectSignalDrift, evaluateSignalPolicy } from "./signal-engine.ts";
import { continuousTrustSignalRepository } from "./signal-repository.ts";
import type { SignalIngestionResult, TrustSignal, TrustSignalInput } from "./signal-types.ts";
import {
  assertSignalSourceAuthorized,
  validateTrustSignal,
} from "./signal-validation.ts";

type EnterpriseRole = "owner" | "admin" | "reviewer" | "observer";

function subjectType(entityType: TrustSignal["entityType"]): TrustEventSubjectType {
  if (entityType === "HUMAN") return "HUMAN";
  if (entityType === "AI_AGENT") return "AI_AGENT";
  if (entityType === "DEVICE") return "DEVICE";
  if (entityType === "ORGANISATION") return "ORGANIZATION";
  if (entityType === "ENTERPRISE_WORKFLOW") return "WORKLOAD";
  if (entityType === "WORKLOAD") return "WORKLOAD";
  if (entityType === "MODEL_ENDPOINT") return "AI_AGENT";
  if (entityType === "MACHINE") return "DEVICE";
  return "SERVICE";
}

async function canonicalEvent(input: {
  signal: TrustSignal;
  actorId: string;
  eventId: string;
  eventType: string;
  facts: Record<string, string | number | boolean | null | string[]>;
  reasonCodes: string[];
}): Promise<CanonicalTrustEvent> {
  const head = await continuousTrustRepository().chainHead(input.signal.tenantId);
  return signTrustEvent({
    eventId: input.eventId,
    enterpriseId: input.signal.tenantId,
    schemaVersion: TRUST_EVENT_SCHEMA_VERSION,
    eventType: input.eventType,
    subject: { type: subjectType(input.signal.entityType), id: input.signal.entityId },
    actor: {
      type: input.actorId.startsWith("system:") ? "SYSTEM" : "USER",
      id: input.actorId,
    },
    workflow: input.signal.entityType === "ENTERPRISE_WORKFLOW"
      ? { type: "WORKFLOW", id: input.signal.entityId }
      : null,
    session: input.signal.entityType === "SESSION"
      ? { type: "SESSION", id: input.signal.entityId }
      : null,
    authority: input.signal.signalType === "AUTHORITY"
      ? { type: "AUTHORITY", id: input.signal.entityId }
      : null,
    provider: {
      key: "cyber_sentinels_continuous_trust",
      protocol: "UNSIGNED",
      serverVerified: true,
      eventId: input.signal.id,
      transactionId: input.signal.correlationId,
      deliveryId: null,
    },
    normalizedFacts: input.facts,
    reasonCodes: input.reasonCodes,
    evidenceReferences: [`signal:${input.signal.id}`],
    occurredAt: input.signal.observedAt,
    receivedAt: input.signal.receivedAt,
    sequence: head.sequence + 1,
    previousHash: head.eventHash,
    canonicalization: TRUST_EVENT_CANONICALIZATION,
    hashAlgorithm: TRUST_EVENT_HASH_ALGORITHM,
    ordering: { late: false, supersedesEventId: null, providerSequence: null },
  });
}

async function rejectedSignalEvent(input: {
  tenantId: string;
  actorId: string;
  correlationId: string;
  entityId: string;
  errorCode: string;
}): Promise<CanonicalTrustEvent> {
  const head = await continuousTrustRepository().chainHead(input.tenantId);
  const now = new Date().toISOString();
  return signTrustEvent({
    eventId: crypto.randomUUID(),
    enterpriseId: input.tenantId,
    schemaVersion: TRUST_EVENT_SCHEMA_VERSION,
    eventType: "runtime.trust_signal.rejected",
    subject: { type: "UNKNOWN", id: input.entityId },
    actor: { type: "USER", id: input.actorId },
    workflow: null,
    session: null,
    authority: null,
    provider: {
      key: "cyber_sentinels_continuous_trust",
      protocol: "UNSIGNED",
      serverVerified: true,
      eventId: null,
      transactionId: input.correlationId,
      deliveryId: null,
    },
    normalizedFacts: {
      disposition: "REJECTED_SCHEMA",
      errorCode: input.errorCode,
    },
    reasonCodes: [input.errorCode],
    evidenceReferences: [],
    occurredAt: now,
    receivedAt: now,
    sequence: head.sequence + 1,
    previousHash: head.eventHash,
    canonicalization: TRUST_EVENT_CANONICALIZATION,
    hashAlgorithm: TRUST_EVENT_HASH_ALGORITHM,
    ordering: { late: false, supersedesEventId: null, providerSequence: null },
  });
}

async function recordRejectedSignal(input: {
  tenantId: string;
  actorId: string;
  correlationId: string;
  raw: TrustSignalInput;
  errorCode: string;
}) {
  const rawEntityId =
    typeof input.raw.entityId === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9:._/@-]{0,159}$/.test(input.raw.entityId)
      ? input.raw.entityId
      : "signal-ingestion";
  const repository = continuousTrustSignalRepository();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const event = await rejectedSignalEvent({
        tenantId: input.tenantId,
        actorId: input.actorId,
        correlationId: input.correlationId,
        entityId: rawEntityId,
        errorCode: input.errorCode,
      });
      await repository.recordRejection({ ...input, event });
      return;
    } catch (error) {
      if ((error as { code?: string }).code !== "TRUST_EVENT_CHAIN_CONFLICT" || attempt === 4) {
        throw error;
      }
    }
  }
}

export async function processContinuousTrustSignal(input: {
  tenantId: string;
  signalId: string;
  actorId: string;
  workerId?: string;
}) {
  const started = performance.now();
  const repository = continuousTrustSignalRepository();
  const claim = await repository.claim(
    input.tenantId,
    input.signalId,
    input.workerId ?? `inline:${input.actorId}`,
  );
  if (claim.status !== "CLAIMED") return { status: claim.status, signalId: input.signalId };
  try {
    const signal = await repository.signal(input.tenantId, input.signalId);
    if (!signal) {
      throw Object.assign(new Error("Signal disappeared after claim."), { code: "SIGNAL_NOT_FOUND" });
    }
    await repository.project(input.tenantId, input.signalId);
    const drift = detectSignalDrift(signal);
    const policyDecision = evaluateSignalPolicy(signal, drift);
    const recalculation = await recalculateContinuousTrust({
      enterpriseId: input.tenantId,
      subjectId: signal.entityId,
      subjectType: signal.entityType,
      sourceEventId: signal.id,
      correlationId: signal.correlationId,
      evaluatedAt: signal.receivedAt,
    });
    const assessmentId =
      recalculation.assessment?.assessmentId ??
      (recalculation.persisted && "assessment_id" in recalculation.persisted
        ? String(recalculation.persisted.assessment_id)
        : null);
    const processedEvent = await canonicalEvent({
      signal,
      actorId: "system:continuous-trust-engine",
      eventId: crypto.randomUUID(),
      eventType: policyDecision.manualReviewRequired
        ? "governance.manual_review.requested"
        : policyDecision.action === "ALERT"
          ? "runtime.trust_alert.created"
          : ["RESTRICT", "SUSPEND", "REVOKE"].includes(policyDecision.action)
            ? "runtime.trust_restriction.applied"
        : policyDecision.material
          ? "runtime.trust_signal.material_change"
          : "runtime.trust_signal.processed",
      facts: {
        signalId: signal.id,
        policyDecisionId: policyDecision.policyDecisionId,
        action: policyDecision.action,
        material: policyDecision.material,
        affectedDimensions: policyDecision.affectedDimensions,
        driftCount: drift.length,
        assessmentId,
      },
      reasonCodes: policyDecision.reasonCodes,
    });
    const result = await repository.finalize({
      tenantId: input.tenantId,
      signalId: input.signalId,
      policyDecision,
      drift,
      assessmentId,
      event: processedEvent,
    });
    console.info("Continuous Trust signal processed.", {
      eventType: "continuous_trust.signal_processed",
      signalId: input.signalId,
      policyDecisionId: policyDecision.policyDecisionId,
      policyAction: policyDecision.action,
      material: policyDecision.material,
      driftCount: drift.length,
      durationMs: Math.round(performance.now() - started),
    });
    return result;
  } catch (error) {
    const candidate = error as Error & { code?: string; status?: number };
    const retryable =
      (candidate.status ?? 500) >= 500 ||
      ["TRUST_EVENT_CHAIN_CONFLICT", "TRUST_STATE_CHANGED"].includes(candidate.code ?? "");
    const failure = await repository.fail(
      input.tenantId,
      input.signalId,
      candidate.code ?? "CONTINUOUS_TRUST_PROCESSING_FAILED",
      retryable,
    );
    console.error("Continuous Trust signal processing failed.", {
      eventType: "continuous_trust.signal_processing_failed",
      signalId: input.signalId,
      errorCategory: candidate.code ?? "UNEXPECTED",
      retryable,
      durationMs: Math.round(performance.now() - started),
    });
    return failure;
  }
}

export async function ingestContinuousTrustSignal(input: {
  tenantId: string;
  actorId: string;
  role: EnterpriseRole;
  correlationId: string;
  raw: TrustSignalInput;
  idempotencyKey: string | null;
}): Promise<SignalIngestionResult & { processing?: Record<string, unknown> }> {
  let validated: ReturnType<typeof validateTrustSignal>;
  try {
    validated = validateTrustSignal(
      { ...input.raw, idempotencyKey: input.idempotencyKey ?? input.raw.idempotencyKey },
      {
        tenantId: input.tenantId,
        actorId: input.actorId,
        correlationId: input.correlationId,
      },
    );
    assertSignalSourceAuthorized(validated.signal, input.role);
  } catch (error) {
    const errorCode = (error as { code?: string }).code ?? "CONTINUOUS_TRUST_SIGNAL_REJECTED";
    await recordRejectedSignal({
      tenantId: input.tenantId,
      actorId: input.actorId,
      correlationId: input.correlationId,
      raw: input.raw,
      errorCode,
    });
    throw error;
  }
  const repository = continuousTrustSignalRepository();
  let result: SignalIngestionResult | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const acceptedEvent = await canonicalEvent({
        signal: validated.signal,
        actorId: input.actorId,
        eventId: validated.signal.id,
        eventType: "runtime.trust_signal.accepted",
        facts: {
          signalId: validated.signal.id,
          signalType: validated.signal.signalType,
          entityType: validated.signal.entityType,
          severity: validated.signal.severity,
          confidence: validated.signal.confidence,
          status: validated.signal.status,
          fingerprint: validated.signal.fingerprint,
        },
        reasonCodes: ["CONTINUOUS_TRUST_SIGNAL_ACCEPTED"],
      });
      result = await repository.ingest(
        validated.signal,
        hashCanonical({ idempotencyKey: validated.idempotencyKey }),
        input.actorId,
        acceptedEvent,
      );
      break;
    } catch (error) {
      if ((error as { code?: string }).code !== "TRUST_EVENT_CHAIN_CONFLICT") throw error;
      if (attempt === 4) throw error;
    }
  }
  if (!result) throw Object.assign(new Error("Signal ingestion contention exceeded its retry bound."), { status: 503, code: "SIGNAL_INGESTION_CONTENTION" });
  if (result.duplicate) return result;
  console.info("Continuous Trust signal accepted.", {
    eventType: "continuous_trust.signal_accepted",
    signalId: result.signalId,
    duplicate: false,
    processingStatus: result.processingStatus,
  });
  const processing = await processContinuousTrustSignal({
    tenantId: input.tenantId,
    signalId: result.signalId,
    actorId: input.actorId,
  });
  return {
    ...result,
    processingStatus: String(processing.status ?? result.processingStatus) as SignalIngestionResult["processingStatus"],
    processing,
  };
}

export async function processContinuousTrustJobs(limit = 10) {
  const repository = continuousTrustSignalRepository();
  const workerId = `serverless:${crypto.randomUUID()}`;
  const jobs = await repository.claimJobs(Math.min(Math.max(limit, 1), 25), workerId);
  const results = [];
  for (const job of jobs) {
    results.push(await processContinuousTrustSignal({
      tenantId: String(job.tenant_id),
      signalId: String(job.signal_id),
      actorId: "system:continuous-trust-worker",
      workerId,
    }));
  }
  return { claimed: jobs.length, results };
}
