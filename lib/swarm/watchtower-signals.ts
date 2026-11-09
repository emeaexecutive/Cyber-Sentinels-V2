import { verifyAgentMessage, type AgentMessage } from "./agent-message.ts";
import type { SwarmState, SwarmStore } from "./containment.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

export type Warning = { eventId: string; source: "ALSAMORA"; kind: "SYNTHETIC_EXPORT_WARNING"; route: string; authorityConferred: false };
export type SignalHop = { claims: AgentMessage; signature: string };
export type WarningEnvelope = { warning: Warning; origin: SignalHop; relays: SignalHop[] };
export type SignalReason = "INVESTIGATION_OPENED" | "VALID_ALTERNATE_RELAY" | "MESSAGE_REPLAY" | "INVALID_ORIGIN" | "INVALID_RELAY" | "INVALID_WARNING";
const audience = "tenente:watchtower:warning:v1";
export const watchtowerAudience = audience;

function enrolled(state: SwarmState, hop: SignalHop, payload: unknown, tenant: string, swarm: string, now: number) {
  const member = state.members[hop.claims.senderId], collective = state.collectives[swarm];
  return Boolean(member?.runtimePublicKeyPem && member.state === "ACTIVE" && member.expiresAt > now
    && collective?.state === "ACTIVE" && member.swarmId === swarm && hop.claims.swarmId === swarm
    && hop.claims.tenantId === tenant && hop.claims.audience === audience
    && member.credentialVersion === hop.claims.credentialVersion
    && !state.quarantines.some(q => q.kind === "agent" ? q.id === member.id : q.kind === "swarm" ? q.id === swarm : q.kind === "workflow" ? q.id === collective.workflowId : q.id === member.id)
    && verifyAgentMessage(hop.claims, hop.signature, payload, member.runtimePublicKeyPem, now));
}

/** Warning verification only. No policy decision, delegation, approval or adapter is created here.
 * Uses the existing enrolled runtime keys, signed-message primitive, append-only Replay
 * format and transactional SwarmStore. Hosted callers must provide durable RPC persistence.
 */
export class WatchtowerSignals {
  constructor(private readonly store: SwarmStore, private readonly now: () => number) {}
  /** Deterministic advisory reviewer, not a model and not an authorisation engine.
   * Only a persisted accepted signal can support a response request. Supplied
   * corroborating references are fixture facts, not proof of provider independence.
   * Every recommendation still needs the existing authority/policy/approval gateway.
   */
  async review(tenant: string, warningEvidenceDigest: string, proposal: {
    kind: "INVESTIGATE" | "TEMPORARY_BLOCK" | "DESTRUCTIVE";
    target: string; durationSeconds?: number; corroboratingEvidenceRefs: string[];
  }) {
    return this.store.transact(tenant, state => {
      const now = this.now();
      const warningEvent = state.events.find(e => e.tenantId === tenant && e.kind === "WATCHTOWER_WARNING" && e.digest === warningEvidenceDigest && e.details.accepted === true);
      const envelope = warningEvent?.details.envelope as WarningEnvelope | undefined;
      const corroboration = new Set(proposal.corroboratingEvidenceRefs.filter(ref => typeof ref === "string" && ref.trim().length > 0 && ref.length <= 240));
      let recommendation = "VETO", reason = "VERIFIED_CURRENT_WARNING_REQUIRED";
      if (envelope && enrolled(state, envelope.origin, envelope.warning, tenant, envelope.origin.claims.swarmId, now)
        && state.members.CHIRIVETA?.state === "ACTIVE" && state.members.CHIRIVETA.expiresAt > now
        && state.members.CHIRIVETA.swarmId === envelope.origin.claims.swarmId
        && !state.quarantines.some(q => q.kind === "agent" && q.id === "CHIRIVETA")) {
        if (proposal.target !== envelope.warning.route) reason = "UNSUPPORTED_TARGET";
        else if (!["INVESTIGATE", "TEMPORARY_BLOCK", "DESTRUCTIVE"].includes(proposal.kind)) reason = "UNSUPPORTED_PROPOSAL";
        else if (proposal.kind === "INVESTIGATE" || corroboration.size < 2) {
          recommendation = "INVESTIGATE"; reason = "MORE_EVIDENCE_RECOMMENDED";
        } else if (proposal.kind === "DESTRUCTIVE") {
          recommendation = "REQUEST_INDEPENDENT_HUMAN_APPROVAL"; reason = "DESTRUCTIVE_ACTION_REQUIRES_SEPARATE_HUMAN_APPROVAL";
        } else if (!Number.isSafeInteger(proposal.durationSeconds) || proposal.durationSeconds! < 1 || proposal.durationSeconds! > 300) reason = "REVERSIBLE_WINDOW_OUT_OF_BOUNDS";
        else { recommendation = "REQUEST_TEMPORARY_BLOCK"; reason = "BOUNDED_REVERSIBLE_REQUEST_ONLY"; }
      }
      const body = { sequence: state.events.length + 1, tenantId: tenant, kind: "CHIRIVETA_REVIEW", actorId: "CHIRIVETA", subjectId: warningEvent?.subjectId ?? "unsupported-warning",
        at: now, previousHash: state.events.at(-1)?.digest ?? "0".repeat(64), details: {
          warningEvidenceDigest, proposal: structuredClone(proposal), recommendation, reason, authorityConferred: false,
          requiresGateway: true, requiresIndependentHumanApproval: proposal.kind === "DESTRUCTIVE", aiModelUsed: false,
        } };
      const evidence = { ...body, digest: hashCanonical(body) }; state.events.push(evidence);
      return { recommendation, reason, authorityConferred: false as const, requiresGateway: true as const,
        requiresIndependentHumanApproval: proposal.kind === "DESTRUCTIVE", evidence };
    });
  }
  async receive(tenant: string, envelope: WarningEnvelope) {
    return this.store.transact(tenant, state => {
      const now = this.now(), { warning, origin, relays } = envelope;
      let reason: SignalReason = "INVALID_WARNING";
      let accepted = false, investigationOpened = false;
      const eventId = typeof warning?.eventId === "string" ? warning.eventId : "invalid";
      if (warning && /^[A-Za-z0-9_-]{16,128}$/.test(eventId) && warning.source === "ALSAMORA"
        && warning.kind === "SYNTHETIC_EXPORT_WARNING" && warning.route === "synthetic:customer-export"
        && warning.authorityConferred === false && origin?.claims && Array.isArray(relays) && relays.length >= 1 && relays.length <= 4) {
        const swarm = origin.claims.swarmId;
        if (origin.claims.senderId !== "ALSAMORA" || origin.claims.recipientId !== "CHIRIVETA"
          || origin.claims.nonce !== eventId || !enrolled(state, origin, warning, tenant, swarm, now)) reason = "INVALID_ORIGIN";
        else {
          let prefix: WarningEnvelope = { warning, origin, relays: [] }, valid = true;
          const senders = new Set<string>();
          for (let index = 0; index < relays.length; index++) {
            const hop = relays[index];
            const next = relays[index + 1]?.claims.senderId ?? "CHIRIVETA";
            if (senders.has(hop.claims.senderId) || hop.claims.senderId === "ALSAMORA" || hop.claims.senderId === "CHIRIVETA"
              || (index === 0 && hop.claims.senderId !== "VIACAMP" && hop.claims.senderId !== "VIACAMP-2")
              || hop.claims.recipientId !== next || !enrolled(state, hop, prefix, tenant, swarm, now)) { valid = false; break; }
            senders.add(hop.claims.senderId);
            prefix = { ...prefix, relays: [...prefix.relays, hop] };
          }
          const recipient = state.members.CHIRIVETA;
          if (!recipient || recipient.swarmId !== swarm || recipient.state !== "ACTIVE" || recipient.expiresAt <= now
            || state.quarantines.some(q => q.kind === "agent" && q.id === "CHIRIVETA")) valid = false;
          if (!valid) reason = "INVALID_RELAY";
          else {
            const digest = hashCanonical(envelope), prior = state.events.filter(e => e.kind === "WATCHTOWER_WARNING" && e.details.accepted === true);
            const reusedRelayNonce = prior.some(e => {
              const recorded = e.details.envelope as WarningEnvelope;
              return relays.some(hop => recorded.relays.some(old => old.claims.senderId === hop.claims.senderId && old.claims.nonce === hop.claims.nonce));
            });
            if (reusedRelayNonce || prior.some(e => e.details.envelopeDigest === digest)) reason = "MESSAGE_REPLAY";
            else {
              accepted = true;
              investigationOpened = !prior.some(e => e.details.eventId === eventId && e.details.source === "ALSAMORA" && e.details.swarm === swarm);
              reason = investigationOpened ? "INVESTIGATION_OPENED" : "VALID_ALTERNATE_RELAY";
            }
          }
        }
      }
      const body = { sequence: state.events.length + 1, tenantId: tenant, kind: "WATCHTOWER_WARNING", actorId: "CHIRIVETA", subjectId: eventId,
        at: now, previousHash: state.events.at(-1)?.digest ?? "0".repeat(64), details: {
          eventId, source: warning?.source ?? null, swarm: origin?.claims?.swarmId ?? null, accepted, investigationOpened, reason,
          authorityConferred: false, envelopeDigest: hashCanonical(envelope), envelope: structuredClone(envelope),
        } };
      const evidence = { ...body, digest: hashCanonical(body) };
      state.events.push(evidence);
      return { accepted, investigationOpened, authorityConferred: false as const, reason, evidence };
    });
  }
}
