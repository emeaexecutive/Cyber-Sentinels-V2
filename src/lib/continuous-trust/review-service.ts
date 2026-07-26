import "server-only";

import { signTrustEvent } from "../trust-events/hash.ts";
import {
  TRUST_EVENT_CANONICALIZATION,
  TRUST_EVENT_HASH_ALGORITHM,
  TRUST_EVENT_SCHEMA_VERSION,
} from "../trust-events/types.ts";
import { continuousTrustRepository } from "./repository.ts";
import { continuousTrustSignalRepository } from "./signal-repository.ts";

const nextStatuses = ["ASSIGNED", "IN_REVIEW", "APPROVED", "REJECTED", "CANCELLED"] as const;

export async function transitionContinuousTrustReview(input: {
  tenantId: string;
  reviewId: string;
  actorId: string;
  status: unknown;
  reason: unknown;
  decision?: unknown;
  correlationId: string;
}) {
  if (typeof input.status !== "string" || !nextStatuses.includes(input.status as never)) {
    throw Object.assign(new Error("status is invalid."), { status: 400, code: "MANUAL_REVIEW_STATUS_INVALID" });
  }
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!reason || reason.length > 1000) {
    throw Object.assign(new Error("A review reason is required."), { status: 400, code: "MANUAL_REVIEW_REASON_REQUIRED" });
  }
  const decision = typeof input.decision === "string" ? input.decision.trim().slice(0, 160) : "";
  if (["APPROVED", "REJECTED"].includes(input.status) && !decision) {
    throw Object.assign(new Error("A decision is required for a completed review."), { status: 400, code: "MANUAL_REVIEW_DECISION_REQUIRED" });
  }
  const repository = continuousTrustSignalRepository();
  const review = await repository.review(input.tenantId, input.reviewId);
  if (!review) {
    throw Object.assign(new Error("Manual review was not found."), { status: 404, code: "MANUAL_REVIEW_NOT_FOUND" });
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const head = await continuousTrustRepository().chainHead(input.tenantId);
    const timestamp = new Date().toISOString();
    const event = signTrustEvent({
      eventId: crypto.randomUUID(),
      enterpriseId: input.tenantId,
      schemaVersion: TRUST_EVENT_SCHEMA_VERSION,
      eventType: input.status === "APPROVED"
        ? "governance.manual_review.approved"
        : input.status === "REJECTED"
          ? "governance.manual_review.rejected"
          : "governance.manual_review.updated",
      subject: { type: "UNKNOWN", id: String(review.entity_id) },
      actor: { type: "ADMINISTRATOR", id: input.actorId },
      workflow: null,
      session: null,
      authority: null,
      provider: {
        key: "cyber_sentinels_continuous_trust",
        protocol: "UNSIGNED",
        serverVerified: true,
        eventId: input.reviewId,
        transactionId: input.correlationId,
        deliveryId: null,
      },
      normalizedFacts: {
        reviewId: input.reviewId,
        previousStatus: String(review.status),
        newStatus: input.status,
        decision: decision || null,
      },
      reasonCodes: [`MANUAL_REVIEW_${input.status}`],
      evidenceReferences: Array.isArray(review.signal_ids)
        ? review.signal_ids.map((id) => `signal:${String(id)}`)
        : [],
      occurredAt: timestamp,
      receivedAt: timestamp,
      sequence: head.sequence + 1,
      previousHash: head.eventHash,
      canonicalization: TRUST_EVENT_CANONICALIZATION,
      hashAlgorithm: TRUST_EVENT_HASH_ALGORITHM,
      ordering: { late: false, supersedesEventId: null, providerSequence: null },
    });
    try {
      return await repository.transitionReview(
        input.tenantId,
        input.reviewId,
        input.actorId,
        input.status,
        reason,
        decision,
        event,
        input.correlationId,
      );
    } catch (error) {
      if ((error as { code?: string }).code !== "TRUST_EVENT_CHAIN_CONFLICT" || attempt === 4) throw error;
    }
  }
  throw Object.assign(new Error("Manual review contention exceeded the retry limit."), { status: 503, code: "MANUAL_REVIEW_CONTENTION" });
}
