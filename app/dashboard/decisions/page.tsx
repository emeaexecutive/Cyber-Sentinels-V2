import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveIdentityUiEnterprise } from "@/lib/identity-signals/ui-enterprise";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function CanonicalDecisionsPage() {
  const { user, workspace } = await resolveIdentityUiEnterprise();
  if (!user) redirect("/login?next=/dashboard/decisions");
  if (!workspace) return <main className="min-h-screen bg-[#04070c] p-8 text-amber-200">An enterprise workspace is required.</main>;
  const result = await createServiceRoleClient().from("canonical_trust_transactions")
    .select("transaction_id,decision,trust_state,subject_type,subject_id,action_type,action_resource,authority_reference,policy_id,policy_version,correlation_id,reason_codes,requested_at")
    .eq("enterprise_id", workspace.id).order("requested_at", { ascending: false }).limit(100);
  const rows = result.data ?? [];
  return <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white"><div className="mx-auto max-w-6xl">
    <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">V1 canonical truth</p><h1 className="mt-3 text-4xl font-semibold">Trust decisions</h1><p className="mt-4 max-w-3xl text-zinc-400">Tenant-scoped persisted decisions with their exact authority, policy, reason, and correlation references.</p>
    {result.error ? <p role="alert" className="mt-6 rounded-lg border border-rose-900 p-4 text-rose-200">Canonical decisions are temporarily unavailable. Historical records are not shown as a fallback.</p> : null}
    <section className="mt-8 grid gap-3">{rows.map((row) => <article key={row.transaction_id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{row.action_type} · {row.subject_type}:{row.subject_id}</p><p className="mt-2 break-all font-mono text-xs text-zinc-500">{row.transaction_id}</p></div><span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">{row.decision} · {row.trust_state}</span></div><dl className="mt-4 grid gap-2 text-xs text-zinc-400 md:grid-cols-2"><div>Authority: {row.authority_reference}</div><div>Policy: {row.policy_id}:{row.policy_version}</div><div>Correlation: {row.correlation_id}</div><div>Requested: {new Date(row.requested_at).toLocaleString()}</div></dl><p className="mt-3 text-xs text-zinc-500">Reasons: {row.reason_codes?.join(", ") || "None recorded"}</p><div className="mt-4 flex gap-4 text-sm"><Link className="text-cyan-200" href={`/trust/transactions/${row.transaction_id}`}>Open receipt</Link><Link className="text-cyan-200" href={`/dashboard/replay/${row.transaction_id}`}>Open Replay</Link></div></article>)}{!result.error && !rows.length ? <p className="rounded-lg border border-dashed border-zinc-700 p-6 text-zinc-500">No canonical V1 decisions are stored for this workspace.</p> : null}</section>
  </div></main>;
}
