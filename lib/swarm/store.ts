import { emptySwarmState, verifySwarmReplay, type SwarmState, type SwarmStore } from "./containment.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

export type SwarmPersistence = {
  load(tenantId: string): Promise<{ version: number; state: SwarmState } | null>;
  compareAndSwap(tenantId: string, version: number, state: SwarmState): Promise<boolean>;
};
/** CAS retries rerun only pure synchronous state transitions; no external effects inside callbacks. */
export function createSwarmStore(persistence: SwarmPersistence): SwarmStore {
  // Do not let writers in one process consume each other's bounded CAS retries.
  // This queue covers only pure state transitions, never provider execution.
  // Independent processes still arbitrate through the persisted CAS below.
  const tails = new Map<string, Promise<void>>();
  async function commit<T>(tenantId: string, change: (state: SwarmState) => T): Promise<T> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const stored = await persistence.load(tenantId);
      const state = structuredClone(stored?.state ?? emptySwarmState(tenantId));
      if (state.tenantId !== tenantId || !verifySwarmReplay(state.events, tenantId)) throw new Error("SWARM_STORE_INTEGRITY");
      const before = hashCanonical(state), priorEvents = structuredClone(state.events);
      const result = change(state);
      if (hashCanonical(state) === before) return structuredClone(result);
      if (state.tenantId !== tenantId || state.events.length <= priorEvents.length || priorEvents.some((e, i) => hashCanonical(e) !== hashCanonical(state.events[i])) || !verifySwarmReplay(state.events, tenantId)) throw new Error("SWARM_APPEND_ONLY_VIOLATION");
      if (await persistence.compareAndSwap(tenantId, stored?.version ?? 0, state)) return structuredClone(result);
      // A competing process must get a chance to finish its transition instead
      // of two writers repeatedly colliding in lockstep. Keep the same retry
      // ceiling and fail-closed integrity/append-only checks.
      if (attempt < 11) await new Promise(resolve => setTimeout(resolve, 1 + Math.floor(Math.random() * Math.min(64, 2 ** attempt))));
    }
    throw new Error("SWARM_STORE_CONTENTION");
  }
  return { async transact<T>(tenantId: string, change: (state: SwarmState) => T): Promise<T> {
    const predecessor = tails.get(tenantId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const tail = predecessor.then(() => gate);
    tails.set(tenantId, tail);
    await predecessor;
    try { return await commit(tenantId, change); }
    finally {
      release();
      if (tails.get(tenantId) === tail) tails.delete(tenantId);
    }
  } };
}
