import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NetworkIntelligenceDashboard } from "@/components/network-intelligence-dashboard";
import { loadNetworkIntelligence } from "@/lib/network-intelligence-server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Network Risk | Cyber Sentinels",
  description: "Aggregated, explainable operational workflow risk patterns.",
};

export default async function NetworkRiskPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/network-risk");
  const intelligence = await loadNetworkIntelligence(supabase);
  return <NetworkIntelligenceDashboard {...intelligence} />;
}
