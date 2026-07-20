import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConsentAdminSummary } from "@/src/components/consent/ConsentAdminSummary";

export const dynamic = "force-dynamic";
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export default async function ConsentAdminPage({searchParams}:{searchParams:Promise<{enterpriseId?:string}>}) {
  const supabase = await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/login?next=/admin/consent");
  const enterpriseId=(await searchParams).enterpriseId??process.env.CONSENT_DEFAULT_ENTERPRISE_ID??"";
  if(uuidPattern.test(enterpriseId)){const workspace=await supabase.from("trust_workspaces").select("created_by").eq("id",enterpriseId).maybeSingle();let allowed=workspace.data?.created_by===user.id;if(!allowed){const membership=await supabase.from("workspace_members").select("role").eq("workspace_id",enterpriseId).eq("user_id",user.id).maybeSingle();allowed=["owner","admin"].includes(String(membership.data?.role??""));}if(!allowed)redirect("/dashboard");}
  return <main className="min-h-screen bg-[#04070c] px-6 py-10 text-white"><div className="mx-auto max-w-6xl"><p className="text-sm uppercase tracking-[0.16em] text-cyan-300">Enterprise Trust Consent Manager™</p><h1 className="mt-3 text-4xl font-semibold">Consent operations</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">Aggregate reporting uses minimum cohort thresholds and does not expose identifiable browsing histories. Policy and regional behavior are configuration-driven.</p><div className="mt-8"><ConsentAdminSummary enterpriseId={enterpriseId} /></div></div></main>;
}
