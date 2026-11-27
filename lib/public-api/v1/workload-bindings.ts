import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { PublicApiError, assertOnlyFields } from "./contracts";
import type { PublicApiPrincipal as AuthenticatedApiPrincipal } from "./authentication";
import { workloadIdentityConfig } from "./workload-token";

const workloadIdPattern = /^[A-Za-z0-9_.:/-]{1,180}$/;
const subjectPattern = /^[^\s\u0000-\u001f\u007f]{1,240}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maximumBindingLifetimeMs = 90 * 24 * 60 * 60 * 1000;

function requireAdministrator(principal: AuthenticatedApiPrincipal) {
  if (!["owner", "admin"].includes(principal.role)) {
    throw new PublicApiError(
      "WORKLOAD_BINDING_ADMIN_REQUIRED",
      "Only a tenant owner or administrator can manage workload registrations.",
      403,
    );
  }
}

function validAgentId(agentId: string): string {
  if (!workloadIdPattern.test(agentId)) {
    throw new PublicApiError("INVALID_REQUEST", "The agent identifier is invalid.", 400);
  }
  return agentId;
}

async function assertAgentOwned(principal: AuthenticatedApiPrincipal, agentId: string) {
  const db = createServiceRoleClient();
  const result = await db
    .from("public_api_agent_bindings")
    .select("operational_entity_id")
    .eq("tenant_id", principal.tenantId)
    .eq("client_id", principal.clientId)
    .eq("operational_entity_id", agentId)
    .maybeSingle();
  if (result.error) {
    throw new PublicApiError("WORKLOAD_AUTH_UNAVAILABLE", "Agent ownership could not be resolved safely.", 503);
  }
  if (!result.data) {
    throw new PublicApiError("AGENT_NOT_OWNED", "The agent is unavailable to this API client.", 404);
  }
}

function publicBinding(row: Record<string, unknown>) {
  return {
    binding_id: String(row.binding_id),
    tenant_id: String(row.tenant_id),
    workload_id: String(row.operational_entity_id),
    issuer: String(row.issuer),
    subject: String(row.subject),
    scopes: Array.isArray(row.scopes) ? row.scopes.map(String) : [],
    status: String(row.status).toUpperCase(),
    expires_at: String(row.expires_at),
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
    created_at: String(row.created_at),
  };
}

export async function listWorkloadBindings(
  principal: AuthenticatedApiPrincipal,
  rawAgentId: string,
) {
  requireAdministrator(principal);
  const agentId = validAgentId(rawAgentId);
  await assertAgentOwned(principal, agentId);
  const db = createServiceRoleClient();
  const result = await db
    .from("public_api_workload_bindings")
    .select("binding_id,tenant_id,operational_entity_id,issuer,subject,scopes,status,expires_at,revoked_at,created_at")
    .eq("tenant_id", principal.tenantId)
    .eq("operational_entity_id", agentId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (result.error) {
    throw new PublicApiError("WORKLOAD_AUTH_UNAVAILABLE", "Workload registrations could not be listed safely.", 503);
  }
  return { bindings: (result.data ?? []).map(row => publicBinding(row as Record<string, unknown>)) };
}

export async function registerWorkloadBinding(
  principal: AuthenticatedApiPrincipal,
  rawAgentId: string,
  body: Record<string, unknown>,
) {
  requireAdministrator(principal);
  const agentId = validAgentId(rawAgentId);
  await assertAgentOwned(principal, agentId);
  assertOnlyFields(body, ["subject", "scopes", "expires_at"]);

  const config = workloadIdentityConfig();
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (!subjectPattern.test(subject)) {
    throw new PublicApiError("INVALID_REQUEST", "subject is invalid.", 400);
  }
  if (!Array.isArray(body.scopes)
    || body.scopes.length !== 1
    || body.scopes[0] !== "trust:request") {
    throw new PublicApiError("WORKLOAD_SCOPE_DENIED", "Only the trust:request workload scope can be registered.", 400);
  }
  const expiresAt = typeof body.expires_at === "string" ? Date.parse(body.expires_at) : Number.NaN;
  const now = Date.now();
  if (!Number.isFinite(expiresAt)
    || expiresAt <= now
    || expiresAt - now > maximumBindingLifetimeMs) {
    throw new PublicApiError("INVALID_REQUEST", "expires_at must be within the next 90 days.", 400);
  }

  const db = createServiceRoleClient();
  const result = await db
    .from("public_api_workload_bindings")
    .insert({
      tenant_id: principal.tenantId,
      operational_entity_id: agentId,
      client_id: principal.clientId,
      issuer: config.issuer,
      subject,
      scopes: ["trust:request"],
      status: "active",
      expires_at: new Date(expiresAt).toISOString(),
      created_by: principal.createdBy,
    })
    .select("binding_id,tenant_id,operational_entity_id,issuer,subject,scopes,status,expires_at,revoked_at,created_at")
    .single();
  if (result.error?.code === "23505") {
    throw new PublicApiError(
      "WORKLOAD_BINDING_CONFLICT",
      "This workload identity already has an active registration.",
      409,
    );
  }
  if (result.error || !result.data) {
    throw new PublicApiError("WORKLOAD_AUTH_UNAVAILABLE", "The workload could not be registered safely.", 503);
  }
  return publicBinding(result.data as Record<string, unknown>);
}

export async function revokeWorkloadBinding(
  principal: AuthenticatedApiPrincipal,
  rawAgentId: string,
  rawBindingId: string,
) {
  requireAdministrator(principal);
  const agentId = validAgentId(rawAgentId);
  if (!uuidPattern.test(rawBindingId)) {
    throw new PublicApiError("WORKLOAD_BINDING_NOT_FOUND", "The workload registration was not found.", 404);
  }
  await assertAgentOwned(principal, agentId);
  const db = createServiceRoleClient();
  const existing = await db
    .from("public_api_workload_bindings")
    .select("binding_id,status,revoked_at")
    .eq("tenant_id", principal.tenantId)
    .eq("operational_entity_id", agentId)
    .eq("binding_id", rawBindingId)
    .maybeSingle();
  if (existing.error) {
    throw new PublicApiError("WORKLOAD_AUTH_UNAVAILABLE", "Workload registration could not be resolved safely.", 503);
  }
  if (!existing.data) {
    throw new PublicApiError("WORKLOAD_BINDING_NOT_FOUND", "The workload registration was not found.", 404);
  }
  if (existing.data.status === "active") {
    const revokedAt = new Date().toISOString();
    const updated = await db
      .from("public_api_workload_bindings")
      .update({ status: "revoked", revoked_at: revokedAt, updated_at: revokedAt })
      .eq("tenant_id", principal.tenantId)
      .eq("operational_entity_id", agentId)
      .eq("binding_id", rawBindingId)
      .eq("status", "active")
      .select("binding_id")
      .maybeSingle();
    if (updated.error) {
      throw new PublicApiError("WORKLOAD_AUTH_UNAVAILABLE", "The workload could not be revoked safely.", 503);
    }
  }
  return { binding_id: rawBindingId, status: "REVOKED" };
}
