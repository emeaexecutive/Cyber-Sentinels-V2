import "server-only";

import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { PublicApiError, type PublicApiScope } from "./contracts";
import type { PublicApiPrincipal } from "./authentication";
import {
  createWorkloadTokenVerifier,
  workloadIdentityConfig,
  type WorkloadIdentityConfig,
} from "./workload-token";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const workloadIdPattern = /^[A-Za-z0-9_.:/-]{1,180}$/;
const allowedWorkloadScopes = new Set<PublicApiScope>(["trust:request"]);
type WorkloadTokenVerifier = ReturnType<typeof createWorkloadTokenVerifier>;
let verifierCache: { configurationKey: string; verify: WorkloadTokenVerifier } | null = null;

function verifierFor(config: WorkloadIdentityConfig): WorkloadTokenVerifier {
  const configurationKey = JSON.stringify(config);
  if (!verifierCache || verifierCache.configurationKey !== configurationKey) {
    verifierCache = { configurationKey, verify: createWorkloadTokenVerifier(config) };
  }
  return verifierCache.verify;
}

export type WorkloadApiPrincipal = {
  principal: PublicApiPrincipal;
  agentId: string;
  bindingId: string;
};

function userFor(ownerId: string): User {
  return {
    id: ownerId,
    aud: "authenticated",
    role: "authenticated",
    email: undefined,
    app_metadata: { principal_type: "workload_owner" },
    user_metadata: {},
    identities: [],
    created_at: new Date(0).toISOString(),
  };
}

export async function authenticateRegisteredWorkload(
  request: Request,
  expectedAgentId: string,
  requiredScope: PublicApiScope,
): Promise<WorkloadApiPrincipal> {
  if (!workloadIdPattern.test(expectedAgentId)) {
    throw new PublicApiError("WORKLOAD_BINDING_NOT_FOUND", "The workload is unavailable.", 404);
  }
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match) {
    throw new PublicApiError("AUTHENTICATION_REQUIRED", "A workload access token is required.", 401);
  }

  const config = workloadIdentityConfig();
  const claims = await verifierFor(config)(match[1]);
  if (claims.issuer !== config.issuer || claims.workloadId !== expectedAgentId) {
    throw new PublicApiError("WORKLOAD_BINDING_NOT_FOUND", "The workload is unavailable.", 404);
  }

  const db = createServiceRoleClient();
  const bindingResult = await db
    .from("public_api_workload_bindings")
    .select("binding_id,tenant_id,operational_entity_id,client_id,issuer,subject,scopes,status,expires_at,revoked_at,created_by")
    .eq("tenant_id", claims.tenantId)
    .eq("operational_entity_id", claims.workloadId)
    .eq("issuer", claims.issuer)
    .eq("subject", claims.subject)
    .maybeSingle();
  if (bindingResult.error) {
    throw new PublicApiError(
      "WORKLOAD_AUTH_UNAVAILABLE",
      "Workload registration could not be resolved safely.",
      503,
    );
  }
  const binding = bindingResult.data as Record<string, unknown> | null;
  if (!binding
    || binding.status !== "active"
    || binding.revoked_at !== null
    || Date.parse(String(binding.expires_at)) <= Date.now()) {
    throw new PublicApiError("WORKLOAD_BINDING_INACTIVE", "The workload registration is inactive.", 401);
  }
  if (binding.issuer !== config.issuer
    || binding.subject !== claims.subject
    || binding.operational_entity_id !== expectedAgentId) {
    throw new PublicApiError("WORKLOAD_BINDING_NOT_FOUND", "The workload is unavailable.", 404);
  }

  const storedScopes = Array.isArray(binding.scopes) ? binding.scopes.map(String) : [];
  if (!storedScopes.length
    || storedScopes.some(scope => !allowedWorkloadScopes.has(scope as PublicApiScope))
    || claims.scopes.some(scope => !storedScopes.includes(scope))
    || !claims.scopes.includes(requiredScope)
    || !storedScopes.includes(requiredScope)) {
    throw new PublicApiError("WORKLOAD_SCOPE_DENIED", "The workload is not authorized for this operation.", 403);
  }

  const ownerId = String(binding.created_by ?? "");
  const [workspace, membership] = await Promise.all([
    db.from("trust_workspaces").select("created_by").eq("id", claims.tenantId).maybeSingle(),
    db.from("workspace_members").select("role").eq("workspace_id", claims.tenantId).eq("user_id", ownerId).maybeSingle(),
  ]);
  if (workspace.error || membership.error) {
    throw new PublicApiError("WORKLOAD_AUTH_UNAVAILABLE", "Workload ownership could not be resolved safely.", 503);
  }
  const role = workspace.data?.created_by === ownerId ? "owner" : String(membership.data?.role ?? "");
  if (!uuidPattern.test(ownerId) || !["owner", "admin"].includes(role)) {
    throw new PublicApiError("WORKLOAD_OWNER_INACTIVE", "The workload owner no longer has tenant administration access.", 403);
  }
  const principal: PublicApiPrincipal = {
    tenantId: claims.tenantId,
    clientId: String(binding.client_id),
    keyId: String(binding.binding_id),
    keyPrefix: `wl_${String(binding.binding_id)}`,
    createdBy: ownerId,
    role: role as PublicApiPrincipal["role"],
    authorityManagementBoundary: null,
    scopes: claims.scopes,
    user: userFor(ownerId),
  };
  return { principal, agentId: expectedAgentId, bindingId: String(binding.binding_id) };
}
