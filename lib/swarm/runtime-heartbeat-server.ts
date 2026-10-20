import "server-only";
import { createServiceRoleClient } from "../supabase/service-role";
import { SwarmContainment } from "./containment";
import { createSwarmStore } from "./store";
import { swarmRpcPersistence } from "./rpc-persistence";
import { persistSwarmReceiptProjection, recoverPersistedSwarmProjections } from "./evidence-projection-server";
import { publicApiEnvironmentMetadata } from "../public-api/v1/environment";
import { PublicApiError } from "../public-api/v1/contracts";
import type { PublicApiPrincipal } from "../public-api/v1/authentication";
export async function ingestSwarmHeartbeat(principal: PublicApiPrincipal, memberId: string, body: Record<string, unknown>, audience: string) {
  const environment = publicApiEnvironmentMetadata();
  if (process.env.SWARM_AUTHORITY_REQUIRED !== "true" || !environment.valid || audience !== `${environment.origin}/api/v1`) throw new PublicApiError("HEARTBEAT_ENVIRONMENT_MISMATCH", "Swarm heartbeat is not enabled for this environment.", 409);
  const db = createServiceRoleClient();
  const binding = await db.from("public_api_agent_bindings").select("operational_entity_id").eq("tenant_id", principal.tenantId).eq("client_id", principal.clientId).eq("operational_entity_id", memberId).maybeSingle();
  if (binding.error || !binding.data) throw new PublicApiError("AGENT_NOT_FOUND", "Agent binding unavailable.", 404);
  const store = createSwarmStore(swarmRpcPersistence((name, args) => db.rpc(name, args)));
  const unavailable = async (): Promise<never> => { throw new Error("UNAVAILABLE"); };
  const control = new SwarmContainment({ store, now: Date.now, resolve: unavailable, heartbeatKey: unavailable, verifyOutcome: unavailable,
    authenticate: async () => { const member = await store.transact(principal.tenantId, s => s.members[memberId]); return member ? { id: memberId, tenantId: principal.tenantId, kind: "agent", controlledBy: [], permissions: [], expiresAt: Date.now() + 5000, credentialVersion: member.credentialVersion } : null; } });
  try {
    if (body.mode !== "swarm" || !body.claims || typeof body.claims !== "object" || (body.claims as { memberId?: unknown }).memberId !== memberId || typeof body.signature !== "string") throw new Error("INVALID");
    const receipt = await control.signedHeartbeat(principal.tenantId, "bound-api-client", body.claims as Parameters<typeof control.signedHeartbeat>[2], body.signature, audience);
    await persistSwarmReceiptProjection(receipt); await recoverPersistedSwarmProjections(principal.tenantId);
    return { mode: "swarm", agent_id: memberId, receipt: receipt.digest, downstream_execution_observed: false };
  } catch { throw new PublicApiError("HEARTBEAT_SIGNATURE_INVALID", "Swarm heartbeat or current runtime binding could not be verified.", 409); }
}
