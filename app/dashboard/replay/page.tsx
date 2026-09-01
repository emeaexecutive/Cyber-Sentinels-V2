import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveIdentityUiEnterprise } from "@/lib/identity-signals/ui-enterprise";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function ReplayDashboardPage() {
  const { user, workspace } = await resolveIdentityUiEnterprise();
  if (!user) redirect("/login?next=/dashboard/replay");
  if (!workspace) return <main className="min-h-screen bg-[#04070c] p-8 text-amber-200">An enterprise workspace is required.</main>;
  const result = await createServiceRoleClient().from("canonical_trust_transactions")
    .select("transaction_id,decision,subject_type,subject_id,action_type,correlation_id,requested_at")
    .eq("enterprise_id", workspace.id).order("requested_at", { ascending: false }).limit(100);
  const rows = result.data ?? [];
  return <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white"><div className="mx-auto max-w-6xl">
    <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">V1 canonical Replay</p><h1 className="mt-3 text-4xl font-semibold">Choose a Trust Transaction</h1><p className="mt-4 max-w-3xl leading-7 text-zinc-400">Replay is reconstructed from the immutable chronology of the same canonical transaction used by the V1 API and receipt surface.</p>
    {result.error ? <p role="alert" className="mt-6 rounded-lg border border-rose-900 p-4 text-rose-200">Canonical Replay is temporarily unavailable. A legacy timeline has not been substituted.</p> : null}
    <section className="mt-8 grid gap-3 md:grid-cols-2">{rows.map((row) => <Link key={row.transaction_id} href={`/dashboard/replay/${row.transaction_id}`} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 hover:border-cyan-800"><div className="flex justify-between gap-3"><p className="font-semibold">{row.action_type}</p><span className="text-xs text-cyan-200">{row.decision}</span></div><p className="mt-2 text-sm text-zinc-400">{row.subject_type}:{row.subject_id}</p><p className="mt-3 break-all font-mono text-xs text-zinc-500">{row.transaction_id}</p><p className="mt-2 text-xs text-zinc-600">{new Date(row.requested_at).toLocaleString()}</p></Link>)}{!result.error && !rows.length ? <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-sm text-zinc-500">No canonical V1 transactions are available for Replay.</p> : null}</section>
  </div></main>;
}
