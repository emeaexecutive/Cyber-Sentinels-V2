import Link from "next/link";
import { redirect } from "next/navigation";
import { OperationsStatus } from "@/components/identity-signals/operations-status";
import { resolveIdentityUiEnterprise } from "@/lib/identity-signals/ui-enterprise";

export const dynamic = "force-dynamic";

export default async function IdentityOperationsPage() {
  const { user, workspace } = await resolveIdentityUiEnterprise();
  if (!user) redirect("/login?next=/dashboard/identity/operations");
  return <main className="operational-shell min-h-screen px-4 py-10 text-zinc-100 sm:px-6 md:px-8"><div className="mx-auto max-w-7xl"><nav aria-label="Identity operations navigation" className="flex flex-wrap gap-4"><Link href="/dashboard/identity" className="text-sm text-cyan-300 underline-offset-4 hover:underline">← Identity Signals</Link><Link href="/dashboard/identity/providers" className="text-sm text-cyan-300 underline-offset-4 hover:underline">Provider health</Link></nav><header className="mt-5"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Enterprise Operations</p><h1 className="mt-2 text-4xl font-semibold">Operations status</h1><p className="mt-3 max-w-4xl text-zinc-400">Repository, runtime and external-control evidence are classified separately. External production controls are never inferred from local configuration.</p></header>{workspace ? <OperationsStatus enterpriseId={workspace.id} /> : <section data-state="blocked" className="mt-8 rounded-xl border border-amber-800 bg-amber-950/20 p-6"><h2 className="text-xl font-semibold">Enterprise workspace required</h2></section>}</div></main>;
}
