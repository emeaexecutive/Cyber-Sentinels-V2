import { redirect } from "next/navigation";
import { TrustPostureDashboard } from "@/components/trust-posture-dashboard";
import { createClient } from "@/lib/supabase/server";
import { loadTrustPostureDashboard } from "@/lib/trust-posture/dashboard";

export const dynamic = "force-dynamic";

export default async function TrustPosturePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/trust/posture");

  const snapshot = await loadTrustPostureDashboard(supabase);
  return <TrustPostureDashboard snapshot={snapshot} />;
}
