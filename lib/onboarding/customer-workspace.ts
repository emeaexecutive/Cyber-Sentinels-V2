import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type WorkspaceRow = { id: string };

export class CustomerWorkspaceError extends Error {
  constructor(
    readonly operation: string,
    readonly correlationId: string,
    readonly databaseCode = "UNKNOWN",
  ) {
    super("CUSTOMER_WORKSPACE_UNAVAILABLE");
    this.name = "CustomerWorkspaceError";
  }
}

export function customerWorkspaceSlug(userId: string) {
  return `customer-${userId.toLowerCase()}`;
}

function fail(operation: string, correlationId: string, error: unknown): never {
  const databaseCode = String((error as { code?: string } | null)?.code ?? "UNKNOWN");
  console.error("Customer workspace bootstrap failed safely.", {
    operation,
    correlationId,
    code: databaseCode,
  });
  throw new CustomerWorkspaceError(operation, correlationId, databaseCode);
}

async function ensureOwnerMembership(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  correlationId: string,
) {
  const existing = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (existing.error) fail("owner_membership_lookup", correlationId, existing.error);
  if (existing.data) return;

  const inserted = await supabase.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  });
  if (inserted.error && inserted.error.code !== "23505") {
    fail("owner_membership_create", correlationId, inserted.error);
  }
}

export async function ensureCustomerWorkspace(input: {
  supabase: SupabaseClient;
  user: User;
  correlationId?: string;
}) {
  const correlationId = input.correlationId ?? crypto.randomUUID();
  const { user } = input;
  // The caller establishes the actor with the cookie-bound client before this
  // boundary. Bootstrap needs an atomic server-side path because a new owner
  // cannot satisfy membership-gated SELECT until the first membership exists.
  const supabase = createServiceRoleClient();
  const activeWorkspaceId = String(user.app_metadata?.active_enterprise_id ?? "");

  if (activeWorkspaceId) {
    const active = await supabase
      .from("trust_workspaces")
      .select("id")
      .eq("id", activeWorkspaceId)
      .maybeSingle();
    if (active.error) fail("active_workspace_lookup", correlationId, active.error);
    if (active.data) return { workspaceId: String(active.data.id), correlationId, created: false };
  }

  const owned = await supabase
    .from("trust_workspaces")
    .select("id")
    .eq("created_by", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (owned.error) fail("owned_workspace_lookup", correlationId, owned.error);
  if (owned.data) {
    const workspaceId = String(owned.data.id);
    await ensureOwnerMembership(supabase, user.id, workspaceId, correlationId);
    return { workspaceId, correlationId, created: false };
  }

  const membership = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membership.error) fail("membership_workspace_lookup", correlationId, membership.error);
  if (membership.data?.workspace_id) {
    return { workspaceId: String(membership.data.workspace_id), correlationId, created: false };
  }

  const slug = customerWorkspaceSlug(user.id);
  const created = await supabase
    .from("trust_workspaces")
    .insert({
      name: "My Trust Workspace",
      slug,
      description: "Tenant-isolated workspace for persisted Operational Entity trust records.",
      created_by: user.id,
    })
    .select("id")
    .maybeSingle();

  if (created.error && created.error.code !== "23505") {
    fail("workspace_create", correlationId, created.error);
  }
  if (created.data) {
    return { workspaceId: String((created.data as WorkspaceRow).id), correlationId, created: true };
  }

  // A concurrent request may have won the deterministic slug insert. Resolve
  // the committed row instead of creating a second tenant.
  const concurrent = await supabase
    .from("trust_workspaces")
    .select("id")
    .eq("slug", slug)
    .eq("created_by", user.id)
    .maybeSingle();
  if (concurrent.error || !concurrent.data) {
    fail("concurrent_workspace_resolution", correlationId, concurrent.error);
  }
  return { workspaceId: String(concurrent.data.id), correlationId, created: false };
}
