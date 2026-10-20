import { detectSwarmAnomalies } from "./prevention-kit.ts";
import { SwarmContainment, type Actor, type SwarmStore, type SwarmDependencies, type Collective, type Member } from "./containment.ts";

/** Authentication and tenant binding are supplied by the server, never by request JSON. */
export function swarmOperations(store: SwarmStore, authenticate: () => Promise<Actor>, now = Date.now, dependencies: Pick<SwarmDependencies, "containmentKey"> = {}) {
  const unavailable = async (): Promise<never> => { throw new Error("SWARM_EXECUTION_RESOLVER_UNAVAILABLE"); };
  const control = new SwarmContainment({ ...dependencies, store, authenticate, now, resolve: unavailable, heartbeatKey: unavailable, verifyOutcome: unavailable });
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
        leases: Object.values(state.leases).map(l => ({ id: l.id, memberId: l.memberId, swarmId: l.swarmId, state: l.state, expiresAt: l.expiresAt, budgetId: l.classification.budget?.id ?? null })),
        receipts: state.events.slice(-100).map(e => ({ sequence: e.sequence, kind: e.kind, subjectId: e.subjectId, at: e.at, digest: e.digest, previousHash: e.previousHash })),
        totalReceipts: state.events.length,
        anomalies: detectSwarmAnomalies(state.events),
      }));
    },
    async command(input: unknown) {
      const actor = await operator();
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Invalid operation.");
      const value = input as Record<string, unknown>;
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
