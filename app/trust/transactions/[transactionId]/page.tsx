import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CanonicalTransactionError, loadCanonicalTrustTransactionHistory } from "@/lib/trust-transaction/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trust Transaction History | Cyber Sentinels",
  description: "Evidence-backed decision, authority, Replay, Trust Memory and external execution history.",
};

const decisionStyle = {
  ALLOW: "border-emerald-800 bg-emerald-950/30 text-emerald-200",
  REVIEW: "border-amber-800 bg-amber-950/30 text-amber-200",
  DENY: "border-rose-800 bg-rose-950/30 text-rose-200",
};

function value(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not recorded";
  return String(value);
}

export default async function TrustTransactionHistoryPage({ params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/trust/transactions/${transactionId}`)}`);
  let history;
  try {
    history = await loadCanonicalTrustTransactionHistory({ supabase, user, transactionId });
  } catch (error) {
    if (error instanceof CanonicalTransactionError && error.status === 404) notFound();
    throw error;
  }
  const { receipt, events, externalRequest, acknowledgements, outcomes } = history;
  const responsibility = receipt.responsibilityLineage;
  const enforcement = receipt.decisionTimeSnapshot.enforcementState;
  const currentProvider = responsibility.technologyProvider;
  const evidenceSourceCount = new Set(receipt.decisionTimeSnapshot.providerEvidence.map((item) => item.sourcePartyId)).size;
  const independentSourceCount = new Set(receipt.decisionTimeSnapshot.providerEvidence.filter((item) => item.sourcePartyId !== responsibility.controlOperator && item.sourcePartyId !== responsibility.technologyProvider).map((item) => item.sourcePartyId)).size;
  const stages = [
    ["Actor authenticated", `actor:${receipt.actor.id}`],
    ["Tenant resolved from session", `enterprise:${receipt.enterpriseId}`],
    ["Trust Object resolved", `${receipt.trustObject.subjectType}:${receipt.trustObject.subjectId}`],
    ["Configured evidence collected", receipt.evidence.map((item) => item.reference).join(", ") || "No accepted evidence"],
    ["Evidence freshness checked", receipt.evidenceFresh ? "complete and fresh" : "incomplete or stale"],
    ["Authority resolved", receipt.authorityReference],
    ["Authority scope checked", receipt.decision === "DENY" ? "see reason codes" : receipt.authorityReference],
    ["Policy version resolved", `${receipt.policy.id}:${receipt.policy.version}`],
    ["Decision persisted", receipt.decisionReference],
    ["Evidence Graph linked", receipt.evidenceGraphReference],
    ["Replay written", receipt.replayReference],
    ["Trust Memory materiality", receipt.trustMemoryReference ?? "No material write"],
    ["External execution gated", receipt.externalExecution.requested ? "approved request sent" : `${receipt.decision}: no external execution`],
    ["External request", receipt.externalExecution.requestReference ?? "Not requested"],
    ["External acknowledgement", receipt.externalExecution.acknowledgementReference ?? "Not acknowledged"],
    ["External outcome", `${receipt.externalExecution.outcome}${receipt.externalExecution.outcomeReference ? ` · ${receipt.externalExecution.outcomeReference}` : ""}`],
    ["Changed-condition evaluation", receipt.changedConditions.join(", ") || "No changed condition"],
    ["Current Operational Trust", receipt.trustState],
  ];

  return (
    <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid-bg rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">Canonical trust transaction</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
            <div>
              <h1 className="text-3xl font-semibold md:text-5xl">One action. One evidence-backed history.</h1>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-300">Request, evidence, authority, policy, decision, Replay, material Trust Memory, and external execution records are shown from the tenant-scoped stored transaction.</p>
            </div>
            <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${decisionStyle[receipt.decision]}`}>{receipt.decision}</span>
          </div>
          <div className="mt-7 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-zinc-800 bg-black p-4"><p className="text-zinc-500">Transaction</p><p className="mt-2 break-all font-mono text-xs text-zinc-200">{receipt.transactionId}</p></div>
            <div className="rounded-lg border border-zinc-800 bg-black p-4"><p className="text-zinc-500">Correlation</p><p className="mt-2 break-all font-mono text-xs text-zinc-200">{receipt.correlationId}</p></div>
            <div className="rounded-lg border border-zinc-800 bg-black p-4"><p className="text-zinc-500">Trust state</p><p className="mt-2 font-semibold text-cyan-100">{receipt.trustState}</p></div>
            <div className="rounded-lg border border-zinc-800 bg-black p-4"><p className="text-zinc-500">External outcome</p><p className="mt-2 font-semibold text-zinc-100">{receipt.externalExecution.outcome}</p></div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Control responsibility</p>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              {[
                ["Control Owner", responsibility.controlOwner],
                ["Control Operator", responsibility.controlOperator],
                ["Technology Provider", responsibility.technologyProvider],
                ["Identity Provider", responsibility.identityAuthorizationProvider],
                ["Runtime Provider", responsibility.runtimeProvider],
                ["Evidence Provider", responsibility.evidenceProvider],
              ].map(([label, detail]) => <div key={label}><dt className="text-zinc-500">{label}</dt><dd className="mt-1 break-all text-zinc-200">{value(detail)}</dd></div>)}
            </dl>
          </article>
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Evidence independence</p>
            <p className="mt-4 text-2xl font-semibold capitalize text-zinc-100">{receipt.evidenceIndependence.replaceAll("_", " ")}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-zinc-500">Source count</dt><dd className="mt-1 text-zinc-200">{evidenceSourceCount}</dd></div><div><dt className="text-zinc-500">Independent source count</dt><dd className="mt-1 text-zinc-200">{independentSourceCount}</dd></div><div><dt className="text-zinc-500">Current classification</dt><dd className="mt-1 text-zinc-200">{receipt.evidenceIndependence}</dd></div><div><dt className="text-zinc-500">Conflicts</dt><dd className="mt-1 text-zinc-200">{receipt.decisionTimeSnapshot.contradictions.length}</dd></div></dl>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
              {["Single Source", "Multi Source", "Independent Confirmation", "Conflicting", "Insufficient"].map((label) => <span key={label} className="rounded-full border border-zinc-800 px-3 py-1">{label}</span>)}
            </div>
            <p className="mt-4 text-xs leading-5 text-zinc-500">Multiple systems owned by the same provider do not count as independent confirmation.</p>
          </article>
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Enforcement</p>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-zinc-500">Requested</dt><dd className="mt-1 text-zinc-200">{receipt.externalExecution.requested ? "Recorded" : "Not requested"}</dd></div>
              <div><dt className="text-zinc-500">Acknowledged</dt><dd className="mt-1 text-zinc-200">{receipt.externalExecution.acknowledgementReference ? "Recorded" : "Unknown"}</dd></div>
              <div><dt className="text-zinc-500">Claimed</dt><dd className="mt-1 text-zinc-200">{receipt.externalExecution.outcome}</dd></div>
              <div><dt className="text-zinc-500">Runtime Observed</dt><dd className="mt-1 text-zinc-200">{value(enforcement.runtimeObservation)}</dd></div>
              <div><dt className="text-zinc-500">Destination Observed</dt><dd className="mt-1 text-zinc-200">{value(enforcement.destinationObservation)}</dd></div>
              <div><dt className="text-zinc-500">Confirmed / Contradicted / Unknown</dt><dd className="mt-1 text-zinc-200">{enforcement.destinationObservation === "enforced" && enforcement.runtimeObservation === "enforced" ? "Confirmed" : "Unknown"}</dd></div>
            </dl>
          </article>
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Provider history</p>
            <dl className="mt-5 grid gap-3 text-sm">
              <div><dt className="text-zinc-500">Current Provider</dt><dd className="mt-1 text-zinc-200">{currentProvider}</dd></div>
              <div><dt className="text-zinc-500">Previous Provider</dt><dd className="mt-1 text-zinc-200">No replacement recorded in this decision snapshot</dd></div>
              <div><dt className="text-zinc-500">Migration</dt><dd className="mt-1 text-zinc-200">No migration event attached</dd></div>
              <div><dt className="text-zinc-500">Historical Evidence Preservation</dt><dd className="mt-1 text-zinc-200">Append-only evidence references retained</dd></div>
              <div><dt className="text-zinc-500">Evidence Gaps</dt><dd className="mt-1 text-zinc-200">{receipt.decisionTimeSnapshot.contradictions.length ? receipt.decisionTimeSnapshot.contradictions.join(", ") : "None recorded"}</dd></div>
            </dl>
          </article>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">End-to-end proof</p>
            <h2 className="mt-3 text-2xl font-semibold">Every stage points to stored evidence.</h2>
            <ol className="mt-6 space-y-3">
              {stages.map(([label, reference], index) => (
                <li key={label} className="grid gap-3 rounded-lg border border-zinc-800 bg-black/70 p-4 sm:grid-cols-[2rem_1fr]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-900 text-xs text-cyan-200">{index + 1}</span>
                  <div><p className="font-medium text-zinc-100">{label}</p><p className="mt-1 break-all font-mono text-xs leading-5 text-zinc-500">{reference}</p></div>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-6">
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Decision inputs</p>
              <dl className="mt-5 space-y-4 text-sm">
                <div><dt className="text-zinc-500">Trust Object</dt><dd className="mt-1 break-all text-zinc-200">{receipt.trustObject.subjectType}:{receipt.trustObject.subjectId}</dd></div>
                <div><dt className="text-zinc-500">Action</dt><dd className="mt-1 text-zinc-200">{receipt.action.type} · {receipt.action.resource}</dd></div>
                <div><dt className="text-zinc-500">Request digest</dt><dd className="mt-1 break-all font-mono text-xs text-zinc-300">{receipt.action.requestDigest}</dd></div>
                <div><dt className="text-zinc-500">Authority</dt><dd className="mt-1 break-all text-zinc-200">{receipt.authorityReference}</dd></div>
                <div><dt className="text-zinc-500">Policy</dt><dd className="mt-1 text-zinc-200">{receipt.policy.id} · {receipt.policy.version}</dd></div>
                <div><dt className="text-zinc-500">Policy hash</dt><dd className="mt-1 break-all font-mono text-xs text-zinc-300">{receipt.policy.hash}</dd></div>
              </dl>
            </section>
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Provider evidence</p>
              <div className="mt-5 space-y-3">
                {receipt.evidence.length ? receipt.evidence.map((item) => (
                  <article key={item.reference} className="rounded-lg border border-zinc-800 bg-black p-4 text-xs leading-5">
                    <p className="font-semibold text-zinc-100">{item.providerId} · {item.outcome}</p>
                    <p className="mt-2 break-all text-zinc-400">Event: {item.providerEventId}</p>
                    <p className="break-all text-zinc-500">Digest: {item.sourceDigest}</p>
                    <p className="text-zinc-500">Observed: {item.observedAt}</p>
                  </article>
                )) : <p className="rounded-lg border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-200">No stored configured provider evidence supported this action.</p>}
              </div>
            </section>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Immutable chronology</p>
          <h2 className="mt-3 text-2xl font-semibold">Decision and execution are separate records.</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-3 py-3">When</th><th className="px-3 py-3">Event</th><th className="px-3 py-3">Why</th><th className="px-3 py-3">Record digest</th></tr></thead>
              <tbody className="divide-y divide-zinc-900">{events.map((event: Record<string, unknown>) => <tr key={String(event.event_id)}><td className="px-3 py-4 text-zinc-400">{value(event.occurred_at)}</td><td className="px-3 py-4 font-medium text-zinc-100">{value(event.event_type)}</td><td className="max-w-xl px-3 py-4 text-zinc-300">{value(event.reason)}</td><td className="px-3 py-4 font-mono text-xs text-zinc-500">{value(event.record_digest)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-black p-4 text-sm"><p className="text-zinc-500">External request</p><p className="mt-2 break-all text-zinc-200">{value((externalRequest as Record<string, unknown> | null)?.request_id)}</p></div>
            <div className="rounded-lg border border-zinc-800 bg-black p-4 text-sm"><p className="text-zinc-500">Acknowledgements</p><p className="mt-2 text-zinc-200">{acknowledgements.length}</p></div>
            <div className="rounded-lg border border-zinc-800 bg-black p-4 text-sm"><p className="text-zinc-500">Recorded outcomes</p><p className="mt-2 text-zinc-200">{outcomes.length}</p></div>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3"><Link href="/trust-centre" className="brand-secondary-action brand-action-large text-sm">Trust Centre</Link><Link href="/replay" className="brand-secondary-action brand-action-large text-sm">Replay</Link></div>
      </div>
    </main>
  );
}
