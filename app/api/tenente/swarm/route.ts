import { NextResponse } from "next/server";
import { resolveIdentityEnterprise, IdentityApiError } from "@/lib/identity-signals/enterprise-context";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { checkRequestRateLimit } from "@/lib/security";
import { swarmOperations } from "@/lib/swarm/operations";
import { swarmRpcPersistence } from "@/lib/swarm/rpc-persistence";
import { createSwarmStore } from "@/lib/swarm/store";
import type { Actor } from "@/lib/swarm/containment";
import { persistSwarmReceiptProjection } from "@/lib/swarm/evidence-projection-server";

export const dynamic = "force-dynamic";
function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
}
async function operations(request: Request, write: boolean) {
  if (process.env.TENENTE_SWARM_CONSOLE_ENABLED !== "true") throw new IdentityApiError("Swarm operations are not enabled.", 503, "SWARM_OPERATIONS_DISABLED");
  const context = await resolveIdentityEnterprise(request, write ? ["owner", "admin"] : ["owner", "admin", "reviewer", "observer"]);
  const db = createServiceRoleClient();
  const store = createSwarmStore(swarmRpcPersistence((name, args) => db.rpc(name, args)));
  return swarmOperations(store, async (): Promise<Actor> => {
    const current = await resolveIdentityEnterprise(request, write ? ["owner", "admin"] : ["owner", "admin", "reviewer", "observer"]);
    if (current.enterpriseId !== context.enterpriseId || current.user.id !== context.user.id) throw new IdentityApiError("Session changed.", 403, "SWARM_SESSION_CHANGED");
    return { id: current.user.id, tenantId: current.enterpriseId, kind: "human", controlledBy: [], expiresAt: Date.now() + 5000, permissions: write ? ["swarm:audit", "swarm:contain", "swarm:reconcile", "swarm:manage"] : ["swarm:audit"] };
  });
}
function failure(error: unknown) {
  if (error instanceof IdentityApiError) return response({ error: error.code }, error.status);
  if (error instanceof TypeError || error instanceof SyntaxError) return response({ error: "SWARM_INPUT_INVALID" }, 400);
  return response({ error: "SWARM_OPERATIONS_UNAVAILABLE" }, 503);
}
export async function GET(request: Request) {
  const limited = checkRequestRateLimit({ route: "/api/tenente/swarm:get", req: request, limit: 60, windowMs: 60000 });
  if (limited) return limited;
  try { return response({ ok: true, snapshot: await (await operations(request, false)).snapshot() }); } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  const limited = checkRequestRateLimit({ route: "/api/tenente/swarm:post", req: request, limit: 15, windowMs: 60000 });
  if (limited) return limited;
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) return response({ error: "SWARM_ORIGIN_DENIED" }, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return response({ error: "SWARM_INPUT_INVALID" }, 415);
    const ops = await operations(request, true);
    const reader = request.body?.getReader();
    if (!reader) throw new TypeError("Missing body.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return response({ error: "SWARM_INPUT_TOO_LARGE" }, 413); }
      chunks.push(value);
    }
    const receipt = await ops.command(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    await persistSwarmReceiptProjection(receipt);
    return response({ ok: true, receipt: { digest: receipt.digest, kind: receipt.kind, sequence: receipt.sequence } });
  } catch (error) { return failure(error); }
}
