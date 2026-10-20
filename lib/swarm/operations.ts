import { SwarmContainment, type Actor, type SwarmStore } from "./containment.ts";

/** Authentication and tenant binding are supplied by the server, never by request JSON. */
export function swarmOperations(store: SwarmStore, authenticate: () => Promise<Actor>, now = Date.now) {
  const unavailable = async (): Promise<never> => { throw new Error("SWARM_EXECUTION_RESOLVER_UNAVAILABLE"); };
  const control = new SwarmContainment({ store, authenticate, now, resolve: unavailable, heartbeatKey: unavailable, verifyOutcome: unavailable });
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
      }));
    },
    async command(input: unknown) {
      const actor = await operator();
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Invalid operation.");
      const value = input as Record<string, unknown>;
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
