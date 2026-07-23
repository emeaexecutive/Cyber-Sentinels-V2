const requiredEventTypes = [
  "identity.document.verified", "identity.document.rejected", "identity.world_id.proof_received",
  "provider.envelope.accepted", "provider.envelope.duplicate", "provider.envelope.rejected",
  "authority.granted", "authority.revoked", "session.created", "session.risk.changed",
  "workflow.started", "workflow.paused", "workflow.completed",
  "consent.banner.displayed", "consent.accept_all", "consent.reject_optional", "consent.preferences.saved",
  "consent.withdrawn", "consent.policy.reconsent_required", "consent.policy.version_changed", "consent.receipt.created",
  "consensus.evaluation.started", "consensus.evaluation.completed", "consensus.recommendation.created", "consensus.verified", "consensus.trusted",
  "consensus.challenged", "consensus.inconclusive", "consensus.blocked", "consensus.revoked",
  "consensus.conflict.detected", "consensus.policy.changed", "provider.health.changed",
  "identity.created", "verification.started", "verification.completed", "verification.failed",
  "provider.result.received", "evidence.added", "evidence.expired", "evidence.revoked", "evidence.superseded",
  "runtime.trust.recalculated", "runtime.trust.degraded", "runtime.trust.restored",
  "runtime.access.restricted", "provider.outage.detected", "governance.manual_review.requested", "governance.manual_review.completed",
  "runtime.drift.detected", "runtime.alert.opened", "runtime.alert.acknowledged", "runtime.alert.resolved",
] as const;

const namespaces = ["identity", "device", "session", "authority", "workflow", "runtime", "security", "governance", "provider", "system", "consent", "consensus"] as const;

export const trustEventTypeRegistry = {
  version: "trust-event-types-v1",
  namespaces,
  required: requiredEventTypes,
} as const;

const typePattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,7}$/;

export function isRegisteredTrustEventType(value: string) {
  return typePattern.test(value) && namespaces.some((namespace) => value.startsWith(`${namespace}.`));
}

export function assertTrustEventType(value: string) {
  if (!isRegisteredTrustEventType(value)) throw new TypeError(`Unsupported Trust Event type: ${value}`);
  return value;
}
