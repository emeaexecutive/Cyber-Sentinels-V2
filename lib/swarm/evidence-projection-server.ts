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
