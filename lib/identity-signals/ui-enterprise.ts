import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function resolveIdentityUiEnterprise() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, workspace: null, role: null };
  const owned = await supabase.from("trust_workspaces").select("id,name").eq("created_by", user.id).order("created_at").limit(1).maybeSingle();
  if (owned.data) return { user, workspace: owned.data, role: "owner" as const };
  const membership = await supabase.from("workspace_members").select("workspace_id,role,trust_workspaces(id,name)").eq("user_id", user.id).limit(1).maybeSingle();
  const workspace = membership.data?.trust_workspaces as unknown as { id: string; name: string | null } | null;
  return { user, workspace, role: workspace ? String(membership.data?.role ?? "observer") : null };
}
