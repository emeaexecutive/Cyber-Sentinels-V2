import "server-only";
import { createServiceRoleClient } from "../supabase/service-role";
import type { SwarmEvent } from "./containment";
import { projectSwarmReceipt } from "./evidence-projection";
export async function persistSwarmReceiptProjection(receipt: SwarmEvent) {
  const db = createServiceRoleClient();
  await projectSwarmReceipt(receipt, async (table, row) => {
    const result = await db.from(table).insert(row);
    if (result.error && result.error.code !== "23505") throw new Error("SWARM_PROJECTION_UNAVAILABLE");
  });
}

/** Invoked automatically by controlled execution and authenticated operations. */
export async function recoverPersistedSwarmProjections(tenantId: string) {
  const db = createServiceRoleClient();
  const { swarmRpcPersistence } = await import("./rpc-persistence");
  const { recoverSwarmProjections } = await import("./projection-recovery");
  const state = await swarmRpcPersistence((name, args) => db.rpc(name, args)).load(tenantId);
  if (!state) return { projected: 0, through: 0, remaining: 0 };
  async function cursor(expected: number | null = null, next: number | null = null) {
    const result = await db.rpc("swarm_projection_cursor_v1", { p_tenant_id: tenantId, p_expected: expected, p_next: next });
    if (result.error || !Number.isSafeInteger(result.data)) throw new Error("SWARM_PROJECTION_CURSOR_UNAVAILABLE");
    return result.data as number;
  }
  return recoverSwarmProjections(tenantId, state.state.events, { read: () => cursor(), advance: cursor }, persistSwarmReceiptProjection);
}
