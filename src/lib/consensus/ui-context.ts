import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveIdentityUiEnterprise } from "@/lib/identity-signals/ui-enterprise";

export async function consensusUiContext(next:string,admin=false){const {user,workspace}=await resolveIdentityUiEnterprise();if(!user)redirect(`/login?next=${encodeURIComponent(next)}`);if(!workspace)return {user,workspace:null};if(admin){const supabase=await createClient();const owned=await supabase.from("trust_workspaces").select("created_by").eq("id",workspace.id).maybeSingle();let allowed=owned.data?.created_by===user.id;if(!allowed){const membership=await supabase.from("workspace_members").select("role").eq("workspace_id",workspace.id).eq("user_id",user.id).maybeSingle();allowed=["owner","admin"].includes(String(membership.data?.role??""));}if(!allowed)redirect("/dashboard/consensus");}return {user,workspace};}
