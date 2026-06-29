import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccessGovernanceCenter } from "@/components/access-governance-center";
import { loadAccessGovernanceOverview } from "@/lib/access-governance";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Access Governance | Cyber Sentinels",
  description: "Workflow access posture, authorization lineage and governance continuity.",
};

export default async function AccessGovernancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/access-governance");
  const overview = await loadAccessGovernanceOverview(supabase);
  return <AccessGovernanceCenter overview={overview} />;
}
