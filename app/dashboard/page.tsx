import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveIdentityUiEnterprise } from "@/lib/identity-signals/ui-enterprise";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type Transaction = {
  transaction_id: string;
  decision: "ALLOW" | "REVIEW" | "DENY";
  trust_state: string;
  subject_type: string;
  subject_id: string;
  action_type: string;
  authority_reference: string;
  policy_version: string;
  correlation_id: string;
  requested_at: string;
};

function count(result: { count: number | null; error: unknown }) {
  return result.error ? "Unavailable" : String(result.count ?? 0);
}

export default async function DashboardPage() {
  const { user, workspace, role } = await resolveIdentityUiEnterprise();
  if (!user) redirect("/login?next=/dashboard");
  if (!workspace) return <main className="min-h-screen bg-[#04070c] p-8 text-amber-200">An enterprise workspace is required.</main>;

  const db = createServiceRoleClient();
  const [transactions, transactionCount, reviews, evidence, memory, providerEvidence, entities, keys] = await Promise.all([
    db.from("canonical_trust_transactions").select("transaction_id,decision,trust_state,subject_type,subject_id,action_type,authority_reference,policy_version,correlation_id,requested_at").eq("enterprise_id", workspace.id).order("requested_at", { ascending: false }).limit(8),
    db.from("canonical_trust_transactions").select("transaction_id", { count: "exact", head: true }).eq("enterprise_id", workspace.id),
    db.from("trust_manual_reviews").select("id", { count: "exact", head: true }).eq("tenant_id", workspace.id).in("status", ["REQUESTED", "IN_REVIEW"]),
    db.from("evidence_objects").select("evidence_id", { count: "exact", head: true }).eq("enterprise_id", workspace.id),
    db.from("canonical_trust_transactions").select("transaction_id", { count: "exact", head: true }).eq("enterprise_id", workspace.id).not("trust_memory_reference", "is", null),
    db.from("evidence_objects").select("evidence_id", { count: "exact", head: true }).eq("enterprise_id", workspace.id).eq("server_verified", true),
    db.from("operational_entities").select("entity_id", { count: "exact", head: true }).eq("enterprise_id", workspace.id),
    db.from("api_keys").select("id", { count: "exact", head: true }).eq("tenant_id", workspace.id).eq("status", "active"),
  ]);
  const unavailable = [transactions, transactionCount, reviews, evidence, memory, providerEvidence, entities, keys].some((result) => result.error);
  const rows = (transactions.data ?? []) as Transaction[];
  const metrics = [
    ["Current Trust Posture", rows[0]?.trust_state ?? "No canonical decision", "/dashboard/decisions", "Latest persisted V1 transaction state"],
    ["Recent Decisions", count(transactionCount), "/dashboard/decisions", "Persisted V1 Trust Transactions"],
    ["Open Reviews", count(reviews), "/dashboard/reviews", "Human resolution linked to immutable REVIEW decisions"],
    ["Evidence Summary", count(evidence), "/evidence-vault", "Provider-attributed and client-asserted Evidence Objects"],
    ["Operational Entities", count(entities), "/operational-entities", "Tenant-owned governed actors"],
    ["Replay Activity", count(transactionCount), "/dashboard/replay", "Canonical chronology derived from V1 transaction events"],
    ["Trust Memory", count(memory), "/dashboard/decisions", "Canonical transactions with a material Trust Memory reference"],
    ["Provider Status", count(providerEvidence), "/evidence-vault", "Server-verified provider Evidence Objects"],
    ["Pending Actions", count(reviews), "/dashboard/reviews", "Open governed review actions"],
    ["Active API clients", count(keys), "/developers/api-keys", "Tenant-scoped V1 credentials"],
  ] as const;

  return <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white md:px-8">
    <div className="mx-auto max-w-7xl">
      <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">V1 canonical operations</p>
      <h1 className="mt-3 text-4xl font-semibold">{workspace.name ?? "Enterprise"} trust control plane</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">Current decisions, evidence, authority, reviews, Replay, entities, and API clients are read from the same tenant-scoped V1 records used by the public API.</p>
      <p className="mt-2 text-xs text-zinc-500">Signed in as {role ?? "workspace member"}.</p>
      {unavailable ? <p role="alert" className="mt-6 rounded-lg border border-rose-900 bg-rose-950/20 p-4 text-sm text-rose-200">The canonical data plane is temporarily unavailable. No historical data has been substituted.</p> : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([title, value, href, detail]) => <Link key={title} href={href} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 hover:border-cyan-800"><p className="text-sm text-zinc-400">{title}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p></Link>)}
      </section>

      <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.14em] text-cyan-300">Canonical decision ledger</p><h2 className="mt-2 text-2xl font-semibold">Recent V1 transactions</h2></div><Link href="/dashboard/decisions" className="text-sm text-cyan-200">View all</Link></div>
        <div className="mt-5 grid gap-3">
          {rows.map((row) => <article key={row.transaction_id} className="rounded-lg border border-zinc-800 bg-black p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{row.action_type} · {row.subject_type}:{row.subject_id}</p><p className="mt-2 break-all font-mono text-xs text-zinc-500">{row.transaction_id}</p></div><span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">{row.decision}</span></div><p className="mt-3 text-xs text-zinc-500">Authority {row.authority_reference} · Policy {row.policy_version} · {new Date(row.requested_at).toLocaleString()}</p><div className="mt-3 flex gap-4 text-xs"><Link className="text-cyan-200" href={`/trust/transactions/${row.transaction_id}`}>Decision and receipt</Link><Link className="text-cyan-200" href={`/dashboard/replay/${row.transaction_id}`}>Replay</Link></div></article>)}
          {!unavailable && !rows.length ? <p className="rounded-lg border border-dashed border-zinc-700 p-5 text-sm text-zinc-500">No canonical V1 transactions have been persisted for this workspace.</p> : null}
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-amber-900/60 bg-amber-950/10 p-5 text-sm text-zinc-400"><p className="font-semibold text-amber-200">Historical surfaces</p><p className="mt-2">Legacy interview, passport, and pre-V1 trust dashboards remain available only as explicitly historical operational records; they do not define current V1 API truth.</p><Link href="/dashboard/trust-runtime" className="mt-3 inline-block text-amber-200">Open historical trust runtime</Link></section>
    </div>
  </main>;
}
