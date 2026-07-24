import "server-only";

import { createTrustDecisionContract } from "../trust-architecture/decision-contracts.ts";
import { deterministicUuid, hashCanonical } from "../trust-core/hash.ts";
import { signTrustEvent } from "../trust-events/hash.ts";
import {
  TRUST_EVENT_CANONICALIZATION,
  TRUST_EVENT_HASH_ALGORITHM,
  TRUST_EVENT_SCHEMA_VERSION,
} from "../trust-events/types.ts";
import { evaluateTrustState } from "../trust-state/engine.ts";
import { trustStates, type TrustState } from "../trust-state/types.ts";
import { continuousTrustRepository } from "./repository.ts";
import { continuousTrustSignalRepository } from "./signal-repository.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function applyContinuousTrustOverride(input: {
  tenantId: string;
  entityId: string;
  actorId: string;
  targetState: unknown;
  reason: unknown;
  expiresAt?: unknown;
  signalIds?: unknown;
  correlationId: string;
}) {
  if (typeof input.targetState !== "string" || !trustStates.includes(input.targetState as TrustState)) {
    throw Object.assign(new Error("targetState is invalid."), { status: 400, code: "OVERRIDE_STATE_INVALID" });
  }
  const targetState = input.targetState as TrustState;
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!reason || reason.length > 1000) {
    throw Object.assign(new Error("A reason of at most 1000 characters is required."), { status: 400, code: "OVERRIDE_REASON_REQUIRED" });
  }
  const expiresAt = input.expiresAt ? new Date(String(input.expiresAt)) : null;
  if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) {
    throw Object.assign(new Error("expiresAt must be a future timestamp."), { status: 400, code: "OVERRIDE_EXPIRATION_INVALID" });
  }
  const signalIds = Array.isArray(input.signalIds) ? input.signalIds.map(String) : [];
  if (signalIds.length > 50 || signalIds.some((id) => !uuid.test(id))) {
    throw Object.assign(new Error("signalIds must contain at most 50 UUIDs."), { status: 400, code: "OVERRIDE_SIGNALS_INVALID" });
  }

  const runtimeRepository = continuousTrustRepository();
  const repository = continuousTrustSignalRepository();
  const decidedAt = new Date().toISOString();
  const [current, evidence] = await Promise.all([
    runtimeRepository.current(input.tenantId, input.entityId),
    runtimeRepository.evidence(input.tenantId, input.entityId),
  ]);
  const priorState = current?.state ?? "UNKNOWN";
  const evidenceSnapshotHash = hashCanonical(
    evidence.map((item) => ({
      evidenceId: item.evidenceId,
      result: item.result,
      assuranceLevel: item.assuranceLevel,
      sourceKey: item.sourceKey,
      occurredAt: item.occurredAt,
      expiresAt: item.expiresAt ?? null,
      payloadHash: item.payloadHash,
    })).sort((left, right) => left.evidenceId.localeCompare(right.evidenceId)),
  );
  const overrideId = crypto.randomUUID();
  const recommendationId = deterministicUuid({
    overrideId,
    tenantId: input.tenantId,
    entityId: input.entityId,
    priorState,
    targetState,
  });
  const contract = createTrustDecisionContract({
    enterpriseId: input.tenantId,
    domainKey: evidence[0]?.domainKey ?? "IDENTITY",
    subjectId: input.entityId,
    policyId: "continuous-trust-manual-override",
    policyVersion: "1.0.0",
    evidenceSnapshotHash,
    requestedAt: decidedAt,
    decisionInputs: {
      overrideId,
      recommendationId,
      priorState,
      targetState,
      reasonHash: hashCanonical({ reason }),
      actorId: input.actorId,
      signalIds,
    },
  });
  const decision = evaluateTrustState({
    contract,
    priorState,
    recommendation: {
      recommendationId,
      recommendedState: targetState,
      confidence: 100,
      reasonCodes: ["MANUAL_OVERRIDE_REQUESTED", `OVERRIDE_TO_${targetState}`],
      evidenceSnapshotHash,
    },
    evidence,
    policy: {
      policyId: "continuous-trust-manual-override",
      policyVersion: "1.0.0",
      allowRecoveryFromBlocked: true,
      minimumEvidenceForTrusted: 1,
      minimumEvidenceForVerified: 2,
    },
    decidedAt,
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const head = await runtimeRepository.chainHead(input.tenantId);
    const event = signTrustEvent({
      eventId: crypto.randomUUID(),
      enterpriseId: input.tenantId,
      schemaVersion: TRUST_EVENT_SCHEMA_VERSION,
      eventType: "governance.manual_override.applied",
      subject: { type: "UNKNOWN", id: input.entityId },
      actor: { type: "ADMINISTRATOR", id: input.actorId },
      workflow: null,
      session: null,
      authority: null,
      provider: {
        key: "cyber_sentinels_continuous_trust",
        protocol: "UNSIGNED",
        serverVerified: true,
        eventId: overrideId,
        transactionId: input.correlationId,
        deliveryId: null,
      },
      normalizedFacts: {
        overrideId,
        priorState,
        nextState: decision.nextState,
        stateDecisionId: decision.stateDecisionId,
        expiresAt: expiresAt?.toISOString() ?? null,
        manualOverride: true,
      },
      reasonCodes: decision.reasonCodes,
      evidenceReferences: [
        ...evidence.map((item) => `evidence:${item.evidenceId}`),
        ...signalIds.map((id) => `signal:${id}`),
      ],
      occurredAt: decidedAt,
      receivedAt: decidedAt,
      sequence: head.sequence + 1,
      previousHash: head.eventHash,
      canonicalization: TRUST_EVENT_CANONICALIZATION,
      hashAlgorithm: TRUST_EVENT_HASH_ALGORITHM,
      ordering: { late: false, supersedesEventId: null, providerSequence: null },
    });
    const result = await repository.applyOverride({
      contract,
      decision,
      event,
      correlationId: input.correlationId,
      override: {
        id: overrideId,
        tenantId: input.tenantId,
        entityId: input.entityId,
        actorId: input.actorId,
        previousState: priorState,
        newState: decision.nextState,
        reason,
        signalIds,
        expiresAt: expiresAt?.toISOString() ?? null,
        createdAt: decidedAt,
      },
    });
    if (result.status === "CHAIN_CONFLICT") continue;
    if (result.status === "STATE_CONFLICT") {
      throw Object.assign(new Error("Trust state changed during the override."), { status: 409, code: "TRUST_STATE_CHANGED" });
    }
    return { overrideId, decision, persisted: result };
  }
  throw Object.assign(new Error("Manual override contention exceeded the retry limit."), { status: 503, code: "OVERRIDE_CONTENTION" });
}
