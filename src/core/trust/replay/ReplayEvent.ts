import type { SafeMetadata } from "../types/index.ts";

export const replayEventTypes = [
  "EVIDENCE_RECORDED",
  "SIGNAL_RECEIVED",
  "TRUST_UPDATED",
  "RISK_DETECTED",
  "MANUAL_OVERRIDE",
  "DECISION_RECORDED",
  "PASSPORT_VERIFIED",
  "EMAIL_VERIFIED",
  "PHONE_VERIFIED",
  "DEVICE_OBSERVED",
  "LOCATION_OBSERVED",
  "VPN_DETECTED",
  "BROWSER_OBSERVED",
  "LIVENESS_CHECKED",
  "DEEPFAKE_ANALYZED",
  "ENTERPRISE_POLICY_CHANGED",
  "MANUAL_REVIEW_COMPLETED",
  "TRUST_DNA_RECALCULATED",
  "PROVIDER_RESPONSE_RECORDED",
  "EVIDENCE_ADDED",
  "EVIDENCE_REMOVED",
  "POLICY_CHANGED",
  "MANUAL_APPROVAL",
  "RISK_CHANGED",
] as const;

export type ReplayEventType = (typeof replayEventTypes)[number];

export type ReplayEvent = {
  id: string;
  tenantId: string;
  identityId: string;
  entityId?: string;
  type: ReplayEventType;
  title: string;
  description: string;
  occurredAt: string;
  eventTime?: string;
  source: string;
  actorId: string | null;
  actor?: string | null;
  provider?: string | null;
  confidence: number | null;
  evidenceIds: string[];
  priorRisk?: number | null;
  resultingRisk?: number | null;
  priorTrust: number | null;
  resultingTrust: number | null;
  metadata: SafeMetadata;
  previousEventHash?: string | null;
  integrityHash?: string | null;
  createdAt?: string;
};

const deniedMetadata = /address|biometric|credential|document|email|ip|password|payload|phone|secret|token/i;

export function sanitizeReplayMetadata(value: Record<string, unknown>): SafeMetadata {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !deniedMetadata.test(key))
      .filter((entry): entry is [string, string | number | boolean | null] => {
        const item = entry[1];
        return item === null || ["string", "number", "boolean"].includes(typeof item);
      }),
  );
}

export function validateReplayEvent(event: ReplayEvent): ReplayEvent {
  const eventTime = new Date(event.eventTime ?? event.occurredAt);
  if (Number.isNaN(eventTime.getTime())) throw new TypeError("Replay event time is invalid.");
  if (!replayEventTypes.includes(event.type)) throw new TypeError("Replay event type is invalid.");
  if (!event.title.trim() || event.title.length > 200) {
    throw new TypeError("Replay event title is invalid.");
  }
  if (!event.description.trim() || event.description.length > 2000) {
    throw new TypeError("Replay event description is invalid.");
  }
  if (
    event.confidence !== null &&
    (!Number.isFinite(event.confidence) || event.confidence < 0 || event.confidence > 1)
  ) {
    throw new TypeError("Replay confidence must be between 0 and 1.");
  }
  for (const value of [
    event.priorRisk,
    event.resultingRisk,
    event.priorTrust,
    event.resultingTrust,
  ]) {
    if (value !== undefined && value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) {
      throw new TypeError("Replay numeric state must be between 0 and 100.");
    }
  }
  return {
    ...event,
    entityId: event.entityId ?? event.identityId,
    eventTime: eventTime.toISOString(),
    occurredAt: eventTime.toISOString(),
    actor: event.actor ?? event.actorId,
    provider: event.provider ?? null,
    metadata: sanitizeReplayMetadata(event.metadata),
    createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : eventTime.toISOString(),
  };
}
