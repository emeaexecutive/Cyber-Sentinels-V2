import "server-only";

import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  PublicApiError,
  type PublicApiScope,
} from "./contracts";
import {
  PUBLIC_API_KEY_PATTERN,
} from "./api-key-crypto";
import { validateApiKeyRecord } from "./api-key-lifecycle";

export { createApiKeyMaterial, createRotatedApiKeyMaterial, verifyApiKeyHash } from "./api-key-crypto";

export type PublicApiPrincipal = {
  tenantId: string;
  clientId: string;
  keyId: string;
  keyPrefix: string;
  createdBy: string;
  role: "owner" | "admin" | "reviewer" | "observer";
  authorityManagementBoundary: AuthorityManagementBoundary | null;
  scopes: PublicApiScope[];
  user: User;
};

export type AuthorityManagementBoundary = {
  actions: string[];
  targetPrefixes: string[];
  purposes: string[];
  environments: string[];
  maxTtlSeconds: number;
};

function authorityBoundary(value: unknown): AuthorityManagementBoundary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const strings = (field: string) => Array.isArray(row[field]) ? row[field].map(String) : [];
  const maxTtlSeconds = Number(row.max_ttl_seconds ?? row.maxTtlSeconds);
  if (!Number.isInteger(maxTtlSeconds) || maxTtlSeconds < 300 || maxTtlSeconds > 7_776_000) return null;
  const boundary = {
    actions: strings("actions"),
    targetPrefixes: strings("target_prefixes").length ? strings("target_prefixes") : strings("targetPrefixes"),
    purposes: strings("purposes"),
    environments: strings("environments"),
    maxTtlSeconds,
  };
  return Object.values(boundary).some((item) => Array.isArray(item) && item.length === 0) ? null : boundary;
}

export function parseApiKey(rawKey: string) {
  const match = PUBLIC_API_KEY_PATTERN.exec(rawKey);
  if (!match) throw new PublicApiError("API_KEY_INVALID", "The API key is invalid.", 401);
  return { prefix: `cs_${match[1]}_${match[2]}`, environment: match[1] as "test" | "live" };
}

export async function authenticatePublicApiRequest(
  request: Request,
  requiredScopes: readonly PublicApiScope[],
): Promise<PublicApiPrincipal> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new PublicApiError("AUTHENTICATION_REQUIRED", "A Bearer API key is required.", 401);
  }
  const rawKey = authorization.slice(7).trim();
  const { prefix } = parseApiKey(rawKey);
  const db = createServiceRoleClient();
  const result = await db
    .from("api_keys")
    .select("id,tenant_id,client_id,key_prefix,key_hash,status,scopes,expires_at,revoked_at,created_by,owner_user_id,user_id,usage_count,authority_management_boundary")
    .eq("key_prefix", prefix)
    .maybeSingle();
  if (result.error) {
    throw new PublicApiError("API_AUTH_UNAVAILABLE", "API authentication is temporarily unavailable.", 503);
  }
  const row = result.data as Record<string, unknown> | null;
  const { scopes, createdBy } = validateApiKeyRecord(row, rawKey, requiredScopes);
  const authenticatedRow = row as Record<string, unknown>;
  const [workspace, membership] = await Promise.all([
    db.from("trust_workspaces").select("created_by").eq("id", authenticatedRow.tenant_id).maybeSingle(),
    db.from("workspace_members").select("role").eq("workspace_id", authenticatedRow.tenant_id).eq("user_id", createdBy).maybeSingle(),
  ]);
  if (workspace.error || membership.error) {
    throw new PublicApiError("API_AUTH_UNAVAILABLE", "API authorization is temporarily unavailable.", 503);
  }
  const role = workspace.data?.created_by === createdBy
    ? "owner"
    : String(membership.data?.role ?? "");
  if (!["owner", "admin", "reviewer", "observer"].includes(role)) {
    throw new PublicApiError("API_KEY_INACTIVE", "The API key owner no longer has tenant access.", 401);
  }
  await db
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString(), usage_count: Number(authenticatedRow.usage_count ?? 0) + 1 })
    .eq("id", authenticatedRow.id);
  return {
    tenantId: String(authenticatedRow.tenant_id),
    clientId: String(authenticatedRow.client_id),
    keyId: String(authenticatedRow.id),
    keyPrefix: prefix,
    createdBy,
    role: role as PublicApiPrincipal["role"],
    authorityManagementBoundary: authorityBoundary(authenticatedRow.authority_management_boundary),
    scopes,
    user: {
      id: String(authenticatedRow.client_id),
      aud: "authenticated",
      role: "authenticated",
      email: undefined,
      app_metadata: { active_enterprise_id: String(authenticatedRow.tenant_id), principal_type: "api_client" },
      user_metadata: {},
      identities: [],
      created_at: new Date(0).toISOString(),
    } as User,
  };
}
