import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveIdentityEnterprise, IdentityApiError } from "@/lib/identity-signals/enterprise-context";
import { createApiKeyMaterial } from "@/lib/public-api/v1/authentication";
import { PUBLIC_API_SCOPES, type PublicApiScope } from "@/lib/public-api/v1/contracts";

const fields = "id,client_id,label,key_prefix,status,scopes,expires_at,last_used_at,usage_count,rate_limit_status,created_at,revoked_at,rotated_from_id";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}

function scopes(value: unknown): PublicApiScope[] {
  if (!Array.isArray(value)) throw new TypeError("scopes must be an array");
  const result = [...new Set(value.map(String))];
  if (!result.length || result.some((scope) => !PUBLIC_API_SCOPES.includes(scope as PublicApiScope))) throw new TypeError("scopes contains an unsupported value");
  return result as PublicApiScope[];
}

function expiry(value: unknown) {
  if (!value) return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || Date.parse(value) <= Date.now()) throw new TypeError("expires_at must be in the future");
  return new Date(value).toISOString();
}

function label(value: unknown) {
  const result = String(value ?? "External agent API").trim();
  if (!result || result.length > 80) throw new TypeError("label is invalid");
  return result;
}

export async function GET(request: Request) {
  try {
    const context = await resolveIdentityEnterprise(request, ["owner", "admin", "reviewer", "observer"]);
    const db = createServiceRoleClient();
    const result = await db.from("api_keys").select(fields).eq("tenant_id", context.enterpriseId).order("created_at", { ascending: false });
    if (result.error) throw result.error;
    return json({ keys: result.data ?? [] });
  } catch (error) {
    if (error instanceof IdentityApiError) return json({ error: error.code }, error.status);
    return json({ error: "API_KEY_LIST_UNAVAILABLE" }, 503);
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveIdentityEnterprise(request, ["owner", "admin"]);
    const body = await request.json() as Record<string, unknown>;
    const environment = body.environment === "live" ? "live" : "test";
    const material = createApiKeyMaterial(environment);
    const db = createServiceRoleClient();
    const created = await db.from("api_keys").insert({
      tenant_id: context.enterpriseId,
      client_id: crypto.randomUUID(),
      owner_user_id: context.user.id,
      user_id: context.user.id,
      user_email: context.user.email,
      created_by: context.user.id,
      label: label(body.label),
      key_prefix: material.prefix,
      key_hash: material.secretHash,
      status: "active",
      scopes: scopes(body.scopes),
      expires_at: expiry(body.expires_at),
      usage_count: 0,
      rate_limit_status: "normal",
    }).select(fields).single();
    if (created.error || !created.data) throw created.error;
    return json({ key: created.data, api_key: material.rawKey, secret_shown_once: true }, 201);
  } catch (error) {
    if (error instanceof IdentityApiError) return json({ error: error.code }, error.status);
    if (error instanceof TypeError || error instanceof SyntaxError) return json({ error: "INVALID_API_KEY_INPUT" }, 400);
    console.error("Developer API key creation failed safely.", { code: (error as { code?: string })?.code ?? "UNKNOWN" });
    return json({ error: "API_KEY_CREATE_UNAVAILABLE" }, 503);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await resolveIdentityEnterprise(request, ["owner", "admin"]);
    const body = await request.json() as Record<string, unknown>;
    const keyId = String(body.key_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(keyId)) throw new TypeError("key_id is invalid");
    const db = createServiceRoleClient();
    const existing = await db.from("api_keys").select("*").eq("tenant_id", context.enterpriseId).eq("id", keyId).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) return json({ error: "API_KEY_NOT_FOUND" }, 404);
    if (body.action === "revoke") {
      const revoked = await db.from("api_keys").update({ status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("tenant_id", context.enterpriseId).eq("id", keyId).select(fields).single();
      if (revoked.error) throw revoked.error;
      return json({ key: revoked.data });
    }
    if (body.action === "rotate") {
      if (existing.data.status !== "active") return json({ error: "API_KEY_INACTIVE" }, 409);
      const environment = String(existing.data.key_prefix).startsWith("cs_live_") ? "live" : "test";
      const material = createApiKeyMaterial(environment);
      const replacement = await db.from("api_keys").insert({
        tenant_id: context.enterpriseId,
        client_id: existing.data.client_id,
        owner_user_id: context.user.id,
        user_id: context.user.id,
        user_email: context.user.email,
        created_by: context.user.id,
        label: String(existing.data.label ?? "External agent API"),
        key_prefix: material.prefix,
        key_hash: material.secretHash,
        status: "active",
        scopes: existing.data.scopes,
        expires_at: expiry(body.expires_at) ?? existing.data.expires_at,
        usage_count: 0,
        rate_limit_status: "normal",
        rotated_from_id: keyId,
      }).select(fields).single();
      if (replacement.error || !replacement.data) throw replacement.error;
      const revoked = await db.from("api_keys").update({ status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("tenant_id", context.enterpriseId).eq("id", keyId);
      if (revoked.error) throw revoked.error;
      return json({ key: replacement.data, api_key: material.rawKey, secret_shown_once: true });
    }
    return json({ error: "API_KEY_ACTION_UNSUPPORTED" }, 400);
  } catch (error) {
    if (error instanceof IdentityApiError) return json({ error: error.code }, error.status);
    if (error instanceof TypeError || error instanceof SyntaxError) return json({ error: "INVALID_API_KEY_INPUT" }, 400);
    console.error("Developer API key mutation failed safely.", { code: (error as { code?: string })?.code ?? "UNKNOWN" });
    return json({ error: "API_KEY_MUTATION_UNAVAILABLE" }, 503);
  }
}
