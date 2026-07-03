import type { Metadata } from "next";
import { AccessGovernanceCenter } from "@/components/access-governance-center";
import { loadAccessGovernanceOverview } from "@/lib/access-governance";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Identity Governance | Cyber Sentinels",
  description: "Trust Operations for explainable identity, workflow verification and intelligent-system authorization governance.",
};

export default async function EnterpriseIdentityGovernancePage() {
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: "/enterprise/identity-governance" });
  const overview = await loadAccessGovernanceOverview(supabase);
  return <AccessGovernanceCenter overview={overview} enterprise />;
}
