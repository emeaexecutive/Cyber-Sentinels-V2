"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type RecordValue = Record<string, any>;

function value(input: unknown, fallback = "Not observed") {
  if (input === null || input === undefined || input === "") return fallback;
  return String(input).replaceAll("_", " ");
}

export function TrackBlockSurface({ enterpriseId, initialData = null }: { enterpriseId: string; initialData?: RecordValue | null }) {
  const [workflowId, setWorkflowId] = useState("");
  const [data, setData] = useState<RecordValue | null>(() => initialData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null);
    const response = await fetch(`/api/trust/protected-workflows/${encodeURIComponent(workflowId.trim())}`, { cache: "no-store", headers: { "x-enterprise-id": enterpriseId } }).catch(() => null);
    const body = await response?.json().catch(() => null);
    setLoading(false);
    if (!response?.ok || !body?.ok) { setData(null); setError(body?.error ?? "Protected workflow is unavailable."); return; }
    setData(body);
  }

  const workflow = data?.workflow as RecordValue | undefined;
  const evidence = (data?.evidence ?? []) as RecordValue[];
  const transactions = (data?.canonicalTransactions ?? []) as RecordValue[];
  const interventions = (data?.interventions ?? []) as RecordValue[];
  const latestTransaction = transactions.at(-1);
  const latestIntervention = interventions.at(-1);
  const policyEvidence = ((data?.policyEvidence ?? []) as RecordValue[]).at(-1);
  const continuity = data?.identityContinuity as RecordValue | undefined;
  const demo = data?.demo === true;
  const category = (name: string) => evidence.filter((item) => item.normalized_facts?.category === name);

  return <div className="mt-8 space-y-6">
    <form onSubmit={load} className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-950/20">
      <label htmlFor="workflow-id" className="block text-sm font-medium text-zinc-200">Protected workflow reference</label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input id="workflow-id" required value={workflowId} onChange={(event) => setWorkflowId(event.target.value)} placeholder="UUID" className="min-h-11 flex-1 rounded-lg border border-white/15 bg-black/30 px-4 text-white outline-none focus:border-cyan-400" />
        <button className="brand-primary-action min-h-11" disabled={loading}>{loading ? "Loading…" : "Open workflow"}</button>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-amber-300">{error}</p> : null}
    </form>

    {workflow ? <>
      <section aria-label="Protected Workflow overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Protected Workflow", `${value(workflow.workflow_type)} · ${value(workflow.status)}`],
          ["Subject", value(workflow.subject_entity_id)],
          ["Identity continuity", value(category("identity").at(-1)?.normalized_facts?.classification)],
          ["Consent", workflow.consent_reference ? "Confirmed" : "Required"],
          ["Policy", value(workflow.policy_reference)],
          ["AI-assistance evidence", category("ai_assistance").length ? `${category("ai_assistance").length} observation(s)` : "Not observed"],
          ["Session continuity", value(category("session").at(-1)?.normalized_facts?.classification)],
          ["Media evidence", value(category("media").at(-1)?.normalized_facts?.classification)],
          ["Outstanding challenge", workflow.status === "challenge_required" ? "Required" : "None recorded"],
          ["Canonical decision", value(latestTransaction?.decision, "Not evaluated")],
          ["Current intervention", value(latestIntervention?.intervention_type ?? workflow.latest_intervention, "None")],
        ].map(([label, result]) => <article key={label} className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{label}</p><p className="mt-2 break-words text-sm text-zinc-200">{result}</p></article>)}
      </section>

      <section aria-label="Policy Evidence" className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5 lg:grid-cols-2">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Policy Evidence</p><h2 className="mt-2 text-xl font-semibold">Policy in force</h2><dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm"><dt className="text-zinc-500">Policy</dt><dd>{policyEvidence ? `${value(policyEvidence.policyId)} · ${value(policyEvidence.policyVersion)}` : "Not recorded"}</dd><dt className="text-zinc-500">Effective</dt><dd>{value(policyEvidence?.policyEffectiveAt)}</dd><dt className="text-zinc-500">Permitted</dt><dd>{policyEvidence?.permittedAiAssistance?.length ? policyEvidence.permittedAiAssistance.join(", ") : "None listed"}</dd><dt className="text-zinc-500">Prohibited</dt><dd>{policyEvidence?.prohibitedAiAssistance?.length ? policyEvidence.prohibitedAiAssistance.join(", ") : "None listed"}</dd><dt className="text-zinc-500">Acknowledged</dt><dd>{value(policyEvidence?.candidateAcknowledgement, "Not recorded")}</dd></dl></div>
        <div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Decision provenance</p><p className="mt-2 text-sm text-zinc-300">Observation → applicable policy and immutable version → disclosure and consent → corroborating evidence → canonical decision.</p><p className="mt-3 text-sm text-zinc-500">AI-assistance or vendor identity alone is not a policy violation and cannot determine an adverse action.</p>{latestTransaction?.reason_codes?.length ? <ul className="mt-4 space-y-1 text-sm text-zinc-300">{latestTransaction.reason_codes.map((reason: string) => <li key={reason}>• {value(reason)}</li>)}</ul> : null}</div>
      </section>

      <section aria-label="Identity Continuity" className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Identity Continuity</p><h2 className="mt-2 text-xl font-semibold">Candidate → workforce → privileged access</h2></div><p className="text-sm text-zinc-300">Current state: {value(continuity?.currentState, "Unproven")}</p></div>
        <ol className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{continuity?.timeline?.length ? continuity.timeline.map((item: RecordValue) => <li key={`${item.stage}-${item.observedAt}`} className="rounded-lg border border-white/10 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{value(item.stage)}</p><p className="mt-2 font-medium text-zinc-100">{value(item.state)}</p><p className="mt-1 text-sm text-zinc-400">Source: {value(item.source)}</p>{item.finding ? <p className="mt-2 text-sm text-amber-300">Finding: {value(item.finding)}</p> : null}</li>) : <li className="text-sm text-zinc-400">No continuity stages have been recorded.</li>}</ol>
      </section>

      <nav aria-label="Workflow evidence links" className="flex flex-wrap gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
        <a href="#track-block-evidence" className="brand-secondary-action">View Evidence</a>
        {latestTransaction && !demo ? <Link href={`/trust/transactions/${latestTransaction.transaction_id}`} className="brand-secondary-action">View Authority Lineage</Link> : <span aria-disabled="true" className="brand-secondary-action opacity-50">View Authority Lineage</span>}
        <Link href="/trust-replay" className="brand-secondary-action">Open Replay</Link>
        {latestTransaction && !demo ? <Link href={`/trust/transactions/${latestTransaction.transaction_id}`} className="brand-secondary-action">View Receipt</Link> : <span aria-disabled="true" className="brand-secondary-action opacity-50">View Receipt</span>}
      </nav>

      <section id="track-block-evidence" className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <h2 className="text-xl font-semibold">Canonical evidence timeline</h2>
        <p className="mt-2 text-sm text-zinc-400">Only persisted observations are shown. Unknown and unconfigured capabilities remain explicit.</p>
        <ol className="mt-5 space-y-3">{evidence.length ? evidence.map((item) => <li key={item.evidence_id} className="rounded-lg border border-white/10 p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{value(item.normalized_facts?.category)}</strong><span className="text-zinc-500">{value(item.occurred_at)}</span></div><p className="mt-2 text-zinc-300">{value(item.normalized_facts?.classification)} · {value(item.normalized_facts?.severity)} · {value(item.source_key)}</p></li>) : <li className="text-sm text-zinc-400">No workflow evidence has been persisted.</li>}</ol>
      </section>
    </> : <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-zinc-400"><p>Enter a tenant-scoped workflow reference to inspect its canonical decision, evidence, intervention and Replay links.</p></section>}
  </div>;
}
