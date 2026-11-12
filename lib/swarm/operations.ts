import { cancellationRuntime, type SignedCancellation } from "./cancellation.ts";
import { detectSwarmAnomalies } from "./prevention-kit.ts";
import { GovernedSoc, SOC_AGENTS } from "../soc/workflow.ts";
import { investigateWithCopilot } from "../soc/copilot.ts";
import { SocModelBudget, type ModelBudgetConfiguration } from "../soc/model-budget.ts";
import { SwarmContainment, type Actor, type SwarmStore, type SwarmDependencies, type Collective, type Member } from "./containment.ts";

/** Authentication and tenant binding are supplied by the server, never by request JSON. */
export function swarmOperations(store: SwarmStore, authenticate: () => Promise<Actor>, now = Date.now, dependencies: Pick<SwarmDependencies, "containmentKey"> & { modelBudget?: ModelBudgetConfiguration; cancellationEvidenceKey?: () => string; cancellationProject?: (event: import("./containment.ts").SwarmEvent) => Promise<void> } = {}) {
  const unavailable = async (): Promise<never> => { throw new Error("SWARM_EXECUTION_RESOLVER_UNAVAILABLE"); };
  const control = new SwarmContainment({ ...dependencies, store, authenticate, now, resolve: unavailable, heartbeatKey: unavailable, verifyOutcome: unavailable });
  const modelBudget = dependencies.modelBudget ? new SocModelBudget({ store, now }, dependencies.modelBudget) : undefined;
  const soc = new GovernedSoc({ store, control, authenticate, now,
    destination: { execute: unavailable, observe: unavailable },
    ...(process.env.OPENAI_API_KEY && process.env.OPENAI_SOC_MODEL && modelBudget && modelBudget.configuration.provider === "openai" && modelBudget.configuration.model === process.env.OPENAI_SOC_MODEL ? { modelBudget, investigate: async (tenant: string, evidence: import("./containment.ts").SwarmEvent[], signal?: AbortSignal) => investigateWithCopilot({ tenantId: tenant, question: "Explain the recorded warning and observed facts. Report uncertainty.", evidence }, { apiKey: process.env.OPENAI_API_KEY!, model: modelBudget.configuration.model, timeoutMs: modelBudget.configuration.maxDurationMs, signal }) } : {}),
  });
  async function operator() {
    const actor = await authenticate();
    if (actor.kind !== "human" || actor.controlledBy.length || actor.expiresAt <= now() || !actor.permissions.includes("swarm:audit")) throw new Error("SWARM_INDEPENDENT_OPERATOR_REQUIRED");
    return actor;
  }
  return {
    async snapshot() {
      const actor = await operator();
      return store.transact(actor.tenantId, state => ({
        tenantId: actor.tenantId,
        collectives: Object.values(state.collectives),
        members: Object.values(state.members),
        budgets: state.budgets ?? {},
        quarantines: state.quarantines,
        leases: Object.values(state.leases).map(l => ({ id: l.id, taskId: l.classification.correlationId, memberId: l.memberId, swarmId: l.swarmId, state: l.state, expiresAt: l.expiresAt, budgetId: l.classification.budget?.id ?? null })),
        receipts: state.events.slice(-100).map(e => ({ sequence: e.sequence, kind: e.kind, subjectId: e.subjectId, at: e.at, digest: e.digest, previousHash: e.previousHash, cancellationStatus: typeof e.details.cancellationStatus === "string" ? e.details.cancellationStatus : null })),
        totalReceipts: state.events.length,
        anomalies: detectSwarmAnomalies(state.events),
        soc: {
          timeline: state.events.filter(e => e.kind.startsWith("SOC_")).slice(-100),
          totalAlerts: state.events.filter(e => e.kind === "SOC_ALERT").length,
          modelConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_SOC_MODEL && modelBudget && modelBudget.configuration.provider === "openai" && modelBudget.configuration.model === process.env.OPENAI_SOC_MODEL),
          responseDispatchEnabled: false,
        },
      }));
    },
    async command(input: unknown) {
      const actor = await operator();
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Invalid operation.");
      const value = input as Record<string, unknown>;
      if (["soc-register", "soc-ingest", "soc-investigate", "soc-feedback"].includes(String(value.action))) {
        if (!actor.permissions.includes("swarm:manage")) throw Error("SOC_OPERATOR_REQUIRED");
        if (value.action === "soc-register") {
          if (typeof value.role !== "string" || !Object.hasOwn(SOC_AGENTS, value.role) || typeof value.ownerId !== "string" || !value.ownerId.trim() || value.ownerId.length > 240) throw TypeError("Registered role and named owner required.");
          return soc.registerAgent(actor.tenantId, "server-session", value.role as keyof typeof SOC_AGENTS, value.ownerId.trim());
        }
        if (value.action === "soc-ingest") {
          const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v));
          const hop = (v: unknown) => record(v) && record(v.claims) && typeof v.signature === "string";
          const envelope = value.envelope;
          if (!record(envelope) || !record(envelope.warning) || !hop(envelope.origin) || !Array.isArray(envelope.relays) || envelope.relays.length < 1 || envelope.relays.length > 4 || !envelope.relays.every(hop) || JSON.stringify(envelope).length > 4096) throw TypeError("Signed warning required.");
          return (await soc.ingest(actor.tenantId, "server-session", value.envelope as import("./watchtower-signals.ts").WarningEnvelope)).evidence;
        }
        if (typeof value.alertDigest !== "string" || !/^[a-f0-9]{64}$/.test(value.alertDigest)) throw TypeError("Alert digest required.");
        if (value.action === "soc-investigate") return soc.investigate(actor.tenantId, "server-session", value.alertDigest);
        if (typeof value.falsePositive !== "boolean") throw TypeError("Analyst feedback required.");
        return soc.feedback(actor.tenantId, "server-session", value.alertDigest, value.falsePositive);
      }
      if (value.action === "cancel" || value.action === "reconcile-cancellation") {
        if (!dependencies.containmentKey || !dependencies.cancellationEvidenceKey || !value.envelope) throw new TypeError("Signed cancellation required.");
        const runtime = cancellationRuntime({ store, authenticate, now, key: dependencies.containmentKey, runtimeKey: dependencies.cancellationEvidenceKey, project: dependencies.cancellationProject });
        return value.action === "cancel" ? runtime.deliver(actor.tenantId, value.envelope as SignedCancellation) : runtime.reconcile(actor.tenantId, value.envelope as SignedCancellation);
      }
      if (value.action === "enroll-runtime") {
        if (typeof value.id !== "string" || typeof value.publicKeyPem !== "string") throw new TypeError("Member and public key required.");
        return control.enrollRuntimeKey(actor.tenantId, "server-session", value.id, value.publicKeyPem);
      }
      if (value.action === "signed-command") {
        if (!value.envelope || typeof value.envelope !== "object") throw new TypeError("Signed command required.");
        return control.executeContainmentCommand(actor.tenantId, "server-session", value.envelope as Parameters<typeof control.executeContainmentCommand>[2]);
      }
      if (value.action === "provision") {
        const collective = value.collective as Collective, member = value.member as Member;
        if (!collective || !member || !collective.executionPolicy || !Array.isArray(collective.executionPolicy.tasks)) throw new TypeError("Approved collective, policy and member required.");
        return control.register(actor.tenantId, "server-session", collective, member);
      }
      if (value.action === "restore-scope" || value.action === "restore-member") {
        if (typeof value.receipt !== "string" || !/^[a-f0-9]{64}$/.test(value.receipt) || (value.action === "restore-member" && typeof value.id !== "string")) throw new TypeError("Containment receipt required.");
        return value.action === "restore-scope" ? control.restoreScope(actor.tenantId, "server-session", value.receipt) : control.restore(actor.tenantId, "server-session", value.id as string, value.receipt);
      }
      if (value.action === "reconcile") return control.reconcile(actor.tenantId, "server-session");
      if (value.action === "revoke") {
        if (typeof value.id !== "string" || !/^[A-Za-z0-9_.:/-]{1,240}$/.test(value.id) || typeof value.reason !== "string" || !value.reason.trim() || value.reason.length > 1000) throw new TypeError("Invalid member or reason.");
        return control.changeMembership(actor.tenantId, "server-session", value.id, "REVOKED", value.reason.trim());
      }
      if (value.action !== "contain" || !["agent", "swarm", "chain", "workflow"].includes(String(value.kind)) || typeof value.id !== "string" || !/^[A-Za-z0-9_.:/-]{1,240}$/.test(value.id) || typeof value.reason !== "string" || !value.reason.trim() || value.reason.length > 1000) throw new TypeError("Invalid containment scope or reason.");
      return control.contain(actor.tenantId, "server-session", { kind: value.kind as "agent" | "swarm" | "chain" | "workflow", id: value.id }, value.reason.trim());
    },
  };
}
