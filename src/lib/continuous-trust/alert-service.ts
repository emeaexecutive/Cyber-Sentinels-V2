import "server-only";

import { signTrustEvent } from "../trust-events/hash.ts";
import {
  TRUST_EVENT_CANONICALIZATION,
  TRUST_EVENT_HASH_ALGORITHM,
  TRUST_EVENT_SCHEMA_VERSION,
} from "../trust-events/types.ts";
import { continuousTrustRepository } from "./repository.ts";
import { continuousTrustSignalRepository } from "./signal-repository.ts";

const alertStatuses = ["acknowledged", "investigating", "resolved", "dismissed"] as const;

export async function transitionContinuousTrustAlert(input: {
  tenantId: string;
  alertId: string;
  actorId: string;
  status: unknown;
  note: unknown;
  correlationId: string;
}) {
  if (typeof input.status !== "string" || !alertStatuses.includes(input.status as never)) {
    throw Object.assign(new Error("status is invalid."), { status: 400, code: "ALERT_STATUS_INVALID" });
  }
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (!note || note.length > 500) {
    throw Object.assign(new Error("A note of at most 500 characters is required."), { status: 400, code: "ALERT_NOTE_REQUIRED" });
  }
  const repository = continuousTrustSignalRepository();
  const alert = await repository.alert(input.tenantId, input.alertId);
  if (!alert) {
    throw Object.assign(new Error("Alert was not found."), { status: 404, code: "ALERT_NOT_FOUND" });
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const head = await continuousTrustRepository().chainHead(input.tenantId);
    const timestamp = new Date().toISOString();
    const event = signTrustEvent({
      eventId: crypto.randomUUID(),
      enterpriseId: input.tenantId,
      schemaVersion: TRUST_EVENT_SCHEMA_VERSION,
      eventType: `governance.alert.${input.status}`,
      subject: { type: "UNKNOWN", id: String(alert.subject_reference) },
      actor: { type: "ADMINISTRATOR", id: input.actorId },
      workflow: null,
      session: null,
      authority: null,
      provider: {
        key: "cyber_sentinels_continuous_trust",
        protocol: "UNSIGNED",
        serverVerified: true,
        eventId: input.alertId,
        transactionId: input.correlationId,
        deliveryId: null,
      },
      normalizedFacts: {
        alertId: input.alertId,
        previousStatus: String(alert.status),
        newStatus: input.status,
      },
      reasonCodes: [`CONTINUOUS_TRUST_ALERT_${input.status.toUpperCase()}`],
      evidenceReferences: Array.isArray(alert.evidence_references)
        ? alert.evidence_references.map(String)
        : [],
      occurredAt: timestamp,
      receivedAt: timestamp,
      sequence: head.sequence + 1,
      previousHash: head.eventHash,
      canonicalization: TRUST_EVENT_CANONICALIZATION,
      hashAlgorithm: TRUST_EVENT_HASH_ALGORITHM,
      ordering: { late: false, supersedesEventId: null, providerSequence: null },
    });
    const result = await repository.transitionAlert({
      tenantId: input.tenantId,
      alertId: input.alertId,
      actorId: input.actorId,
      status: input.status,
      note,
      event,
      correlationId: input.correlationId,
    });
    if (result.status === "CHAIN_CONFLICT") continue;
    return result;
  }
  throw Object.assign(new Error("Alert transition contention exceeded the retry limit."), { status: 503, code: "ALERT_CONTENTION" });
}
