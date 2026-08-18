import { redirect } from "next/navigation";
import { resolveIdentityUiEnterprise } from "@/lib/identity-signals/ui-enterprise";
import { TrackBlockSurface } from "@/src/components/protected-workflows/TrackBlockSurface";

export const dynamic = "force-dynamic";

export default async function TrackBlockPage() {
  const { user, workspace } = await resolveIdentityUiEnterprise();
  if (!user) redirect("/login?next=/dashboard/track-block");
  return <main className="operational-shell min-h-screen px-4 py-10 text-zinc-100 sm:px-6 md:px-8"><div className="mx-auto max-w-7xl">
    <header><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Canonical Trust Fabric control</p><h1 className="mt-2 text-4xl font-semibold">Track + Block™</h1><p className="mt-3 max-w-3xl text-zinc-400">Continuous trust controls for high-risk digital interactions.</p><p className="mt-2 max-w-4xl text-sm text-zinc-500">Browser-native evidence is limited to Cyber Sentinels, browser and session events, and configured providers. Endpoint processes, remote-access software and other applications require separately configured capabilities.</p></header>
    {workspace ? <TrackBlockSurface enterpriseId={workspace.id} /> : <section data-state="blocked" className="mt-8 rounded-xl border border-amber-800 bg-amber-950/20 p-6"><h2 className="text-xl font-semibold text-amber-200">Enterprise workspace required</h2></section>}
  </div></main>;
}
