import { emptySwarmState, verifySwarmReplay, type SwarmState, type SwarmStore } from "./containment.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

export type SwarmPersistence = {
  load(tenantId: string): Promise<{ version: number; state: SwarmState } | null>;
  compareAndSwap(tenantId: string, version: number, state: SwarmState): Promise<boolean>;
};
/** CAS retries rerun only pure synchronous state transitions; no external effects inside callbacks. */
export function createSwarmStore(persistence: SwarmPersistence): SwarmStore {
  return { async transact<T>(tenantId: string, change: (state: SwarmState) => T): Promise<T> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const stored = await persistence.load(tenantId);
      const state = structuredClone(stored?.state ?? emptySwarmState(tenantId));
      if (state.tenantId !== tenantId || !verifySwarmReplay(state.events, tenantId)) throw new Error("SWARM_STORE_INTEGRITY");
      const before = hashCanonical(state), priorEvents = structuredClone(state.events);
      const result = change(state);
      if (hashCanonical(state) === before) return structuredClone(result);
      if (state.tenantId !== tenantId || state.events.length <= priorEvents.length || priorEvents.some((e, i) => hashCanonical(e) !== hashCanonical(state.events[i])) || !verifySwarmReplay(state.events, tenantId)) throw new Error("SWARM_APPEND_ONLY_VIOLATION");
      if (await persistence.compareAndSwap(tenantId, stored?.version ?? 0, state)) return structuredClone(result);
    }
    throw new Error("SWARM_STORE_CONTENTION");
  } };
}
