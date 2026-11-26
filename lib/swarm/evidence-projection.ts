import { hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { SwarmEvent } from "./containment.ts";

const warningCorrelatedEventKinds = new Set([
  "WATCHTOWER_WARNING",
  "CHIRIVETA_REVIEW",
  "SOC_ALERT",
  "SOC_INVESTIGATION",
  "SOC_MODEL_RUN",
  "SOC_ASSESSMENT",
  "SOC_RESPONSE",
  "SOC_FEEDBACK",
  "SOC_FAILURE",
]);

/** Project into existing canonical Replay/Memory tables; the journal remains the causal source. */
export async function projectSwarmReceipt(
  event: SwarmEvent,
  persist: (table: "operational_entity_native_replay_events" | "trust_memory_index", row: Record<string, unknown>) => Promise<void>,
) {
  const { digest, ...body } = event;
  if (digest !== hashCanonical(body)) throw new Error("SWARM_PROJECTION_INTEGRITY");
  const warningCorrelated = warningCorrelatedEventKinds.has(event.kind);
  const targets = warningCorrelated ? [event.details.canonicalEntityId] : Array.isArray(event.details.affected) ? event.details.affected
    : Array.isArray(event.details.unexpectedTerminationAlerts) ? event.details.unexpectedTerminationAlerts : [event.subjectId];
  const subjects = new Set<string>();
  for (const target of targets) {
    if (typeof target !== "string" || !target.trim() || target === event.tenantId) continue;
    subjects.add(target);
  }
  if (warningCorrelated && subjects.size === 0) return { projected: 0, skipped: "CANONICAL_ENTITY_UNAVAILABLE" as const };
  for (const subject of subjects) {
    const identity = hashCanonical({ tenant: event.tenantId, subject, receipt: event.digest });
    const eventId = `${identity.slice(0,8)}-${identity.slice(8,12)}-5${identity.slice(13,16)}-8${identity.slice(17,20)}-${identity.slice(20,32)}`;
    const occurredAt = new Date(event.at).toISOString();
    const summary = { swarmReceipt: event.digest, previousReceipt: event.previousHash, lifecycleEvent: event.kind, journalSequence: event.sequence, externalExecutionOrder: "UNKNOWN", details: event.details };
    const evidenceReferences = [`swarm-receipt:${event.digest}`];
    if (warningCorrelated) evidenceReferences.push(`warning:${event.subjectId}`);
    await persist("operational_entity_native_replay_events", {
      event_id: eventId, enterprise_id: event.tenantId, operational_entity_id: subject,
      event_type: `SWARM_${event.kind}`, actor_reference: event.actorId, attribution: "CYBER_SENTINELS_INTERPRETATION",
      evidence_references: evidenceReferences, reason_codes: [], payload: summary,
      event_digest: hashCanonical({ eventId, enterpriseId: event.tenantId, entityId: subject, eventType: `SWARM_${event.kind}`, reasonCodes: [], payload: summary, occurredAt }), occurred_at: occurredAt,
    });
    await persist("trust_memory_index", {
      enterprise_id: event.tenantId, subject_id: subject, domain_key: "RUNTIME", memory_type: `SWARM_${event.kind}`,
      source_id: `swarm:${event.digest}:${subject}`, occurred_at: occurredAt, summary,
    });
  }
  return { projected: subjects.size };
}
