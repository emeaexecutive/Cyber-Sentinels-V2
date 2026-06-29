import type { Metadata } from "next";
import { NetworkIntelligenceDashboard } from "@/components/network-intelligence-dashboard";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { loadNetworkIntelligence } from "@/lib/network-intelligence-server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Consortium Intelligence | Cyber Sentinels",
  description: "Privacy-preserving operational trust and workflow risk coordination.",
};

export default async function ConsortiumIntelligencePage() {
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: "/enterprise/consortium" });
  const intelligence = await loadNetworkIntelligence(supabase);
  return <NetworkIntelligenceDashboard {...intelligence} enterprise />;
}
