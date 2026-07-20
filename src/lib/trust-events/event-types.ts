const requiredEventTypes = [
  "identity.document.verified", "identity.document.rejected", "identity.world_id.proof_received",
  "provider.envelope.accepted", "provider.envelope.duplicate", "provider.envelope.rejected",
  "authority.granted", "authority.revoked", "session.created", "session.risk.changed",
  "workflow.started", "workflow.paused", "workflow.completed",
] as const;

const namespaces = ["identity", "device", "session", "authority", "workflow", "runtime", "security", "governance", "provider", "system"] as const;

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
