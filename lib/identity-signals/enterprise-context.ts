import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "./core";

export type IdentityEnterpriseRole = "owner" | "admin" | "reviewer" | "observer";

export class IdentityApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); this.name = "IdentityApiError"; }
}

export async function resolveIdentityEnterprise(request: Request, allowedRoles: IdentityEnterpriseRole[] = ["owner", "admin", "reviewer", "observer"]) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new IdentityApiError("Authentication required.", 401, "AUTHENTICATION_REQUIRED");
  const enterpriseId = request.headers.get("x-enterprise-id")?.trim();
  if (!isUuid(enterpriseId)) throw new IdentityApiError("A valid X-Enterprise-Id header is required.", 400, "ENTERPRISE_HEADER_REQUIRED");
  const workspace = await supabase.from("trust_workspaces").select("id,created_by").eq("id", enterpriseId).maybeSingle();
  if (workspace.error || !workspace.data) throw new IdentityApiError("Enterprise access denied.", 403, "ENTERPRISE_ACCESS_DENIED");
  let role: IdentityEnterpriseRole = "owner";
  if (workspace.data.created_by !== user.id) {
    const membership = await supabase.from("workspace_members").select("role").eq("workspace_id", enterpriseId).eq("user_id", user.id).maybeSingle();
    if (membership.error || !membership.data) throw new IdentityApiError("Enterprise access denied.", 403, "ENTERPRISE_ACCESS_DENIED");
    role = String(membership.data.role) as IdentityEnterpriseRole;
  }
  if (!allowedRoles.includes(role)) throw new IdentityApiError("This enterprise role cannot perform the requested action.", 403, "ENTERPRISE_ROLE_DENIED");
  return { supabase, user: user as User, enterpriseId, role };
}
