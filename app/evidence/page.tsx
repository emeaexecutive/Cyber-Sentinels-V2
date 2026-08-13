import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveOperationalEntityTenantId } from "@/lib/operational-entities/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EvidenceNode = { node_id: string; node_type: string; external_id: string; domain_key: string | null; created_at: string };

export default async function EvidencePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/evidence");
  let nodes: EvidenceNode[] = [];
  let message = "";
  try {
    const enterpriseId = await resolveOperationalEntityTenantId(supabase, user);
    const result = await supabase.from("evidence_graph_nodes").select("node_id,node_type,external_id,domain_key,created_at").eq("enterprise_id", enterpriseId).order("created_at", { ascending: false }).limit(100);
    if (result.error) throw result.error;
    nodes = (result.data ?? []) as EvidenceNode[];
  } catch (error) {
    console.error("Evidence index failed safely.", { code: (error as { code?: string })?.code ?? "UNKNOWN" });
    message = "Evidence could not be loaded. No evidence state was inferred.";
  }
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-12 md:px-8"><header className="max-w-3xl"><p className="operational-eyebrow">Evidence</p><h1 className="mt-3 text-3xl font-semibold text-slate-950 md:text-5xl">The records behind operational trust.</h1><p className="mt-4 text-sm leading-7 text-slate-600">This is the tenant-scoped evidence graph index. Evidence supports a decision; provider presence alone never establishes trust.</p></header>{message ? <p role="alert" className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{message}</p> : null}{!message && !nodes.length ? <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8"><h2 className="text-xl font-semibold">No evidence recorded</h2><p className="mt-2 text-sm text-slate-600">Complete a controlled entity verification or transaction to create persisted evidence.</p><Link className="mt-5 inline-flex font-semibold underline" href="/operational-entities">Open Operational Entities</Link></section> : null}{nodes.length ? <section aria-label="Recent evidence" className="mt-8 grid gap-3 md:grid-cols-2">{nodes.map((node) => <article key={node.node_id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-slate-950">{node.node_type.replaceAll("_", " ")}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{node.domain_key ?? "Unclassified domain"}</span></div><p className="mt-3 break-all text-sm text-slate-700">{node.external_id}</p><p className="mt-3 text-xs text-slate-500">Recorded {new Date(node.created_at).toLocaleString()}</p><details className="mt-4 text-xs text-slate-500"><summary className="cursor-pointer font-semibold">Technical reference</summary><p className="mt-2 break-all font-mono">{node.node_id}</p></details></article>)}</section> : null}</main>;
}
