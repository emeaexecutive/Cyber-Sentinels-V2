import "server-only";

import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  PUBLIC_API_SCOPES,
  PublicApiError,
  type PublicApiScope,
} from "./contracts";
import {
  PUBLIC_API_KEY_PATTERN,
  verifyApiKeyHash,
} from "./api-key-crypto";

export { createApiKeyMaterial, verifyApiKeyHash } from "./api-key-crypto";

export type PublicApiPrincipal = {
  tenantId: string;
  clientId: string;
  keyId: string;
  keyPrefix: string;
  createdBy: string;
  scopes: PublicApiScope[];
  user: User;
};

export function parseApiKey(rawKey: string) {
  const match = PUBLIC_API_KEY_PATTERN.exec(rawKey);
  if (!match) throw new PublicApiError("AUTHENTICATION_REQUIRED", "A valid Bearer API key is required.", 401);
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
    .select("id,tenant_id,client_id,key_prefix,key_hash,status,scopes,expires_at,revoked_at,created_by,owner_user_id,user_id,usage_count")
    .eq("key_prefix", prefix)
    .maybeSingle();
  if (result.error) {
    throw new PublicApiError("API_AUTH_UNAVAILABLE", "API authentication is temporarily unavailable.", 503);
  }
  const row = result.data;
  if (!row || !row.key_hash || !verifyApiKeyHash(rawKey, String(row.key_hash))) {
    throw new PublicApiError("INVALID_API_KEY", "The API key is invalid.", 401);
  }
  if (row.status === "revoked" || row.revoked_at) {
    throw new PublicApiError("API_KEY_REVOKED", "The API key has been revoked.", 401);
  }
  if (row.status !== "active") {
    throw new PublicApiError("API_KEY_INACTIVE", "The API key is not active.", 401);
  }
  if (row.expires_at && Date.parse(String(row.expires_at)) <= Date.now()) {
    throw new PublicApiError("API_KEY_EXPIRED", "The API key has expired.", 401);
  }
  const scopes = Array.isArray(row.scopes)
    ? row.scopes.filter((scope): scope is PublicApiScope => PUBLIC_API_SCOPES.includes(scope as PublicApiScope))
    : [];
  const missing = requiredScopes.filter((scope) => !scopes.includes(scope));
  if (missing.length) {
    throw new PublicApiError("INSUFFICIENT_SCOPE", `Missing required scope: ${missing[0]}.`, 403);
  }
  if (!row.tenant_id || !row.client_id || !row.created_by) {
    throw new PublicApiError("API_KEY_NOT_TENANT_BOUND", "The API key is not configured for public API access.", 403);
  }
  await db
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString(), usage_count: Number((row as Record<string, unknown>).usage_count ?? 0) + 1 })
    .eq("id", row.id);
  const createdBy = String(row.created_by ?? row.owner_user_id ?? row.user_id);
  return {
    tenantId: String(row.tenant_id),
    clientId: String(row.client_id),
    keyId: String(row.id),
    keyPrefix: prefix,
    createdBy,
    scopes,
    user: {
      id: String(row.client_id),
      aud: "authenticated",
      role: "authenticated",
      email: undefined,
      app_metadata: { active_enterprise_id: String(row.tenant_id), principal_type: "api_client" },
      user_metadata: {},
      identities: [],
      created_at: new Date(0).toISOString(),
    } as User,
  };
}
