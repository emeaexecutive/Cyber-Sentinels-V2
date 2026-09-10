import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { readIncident } from "@/lib/operational-incidents/server";
import { trustArchitectureUiContext } from "@/src/lib/trust-architecture/ui-context";

export const dynamic = "force-dynamic";
export default async function IncidentEvidencePage({ searchParams }: { searchParams: Promise<{ incident?: string }> }) {
  const { workspace } = await trustArchitectureUiContext("/dashboard/incident-evidence");
  if (!workspace) return <main className="p-8">An enterprise workspace is required.</main>;
  const { incident: selected } = await searchParams;
  const incidents = await createServiceRoleClient().from("incident_regulatory_assessments").select("id,canonical_case,created_at")
    .eq("enterprise_id", workspace.id).eq("evidence_mode", "CANONICAL_OPERATIONAL").order("created_at", { ascending: false }).limit(50);
  let pack: Awaited<ReturnType<typeof readIncident>> | null = null;
  let failure = incidents.error ? "Incident evidence is temporarily unavailable." : "";
  if (selected) {
    try { pack = await readIncident({ tenantId: workspace.id }, selected); }
    catch { failure = "This incident is unavailable in the selected workspace."; }
  }
  const sections = pack ? [
    { label: "01 Authority", rows: pack.authority_lineage.map(row => `${row.original_authority} · ${row.current_record?.status ?? "Unresolved"}`) },
    { label: "02 Actor", rows: pack.actors },
    { label: "03 Decision", rows: pack.decisions.map(row => `${row.decision} · ${row.action} · ${row.resource} · Purpose: ${row.declared_purpose}`) },
    { label: "04 Execution", rows: pack.observations.map(row => `${row.summary} · Source: ${row.source.provider}`) },
    { label: "05 Incident", rows: [String(pack.incident.summary ?? "Incident evidence"), ...pack.timeline.filter(row => row.kind === "DETECTION").map(row => row.summary)] },
    { label: "06 Intervention", rows: pack.interventions.map(row => `${row.kind}: ${row.summary}`) },
    { label: "07 Outcome", rows: pack.outcomes.map(row => `${row.outcome_layer}: ${row.outcome_status} · ${row.summary}`) },
    { label: "08 Remediation", rows: pack.remediation.map(row => row.summary) },
  ] : [];
  return <main className="min-h-screen bg-[#04070c] px-5 py-10 text-zinc-100">
    <div className="mx-auto max-w-5xl space-y-8">
      <header><p className="text-sm text-zinc-400">{workspace.name ?? "Workspace"}</p><h1 className="mt-2 text-3xl font-semibold">Incident Evidence</h1><p className="mt-3 max-w-3xl text-zinc-300">Reconstruct what was authorized, what sources reported, and how people responded. Original decisions remain unchanged.</p></header>
      {failure && <p role="alert" className="rounded border border-amber-700 p-4 text-amber-200">{failure}</p>}
      <form className="flex flex-wrap items-end gap-3"><label className="flex min-w-0 flex-1 flex-col gap-2" htmlFor="incident">Incident<select id="incident" name="incident" defaultValue={selected ?? ""} className="min-h-11 w-full min-w-0 rounded border border-zinc-700 bg-zinc-900 p-3"><option value="">Choose an incident</option>{(incidents.data ?? []).map(row => <option key={row.id} value={row.id}>{String(row.canonical_case?.summary ?? row.id)}</option>)}</select></label><button className="min-h-11 rounded bg-white px-5 py-3 font-medium text-black">Open evidence</button></form>
      {!pack && !failure && <p className="text-zinc-400">{incidents.data?.length ? "Select a recorded incident to inspect its evidence." : "No operational incidents have been recorded in this workspace."}</p>}
      {pack && <>
        <div className="flex flex-wrap gap-3 text-sm"><span className="rounded border border-zinc-700 p-3">{pack.states.evidence_completeness.replaceAll("_", " ")}</span><span className="rounded border border-zinc-700 p-3">Authority: {pack.states.authority.replaceAll("_", " ")}</span><span className="rounded border border-zinc-700 p-3">Export: {pack.states.export.replaceAll("_", " ")}</span></div>
        <div className="grid gap-6 md:grid-cols-2">{sections.map(section => <section key={section.label} className="rounded border border-zinc-800 p-5"><h2 className="text-lg font-medium">{section.label}</h2><ul className="mt-4 space-y-3 break-words text-sm text-zinc-300">{section.rows.length ? section.rows.map((row, index) => <li key={index}>{row}</li>) : <li>Evidence not available</li>}</ul></section>)}</div>
        <section id="replay"><h2 className="text-xl font-medium">Replay chronology</h2><p className="mt-2 text-sm text-zinc-400">Source timestamps and receipt times are retained separately. Verified reconstruction does not certify source clock accuracy.</p><ol className="mt-5 space-y-4">{pack.authorization_phase.map(row => <li key={row.transaction_id} className="border-l border-cyan-700 pl-4"><p className="font-medium">AUTHORIZATION · {row.decision}</p><p className="text-sm text-zinc-300">{row.action} · {row.resource}</p><p className="text-xs text-zinc-400">{row.occurred_at} · Original purpose: {row.purpose}</p></li>)}{pack.timeline.map(row => <li key={row.id} className="border-l border-zinc-700 pl-4"><p className="font-medium">{row.kind.replaceAll("_", " ")}</p><p className="text-sm text-zinc-300">{row.summary}</p><p className="mt-1 break-all text-xs text-zinc-400">Observed {row.observed_at} · Received {row.received_at} · {row.source.provider}</p></li>)}</ol>{pack.evaluation_phase.map(row => <p key={row.transaction_id} className="mt-5 border-l border-amber-700 pl-4 text-sm">Later Outcome Review: {row.review.evaluationStatus} · Original decision: {row.original_decision} · Adjudication: {row.review.adjudicatedOutcome ?? "Unresolved"}</p>)}</section>
        <section><h2 className="text-xl font-medium">Evidence and receipts</h2><ul className="mt-4 space-y-3 text-sm">{pack.receipts.map(row => <li key={row.transaction_id} className="break-all">Transaction {row.transaction_id} · <Link className="underline" href={`/api/trust/transactions/${row.transaction_id}/receipt`}>Receipt</Link> · <Link className="underline" href="#replay">Replay</Link></li>)}</ul><details className="mt-5"><summary className="cursor-pointer">Evidence references and integrity digest</summary><pre className="mt-3 overflow-auto rounded bg-zinc-900 p-4 text-xs">{JSON.stringify({ evidence: pack.evidence_references, integrity_digest: pack.integrity_digest }, null, 2)}</pre></details></section>
        {pack.gaps.length > 0 && <section><h2 className="text-xl font-medium">Evidence gaps</h2><ul className="mt-3 space-y-2 text-sm text-amber-200">{pack.gaps.map(gap => <li key={gap}>{gap.replaceAll("_", " ")}</li>)}</ul></section>}
        <p className="text-sm text-zinc-400">Provider assertions remain attributed. A canonical evidence package is not regulatory approval or compliance certification.</p>
      </>}
    </div>
  </main>;
}
