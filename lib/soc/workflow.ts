import { appendSwarmEvent, type Actor, type SwarmEvent, type SwarmState, type SwarmStore, type SwarmContainment } from "../swarm/containment.ts";
import { WatchtowerSignals, type WarningEnvelope } from "../swarm/watchtower-signals.ts";
import type { EnforcementRequest } from "../operational-entities/native-enforcement.ts";

export const SOC_AGENTS = {
  TORCH: { id: "TORCH", task: "correlate authenticated warnings", tools: ["read:trust-events"] },
  "Swarm Investigator": { id: "Swarm-Investigator", task: "collect scoped evidence", tools: ["read:incident-evidence"] },
  "Sentinel Intelligence": { id: "Sentinel-Intelligence", task: "assess observed signals", tools: ["read:incident-evidence"] },
  "Authority Guardian": { id: "Authority-Guardian", task: "check current authority", tools: ["swarm:admit"] },
  CHIRIVETA: { id: "CHIRIVETA", task: "review reversible containment", tools: ["watchtower:review"] },
  TENENTE: { id: "TENENTE", task: "coordinate bounded response", tools: ["swarm:dispatch"] },
  "Sentinel Copilot": { id: "Sentinel-Copilot", task: "select read-only cited evidence", tools: ["read:incident-evidence"] },
} as const;
export const SOC_LIMITS = { maxEvidenceRecords: 24, maxModelMs: 15000, maxDestinationMs: 15000 } as const;

type ModelReport = { authority: "NONE"; [key: string]: unknown };
export type SocDependencies = {
  store: SwarmStore; control: SwarmContainment; now(): number;
  authenticate(proof: string): Promise<Actor | null>;
  destinationTimeoutMs?: number;
  investigate?: (tenant: string, evidence: SwarmEvent[]) => Promise<ModelReport>;
  // Adapter and observer are trusted server configuration, never supplied by model/input.
  destination: { execute(request: EnforcementRequest): Promise<void>; observe(request: EnforcementRequest): Promise<unknown> };
};

/** SOC is a consumer of the existing authority gateway, never an authority issuer.
 * All records share the existing CAS journal, Replay, tenant boundary and recovery.
 */
export class GovernedSoc {
  private readonly signals: WatchtowerSignals;
  constructor(private readonly deps: SocDependencies) { this.signals = new WatchtowerSignals(deps.store, deps.now); }
  private async actor(tenant: string, proof: string, permission = "swarm:audit") {
    const actor = await this.deps.authenticate(proof);
    if (!actor || actor.kind !== "human" || actor.controlledBy.length || actor.tenantId !== tenant || actor.expiresAt <= this.deps.now() || !actor.permissions.includes(permission)) throw Error("SOC_ACCESS_DENIED");
    return actor;
  }
  private record(tenant: string, kind: string, actor: string, subject: string, details: Record<string, unknown>) {
    return this.deps.store.transact(tenant, state => appendSwarmEvent(state, this.deps.now(), kind, actor, subject, details));
  }
  async registerAgent(tenant: string, proof: string, role: keyof typeof SOC_AGENTS, ownerId: string) {
    const manager = await this.actor(tenant, proof, "swarm:manage");
    if (!Object.hasOwn(SOC_AGENTS, role) || typeof ownerId !== "string" || !ownerId.trim() || ownerId.length > 240) throw Error("SOC_REGISTRATION_INVALID");
    return this.deps.store.transact(tenant, state => {
      const member = state.members[SOC_AGENTS[role].id];
      if (!member || member.state !== "ACTIVE" || !member.runtimePublicKeyPem || member.expiresAt <= this.deps.now()) throw Error("SOC_AGENT_UNAVAILABLE");
      const prior = state.events.findLast(e => e.kind === "SOC_AGENT_REGISTERED" && e.subjectId === role);
      if (prior && prior.details.ownerId !== ownerId) throw Error("SOC_OWNER_CHANGE_REQUIRES_REVIEW");
      return appendSwarmEvent(state, this.deps.now(), "SOC_AGENT_REGISTERED", manager.id, role, { ownerId, swarmId: member.swarmId, ...SOC_AGENTS[role], limits: SOC_LIMITS, authorityConferred: false });
    });
  }
  private agents(state: SwarmState, swarm: string) {
    const collective = state.collectives[swarm];
    if (!collective || collective.state !== "ACTIVE" || state.quarantines.some(q => q.kind === "swarm" && q.id === swarm || q.kind === "workflow" && q.id === collective.workflowId)) throw Error("SOC_AGENT_UNAVAILABLE");
    for (const [role, definition] of Object.entries(SOC_AGENTS)) {
      const member = state.members[definition.id];
      const registration = state.events.findLast(e => e.kind === "SOC_AGENT_REGISTERED" && e.subjectId === role);
      if (!member || member.swarmId !== swarm || member.state !== "ACTIVE" || !member.runtimePublicKeyPem || member.expiresAt <= this.deps.now() || !registration?.details.ownerId || registration.details.swarmId !== swarm || state.quarantines.some(q => q.kind === "agent" && q.id === definition.id)) throw Error("SOC_AGENT_UNAVAILABLE");
    }
  }
  async ingest(tenant: string, proof: string, envelope: WarningEnvelope) {
    await this.actor(tenant, proof);
    const received = await this.signals.receive(tenant, envelope);
    if (!received.accepted) return { accepted: false, evidence: received.evidence };
    const alert = await this.deps.store.transact(tenant, state => {
      const prior = state.events.find(e => e.kind === "SOC_ALERT" && e.subjectId === envelope.warning.eventId);
      if (prior) return prior;
      const related = state.events.filter(e => e.actorId === "ALSAMORA" || e.subjectId === "ALSAMORA").slice(-20);
      return appendSwarmEvent(state, this.deps.now(), "SOC_ALERT", "TORCH", envelope.warning.eventId, {
        synthetic: true, source: "authenticated-watchtower", swarmId: envelope.origin.claims.swarmId,
        entityId: "ALSAMORA", rule: "signed-synthetic-export-v1", score: Math.min(100, 60 + related.length * 2),
        priority: "REVIEW", escalation: "analyst", evidenceRefs: [received.evidence.digest, ...related.map(e => e.digest)],
        authorityConferred: false,
      });
    });
    return { accepted: true, evidence: received.evidence, alert };
  }
  async investigate(tenant: string, proof: string, alertDigest: string) {
    await this.actor(tenant, proof);
    const evidence = await this.deps.store.transact(tenant, state => {
      const alert = state.events.find(e => e.kind === "SOC_ALERT" && e.digest === alertDigest);
      if (!alert) throw Error("SOC_ALERT_NOT_FOUND");
      const swarm = String(alert.details.swarmId);
      this.agents(state, swarm);
      const refs = new Set([alert.digest, ...(alert.details.evidenceRefs as string[])]);
      return state.events.filter(e => refs.has(e.digest)).slice(-24);
    });
    const alert = evidence.find(e => e.digest === alertDigest)!;
    await this.record(tenant, "SOC_INVESTIGATION", "Swarm Investigator", alert.subjectId, { alertDigest, evidenceRefs: evidence.map(e => e.digest), maxRecords: 24, authorityConferred: false });
    if (this.deps.investigate) {
      try {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const report = await Promise.race([this.deps.investigate(tenant, structuredClone(evidence)), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error("SOC_MODEL_TIMEOUT")), SOC_LIMITS.maxModelMs); })]).finally(() => { if (timer) clearTimeout(timer); });
        if (report.authority !== "NONE") throw Error("SOC_MODEL_AUTHORITY_REJECTED");
        await this.record(tenant, "SOC_MODEL_RUN", "Sentinel Copilot", alert.subjectId, { alertDigest, report, authorityConferred: false });
      } catch {
        await this.record(tenant, "SOC_FAILURE", "Sentinel Copilot", alert.subjectId, { alertDigest, reason: "MODEL_UNAVAILABLE_OR_INVALID", authorityConferred: false });
      }
    } else {
      await this.record(tenant, "SOC_FAILURE", "Sentinel Copilot", alert.subjectId, { alertDigest, reason: "MODEL_NOT_CONFIGURED", authorityConferred: false });
    }
    return this.record(tenant, "SOC_ASSESSMENT", "Sentinel Intelligence", alert.subjectId, {
      alertDigest, finding: "AUTHENTICATED_SYNTHETIC_WARNING", uncertainty: "Synthetic warning does not establish a real compromise.",
      evidenceRefs: evidence.map(e => e.digest), modelAuthority: "NONE", requiresCurrentGateway: true,
    });
  }
  async respond(tenant: string, proof: string, alertDigest: string, request: EnforcementRequest) {
    await this.actor(tenant, proof, "swarm:execute");
    const alert = await this.deps.store.transact(tenant, state => {
      const found = state.events.find(e => e.kind === "SOC_ALERT" && e.digest === alertDigest);
      if (found) {
        this.agents(state, String(found.details.swarmId));
        if (request.operationalEntityId !== SOC_AGENTS.TENENTE.id || state.members[request.operationalEntityId]?.swarmId !== found.details.swarmId) throw Error("SOC_REQUEST_SCOPE_DENIED");
      }
      return found;
    });
    if (!alert || request.enterpriseId !== tenant) throw Error("SOC_ALERT_NOT_FOUND");
    const finish = async (decision: "ALLOW" | "REVIEW" | "DENY", outcome: string, refs: string[]) => {
      const receipt = await this.record(tenant, "SOC_RESPONSE", "TENENTE", alert.subjectId, { alertDigest, decision, outcome, evidenceRefs: refs, requestId: request.requestId, synthetic: true });
      await this.record(tenant, "SOC_TRUST_MEMORY", "TENENTE", request.operationalEntityId, { alertDigest, responseDigest: receipt.digest, outcome, authorityConferred: false });
      return receipt;
    };
    // An explicit allowlist prevents arbitrary action names being labelled low risk.
    if (request.action.type !== "BLOCK_SYNTHETIC_ACTION" || request.action.target !== "synthetic:customer-export" || request.action.environment !== "test" || request.action.consequence !== "LOW") return finish("DENY", "UNSUPPORTED_ACTION", []);
    const assessment = await this.deps.store.transact(tenant, state => state.events.find(e => e.kind === "SOC_ASSESSMENT" && e.details.alertDigest === alertDigest));
    if (!assessment) return finish("REVIEW", "INVESTIGATION_REQUIRED", []);
    const signalDigest = (alert.details.evidenceRefs as string[])[0];
    const review = await this.signals.review(tenant, signalDigest, { kind: "TEMPORARY_BLOCK", target: request.action.target, durationSeconds: 60, corroboratingEvidenceRefs: [alert.digest, assessment.digest] });
    if (review.recommendation !== "REQUEST_TEMPORARY_BLOCK") return finish("REVIEW", review.reason, [review.evidence.digest]);
    const admitted = await this.deps.control.admit(tenant, proof, request);
    if (!admitted.allowed || !admitted.leaseId) return finish("DENY", "AUTHORITY_DENIED", [admitted.receipt.digest]);
    const dispatch = await this.deps.control.dispatch(tenant, proof, request, admitted.leaseId);
    if (!dispatch.allowed) return finish("DENY", "DISPATCH_DENIED", [dispatch.receipt.digest]);
    try {
      const timeoutMs = this.deps.destinationTimeoutMs ?? SOC_LIMITS.maxDestinationMs;
      if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > SOC_LIMITS.maxDestinationMs) throw Error("SOC_DESTINATION_TIMEOUT_CONFIGURATION");
      let timer: ReturnType<typeof setTimeout> | undefined;
      const observed = await Promise.race([(async () => {
        await this.deps.destination.execute(structuredClone(request));
        return this.deps.destination.observe(structuredClone(request));
      })(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error("SOC_DESTINATION_TIMEOUT")), timeoutMs); })]).finally(() => { if (timer) clearTimeout(timer); });
      const receipt = await this.deps.control.outcome(tenant, proof, admitted.leaseId, observed);
      return finish("ALLOW", String(receipt.details.outcome), [review.evidence.digest, dispatch.receipt.digest, receipt.digest]);
    } catch {
      // A lost acknowledgment cannot be retried as a new action. Reconcile first.
      await this.deps.store.transact(tenant, state => {
        const lease = state.leases[admitted.leaseId!];
        if (lease?.state === "DISPATCHED") lease.state = "UNKNOWN";
        return appendSwarmEvent(state, this.deps.now(), "SOC_FAILURE", "TENENTE", alert.subjectId, { leaseId: admitted.leaseId, outcome: "UNKNOWN", automaticRetry: false });
      });
      return finish("ALLOW", "UNKNOWN", [dispatch.receipt.digest]);
    }
  }
  async feedback(tenant: string, proof: string, alertDigest: string, falsePositive: boolean) {
    const actor = await this.actor(tenant, proof, "swarm:manage");
    return this.deps.store.transact(tenant, state => {
      const alert = state.events.find(e => e.kind === "SOC_ALERT" && e.digest === alertDigest);
      if (!alert || typeof falsePositive !== "boolean") throw Error("SOC_FEEDBACK_INVALID");
      return appendSwarmEvent(state, this.deps.now(), "SOC_FEEDBACK", actor.id, alert.subjectId, { alertDigest, falsePositive });
    });
  }
  async snapshot(tenant: string, proof: string) {
    await this.actor(tenant, proof);
    const events = await this.deps.control.evidence(tenant, proof);
    const alerts = events.filter(e => e.kind === "SOC_ALERT");
    const latest = new Map(events.filter(e => e.kind === "SOC_FEEDBACK").map(e => [e.details.alertDigest, e]));
    return { alerts, timeline: events.filter(e => e.kind.startsWith("SOC_")), quality: {
      alerts: alerts.length, reviewed: latest.size, falsePositives: [...latest.values()].filter(e => e.details.falsePositive).length,
      falsePositiveRate: latest.size ? [...latest.values()].filter(e => e.details.falsePositive).length / latest.size : null,
      recall: null, recallReason: "Ground-truth dataset required; production recall is not inferred from feedback.",
    } };
  }
  async emergencyStop(tenant: string, proof: string, swarmId: string, reason: string) {
    await this.actor(tenant, proof, "swarm:contain");
    return this.deps.control.contain(tenant, proof, { kind: "swarm", id: swarmId }, reason);
  }
}
