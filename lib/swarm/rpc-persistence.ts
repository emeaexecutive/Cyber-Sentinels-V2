import type { SwarmPersistence } from "./store.ts";
import type { SwarmState } from "./containment.ts";

/** Inject a server-only client. Do not expose this adapter through a raw browser RPC proxy. */
export function swarmRpcPersistence(rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>): SwarmPersistence {
  return {
    async load(tenantId) {
      const result = await rpc("load_swarm_state_v1", { p_tenant_id: tenantId });
      if (result.error) throw new Error("SWARM_PERSISTENCE_UNAVAILABLE");
      if (result.data === null) return null;
      const value = result.data as { version: number; state: SwarmState };
      if (!Number.isSafeInteger(value.version) || value.version < 1 || value.state?.tenantId !== tenantId) throw new Error("SWARM_PERSISTENCE_INVALID");
      return value;
    },
    async compareAndSwap(tenantId, version, state) {
      const result = await rpc("cas_swarm_state_v1", { p_tenant_id: tenantId, p_version: version, p_state: state });
      if (result.error || typeof result.data !== "boolean") throw new Error("SWARM_PERSISTENCE_UNAVAILABLE");
      return result.data;
    },
  };
}
