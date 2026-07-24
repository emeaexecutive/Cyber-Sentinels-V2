import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveIdentityUiEnterprise } from "@/lib/identity-signals/ui-enterprise";
import type { IdentityEnterpriseRole } from "@/lib/identity-signals/enterprise-context";
import { enterpriseTrustCentreRole } from "./permissions";

export async function trustCentreUiContext() {
  const { user, workspace } = await resolveIdentityUiEnterprise();
  if (!user) redirect("/login?next=%2Ftrust-centre");
  if (!workspace) return { user, workspace: null, role: null };
  const supabase = await createClient();
  const owner = await supabase
    .from("trust_workspaces")
    .select("created_by")
    .eq("id", workspace.id)
    .maybeSingle();
  let storageRole: IdentityEnterpriseRole = "owner";
  if (owner.data?.created_by !== user.id) {
    const membership = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace.id)
      .eq("user_id", user.id)
      .maybeSingle();
    storageRole = String(membership.data?.role ?? "observer") as IdentityEnterpriseRole;
  }
  return {
    user,
    workspace,
    role: enterpriseTrustCentreRole(
      storageRole,
      user.app_metadata?.trust_centre_role
    ),
  };
}
