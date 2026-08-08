import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { projectOperationalEntityIntelligence } from "@/lib/operational-entities/intelligence";
import { loadOperationalEntities, loadOperationalEntityDetail } from "@/lib/operational-entities/server";

export const dynamic = "force-dynamic";

const panel = "rounded-2xl border border-slate-800 bg-slate-950 p-5";

function text(value: unknown, fallback = "UNKNOWN") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function values(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export default async function TrustRuntimeDemoPage({ searchParams }: { searchParams: Promise<{ entityId?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/demo/trust-runtime");
  const entities = await loadOperationalEntities({ supabase, user });
  const requested = (await searchParams).entityId;
  const selected = entities.find((entity) => entity.entityId === requested) ?? entities[0] ?? null;
  const detail = selected ? await loadOperationalEntityDetail({ supabase, user, entityId: selected.entityId }) : null;

  if (!detail) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-amber-700/40 bg-amber-950/20 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Internal product proof</p>
          <h1 className="mt-3 text-3xl font-semibold">Trust Runtime has insufficient tenant evidence.</h1>
          <p className="mt-4 text-slate-300">No persisted Operational Entity is available. This surface does not substitute a fixture or simulated healthy state.</p>
        </div>
      </main>
    );
  }

  const intelligence = projectOperationalEntityIntelligence(detail);
  const latest = detail.transactions.at(-1) ?? null;
  const snapshot = latest?.decision_time_snapshot && typeof latest.decision_time_snapshot === "object" ? latest.decision_time_snapshot as Record<string, unknown> : {};
  const enforcement = snapshot.enforcementState && typeof snapshot.enforcementState === "object" ? snapshot.enforcementState as Record<string, unknown> : {};
  const transactionId = text(latest?.transaction_id, "");
  const transactionHref = transactionId ? `/trust/transactions/${encodeURIComponent(transactionId)}` : `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`;
  const evidence = Array.isArray(latest?.evidence_references) ? latest.evidence_references as Array<Record<string, unknown>> : [];
  const items: Array<[string, unknown, string]> = [
    ["OPERATIONAL ENTITY", detail.entity.displayReference, `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`],
    ["IDENTITY", detail.externalIdentities.length ? `${detail.externalIdentities.length} persisted reference(s)` : "NOT YET VERIFIED", `/operational-entities/${encodeURIComponent(detail.entity.entityId)}#external-identities`],
    ["ACCOUNTABLE OWNER", detail.entity.accountableOwnerId || "UNKNOWN", `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`],
    ["AUTHORITY", latest?.authority_reference ?? "NOT RECORDED", transactionHref],
    ["EVIDENCE", evidence.length ? `${evidence.length} normalized reference(s)` : "INSUFFICIENT EVIDENCE", `${transactionHref}#provider-evidence`],
    ["CONSEQUENCE", snapshot.consequence ?? detail.entity.currentConsequenceClassification, transactionHref],
    ["DECISION", latest?.decision ?? "NOT RECORDED", transactionHref],
    ["EXECUTION", latest?.external_state ?? "NOT REQUESTED", transactionHref],
    ["OUTCOME", enforcement.businessOutcome ?? latest?.external_state ?? "UNKNOWN", transactionHref],
    ["TRUST DRIFT", intelligence.drift.state, `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`],
    ["TRUST HEALTH", intelligence.health.overallState, `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`],
    ["TRUST CONFIDENCE", intelligence.confidence.level, transactionHref],
    ["RECOMMENDATION", intelligence.recommendation.recommendation, `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`],
    ["REPLAY", detail.replay.length ? `${detail.replay.length} persisted session(s)` : "NOT RECORDED", transactionHref],
    ["TRUST MEMORY", detail.trustMemory.length ? `${detail.trustMemory.length} material record(s)` : "NO MATERIAL RECORD", `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`],
  ];

  return (
    <main className="min-h-screen bg-[#05080d] px-5 py-12 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-5 border-b border-slate-800 pb-8 lg:flex-row lg:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Authenticated internal demonstration · Persisted data only</p><h1 className="mt-3 text-4xl font-semibold">Trust Runtime transaction proof</h1><p className="mt-3 max-w-3xl text-slate-400">This surface projects the selected tenant’s stored Operational Entity, canonical decisions, evidence, execution records, Replay and Trust Memory. It never runs a fixture on page load.</p></div>
          <form className="flex gap-2" action="/demo/trust-runtime"><label className="sr-only" htmlFor="entityId">Operational Entity</label><select id="entityId" name="entityId" defaultValue={detail.entity.entityId} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">{entities.map((entity) => <option key={entity.entityId} value={entity.entityId}>{entity.displayReference}</option>)}</select><button className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950">Load</button></form>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {items.map(([label, item, href]) => <Link href={href} key={label} className={`${panel} transition hover:border-cyan-500`}><p className="text-xs font-semibold tracking-[0.12em] text-slate-500">{label}</p><p className="mt-3 break-words text-lg font-semibold text-slate-100">{text(item)}</p><p className="mt-3 text-xs text-cyan-300">Open underlying record →</p></Link>)}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <article className={panel}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Why did Cyber Sentinels make this decision?</p>
            <h2 className="mt-3 text-2xl font-semibold">Exact reason codes and evidence</h2>
            <div className="mt-5 flex flex-wrap gap-2">{values(latest?.reason_codes).length ? values(latest?.reason_codes).map((reason) => <code key={reason} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{reason}</code>) : <span className="text-sm text-amber-300">NO DECISION REASON CODES RECORDED</span>}</div>
            <div className="mt-6 space-y-3">{intelligence.evidenceIndex.length ? intelligence.evidenceIndex.map((entry) => <Link href={entry.href} key={entry.reference} className="block rounded-xl border border-slate-800 p-4 hover:border-cyan-700"><p className="font-medium">{entry.label}</p><p className="mt-1 break-all font-mono text-xs text-slate-500">{entry.reference}</p></Link>) : <p className="rounded-xl border border-amber-800/40 p-4 text-amber-200">INSUFFICIENT EVIDENCE</p>}</div>
          </article>
          <aside className={panel}>
            <h2 className="text-xl font-semibold">Deterministic explanation</h2>
            <div className="mt-5 space-y-4">{intelligence.narrative.map((sentence) => <div key={sentence.text}><p className="text-slate-300">{sentence.text}</p><p className="mt-1 break-all font-mono text-xs text-slate-600">{sentence.evidenceReferences.join(", ")}</p></div>)}</div>
            <dl className="mt-6 space-y-4 text-sm"><div><dt className="text-slate-500">What changed?</dt><dd className="mt-1">{intelligence.drift.reasonCodes.join(", ") || "NO MATERIAL DRIFT RECORDED"}</dd></div><div><dt className="text-slate-500">What is unknown?</dt><dd className="mt-1">{intelligence.explanation.unknowns.join(", ") || "No unknown condition was derived from the current snapshot."}</dd></div><div><dt className="text-slate-500">What would restore trust?</dt><dd className="mt-1">{intelligence.explanation.restorationRequirements.join(", ") || "NO ACTION REQUIRED"}</dd></div></dl>
          </aside>
        </section>
      </div>
    </main>
  );
}
