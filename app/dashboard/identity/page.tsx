import Link from "next/link";
import { redirect } from "next/navigation";
import { IdentityDashboard } from "@/components/identity-signals/identity-dashboard";
import { resolveIdentityUiEnterprise } from "@/lib/identity-signals/ui-enterprise";

export const dynamic = "force-dynamic";

export default async function IdentitySignalsPage() {
  const { user, workspace } = await resolveIdentityUiEnterprise();
  if (!user) redirect("/login?next=/dashboard/identity");
  return <main className="operational-shell min-h-screen px-4 py-10 text-zinc-100 sm:px-6 md:px-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Enterprise Identity Intelligence</p><h1 className="mt-2 text-4xl font-semibold">Identity Signal Engine</h1><p className="mt-3 max-w-3xl text-zinc-400">Persisted runtime evidence only. Confidence is provisional and never an authorization decision.</p>{workspace ? <p className="mt-2 text-sm text-zinc-500">Workspace: {workspace.name ?? workspace.id}</p> : null}</div>
      <nav aria-label="Identity operations" className="flex flex-wrap gap-3"><Link href="/dashboard/identity/providers" className="brand-secondary-action">Provider truth</Link><Link href="/dashboard/identity/operations" className="brand-secondary-action">Operations status</Link></nav>
    </header>
    {workspace ? <IdentityDashboard enterpriseId={workspace.id} /> : <section data-state="blocked" className="mt-8 rounded-xl border border-amber-800 bg-amber-950/20 p-6"><h2 className="text-xl font-semibold text-amber-200">Enterprise workspace required</h2><p className="mt-2 text-amber-100/80">Create or join a Trust Workspace before accessing tenant-scoped identity signals.</p></section>}
  </div></main>;
}
