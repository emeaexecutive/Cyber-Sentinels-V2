import { PUBLIC_API_SCOPES, PublicApiError, type PublicApiScope } from "./contracts";
import { verifyApiKeyHash } from "./api-key-crypto";

export function validateApiKeyRecord(
  row: Record<string, unknown> | null,
  rawKey: string,
  requiredScopes: readonly PublicApiScope[],
  now = Date.now(),
) {
  if (!row || !row.key_hash || !verifyApiKeyHash(rawKey, String(row.key_hash))) {
    throw new PublicApiError("API_KEY_INVALID", "The API key is invalid.", 401);
  }
  if (row.status === "revoked" || row.revoked_at) {
    throw new PublicApiError("API_KEY_REVOKED", "The API key has been revoked.", 401);
  }
  if (row.status !== "active") {
    throw new PublicApiError("API_KEY_INACTIVE", "The API key is not active.", 401);
  }
  if (row.expires_at && Date.parse(String(row.expires_at)) <= now) {
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
  return {
    scopes,
    createdBy: String(row.created_by ?? row.owner_user_id ?? row.user_id),
  };
}
