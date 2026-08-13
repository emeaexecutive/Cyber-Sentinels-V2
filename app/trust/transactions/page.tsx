import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveOperationalEntityTenantId } from "@/lib/operational-entities/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TransactionRow = {
  transaction_id: string;
  operational_entity_id: string | null;
  decision: string;
  trust_state: string;
  requested_at: string;
  authority_reference: string | null;
  action_type: string | null;
  action_resource: string | null;
};

export default async function TrustTransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/trust/transactions");

  let rows: TransactionRow[] = [];
  let message = "";
  try {
    const enterpriseId = await resolveOperationalEntityTenantId(supabase, user);
    const result = await supabase
      .from("canonical_trust_transactions")
      .select("transaction_id,operational_entity_id,decision,trust_state,requested_at,authority_reference,action_type,action_resource")
      .eq("enterprise_id", enterpriseId)
      .order("requested_at", { ascending: false })
      .limit(100);
    if (result.error) throw result.error;
    rows = (result.data ?? []) as TransactionRow[];
  } catch (error) {
    console.error("Canonical transaction index failed safely.", { code: (error as { code?: string })?.code ?? "UNKNOWN" });
    message = "Decisions could not be loaded. No transaction data was inferred.";
  }

  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-12 md:px-8">
    <header className="max-w-3xl"><p className="operational-eyebrow">Decisions / Transactions</p><h1 className="mt-3 text-3xl font-semibold text-slate-950 md:text-5xl">What was allowed, reviewed, or denied—and why.</h1><p className="mt-4 text-sm leading-7 text-slate-600">Each row is a persisted, tenant-scoped trust transaction. Open it for evidence, authority, policy, replay, enforcement, and outcome history.</p></header>
    {message ? <p role="alert" className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{message}</p> : null}
    {!message && rows.length === 0 ? <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8"><h2 className="text-xl font-semibold">No decisions yet</h2><p className="mt-2 text-sm text-slate-600">Run the first controlled Operational Entity journey to create evidence-backed decisions.</p><Link className="mt-5 inline-flex font-semibold underline" href="/operational-entities">Open Operational Entities</Link></section> : null}
    {rows.length ? <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Decision</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Trust</th><th className="px-4 py-3">Authority</th><th className="px-4 py-3"><span className="sr-only">Open</span></th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.transaction_id}><td className="px-4 py-4 text-slate-600">{new Date(row.requested_at).toLocaleString()}</td><td className="px-4 py-4 font-semibold text-slate-950">{row.decision}</td><td className="px-4 py-4 text-slate-700">{row.action_type ?? "Not recorded"}<span className="block text-xs text-slate-500">{row.action_resource ?? "No resource reference"}</span></td><td className="px-4 py-4 text-slate-700">{row.trust_state}</td><td className="max-w-56 truncate px-4 py-4 text-slate-600" title={row.authority_reference ?? "Not recorded"}>{row.authority_reference ?? "Not recorded"}</td><td className="px-4 py-4"><Link className="font-semibold underline" href={`/trust/transactions/${encodeURIComponent(row.transaction_id)}`}>View history</Link></td></tr>)}</tbody></table></div> : null}
  </main>;
}
