import { hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { SwarmEvent } from "./containment.ts";

/** Project into existing canonical Replay/Memory tables; the journal remains the causal source. */
export async function projectSwarmReceipt(
  event: SwarmEvent,
  persist: (table: "operational_entity_native_replay_events" | "trust_memory_index", row: Record<string, unknown>) => Promise<void>,
) {
  const { digest, ...body } = event;
  if (digest !== hashCanonical(body)) throw new Error("SWARM_PROJECTION_INTEGRITY");
  const targets = Array.isArray(event.details.affected) ? event.details.affected
    : Array.isArray(event.details.unexpectedTerminationAlerts) ? event.details.unexpectedTerminationAlerts : [event.subjectId];
  for (const subject of new Set(targets)) {
    if (typeof subject !== "string" || subject === event.tenantId) continue;
    const identity = hashCanonical({ tenant: event.tenantId, subject, receipt: event.digest });
    const eventId = `${identity.slice(0,8)}-${identity.slice(8,12)}-5${identity.slice(13,16)}-8${identity.slice(17,20)}-${identity.slice(20,32)}`;
    const occurredAt = new Date(event.at).toISOString();
    const summary = { swarmReceipt: event.digest, previousReceipt: event.previousHash, lifecycleEvent: event.kind, journalSequence: event.sequence, externalExecutionOrder: "UNKNOWN", details: event.details };
    await persist("operational_entity_native_replay_events", {
      event_id: eventId, enterprise_id: event.tenantId, operational_entity_id: subject,
      event_type: `SWARM_${event.kind}`, actor_reference: event.actorId, attribution: "CYBER_SENTINELS_INTERPRETATION",
      evidence_references: [`swarm-receipt:${event.digest}`], reason_codes: [], payload: summary,
      event_digest: hashCanonical({ eventId, enterpriseId: event.tenantId, entityId: subject, eventType: `SWARM_${event.kind}`, reasonCodes: [], payload: summary, occurredAt }), occurred_at: occurredAt,
    });
    await persist("trust_memory_index", {
      enterprise_id: event.tenantId, subject_id: subject, domain_key: "RUNTIME", memory_type: `SWARM_${event.kind}`,
      source_id: `swarm:${event.digest}:${subject}`, occurred_at: occurredAt, summary,
    });
  }
}
