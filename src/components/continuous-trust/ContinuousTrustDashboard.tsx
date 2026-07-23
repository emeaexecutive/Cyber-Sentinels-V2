"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Row = Record<string, unknown>;
const panel = "rounded-2xl border border-white/10 bg-white/[0.035] p-5";
const pollIntervalMs = 30_000;

function label(value: unknown, fallback = "Awaiting data") { const result = String(value ?? "").trim(); return result || fallback; }
function when(value: unknown) { if (!value) return "Not scheduled"; const date = new Date(String(value)); return Number.isFinite(date.getTime()) ? date.toISOString().replace("T", " ").replace(".000Z", " UTC") : "Not recorded"; }

export function ContinuousTrustDashboard({ initialRuntime, initialAlerts, initialProviders, initialEvidence, initialAssessments, generatedAt }: { initialRuntime: Row[]; initialAlerts: Row[]; initialProviders: Row[]; initialEvidence: Row[]; initialAssessments: Row[]; generatedAt: string }) {
  const [runtime, setRuntime] = useState(initialRuntime);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [providers, setProviders] = useState(initialProviders);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [connection, setConnection] = useState<"connected" | "polling" | "degraded">("polling");
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const responses = await Promise.all([fetch("/api/trust/runtime?limit=100", { cache: "no-store" }), fetch("/api/trust/alerts?limit=100", { cache: "no-store" }), fetch("/api/trust/providers/health?limit=100", { cache: "no-store" })]);
        if (responses.some((response) => !response.ok)) throw new Error("poll_failed");
        const [runtimeBody, alertBody, providerBody] = await Promise.all(responses.map((response) => response.json())) as [Record<string, unknown>, Record<string, unknown>, Record<string, unknown>];
        if (!active) return;
        setRuntime(Array.isArray(runtimeBody.runtime) ? runtimeBody.runtime as Row[] : []);
        setAlerts(Array.isArray(alertBody.alerts) ? alertBody.alerts as Row[] : []);
        setProviders(Array.isArray(providerBody.providers) ? providerBody.providers as Row[] : []);
        setLastUpdated(new Date().toISOString()); setConnection("connected");
      } catch { if (active) setConnection("degraded"); }
    }
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, pollIntervalMs);
    function online() { void refresh(); }
    window.addEventListener("online", online);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("online", online); };
  }, []);
  const distribution = useMemo(() => runtime.reduce<Record<string, number>>((counts, row) => { const state = label(row.state, "UNKNOWN"); counts[state] = (counts[state] ?? 0) + 1; return counts; }, {}), [runtime]);
  const openAlerts = alerts.filter((row) => !["resolved", "dismissed"].includes(String(row.status)));
  const expiringEvidence = initialEvidence.filter((row) => row.expires_at && Date.parse(String(row.expires_at)) <= Date.parse(generatedAt) + 86_400_000 && !row.revoked_at);
  return <div className="space-y-6">
    <p role="status" aria-live="polite" className="text-xs text-zinc-500">Runtime updates: {connection}. Polling fallback every 30 seconds.{lastUpdated ? ` Last updated ${when(lastUpdated)}.` : ""}</p>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Continuous trust summary">
      {[['Runtime subjects', runtime.length], ['Open alerts', openAlerts.length], ['Expiring evidence', expiringEvidence.length], ['Measured providers', providers.length]].map(([name, value]) => <article key={String(name)} className={panel}><p className="text-xs uppercase tracking-wider text-zinc-500">{name}</p><p className="mt-2 text-3xl font-semibold text-cyan-200">{value}</p></article>)}
    </section>
    <section className={panel}><h2 className="text-lg font-semibold">Trust state distribution</h2>{Object.keys(distribution).length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(distribution).sort().map(([state, count]) => <div key={state} className="rounded-xl border border-white/10 p-3"><p className="text-xs text-zinc-500">{state}</p><p className="mt-1 text-xl text-cyan-200">{count}</p></div>)}</div> : <p className="mt-3 text-amber-200">No measured runtime state is available.</p>}</section>
    <section className={panel}><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">Live runtime trust states</h2><span className="text-xs text-zinc-500">Bounded to 100</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-zinc-500"><tr><th className="pb-3">Subject</th><th className="pb-3">State</th><th className="pb-3">Score</th><th className="pb-3">Confidence</th><th className="pb-3">Freshness</th><th className="pb-3">Next evaluation</th></tr></thead><tbody>{runtime.map((row) => <tr key={`${row.enterprise_id}:${row.subject_id}`} className="border-t border-white/10"><td className="py-3"><Link className="text-cyan-300 hover:underline" href={`/dashboard/trust-architecture/subjects/${encodeURIComponent(String(row.subject_id))}`}>{label(row.subject_id)}</Link></td><td>{label(row.state)}</td><td>{label(row.normalized_score)}</td><td>{label(row.confidence)}%</td><td>{label(row.evidence_freshness)}</td><td>{when(row.next_evaluation_at)}</td></tr>)}</tbody></table>{!runtime.length ? <p className="py-4 text-zinc-500">No runtime states have been evaluated.</p> : null}</div></section>
    <section className={panel}><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">Recent transitions and trust trend</h2><span className="text-xs text-zinc-500">Immutable assessments</span></div><div className="mt-4 space-y-3">{initialAssessments.map((assessment) => <article key={String(assessment.assessment_id)} className="grid gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-[1fr_auto_auto_auto]"><div><p className="font-medium">{label(assessment.subject_id)}</p><p className="mt-1 text-xs text-zinc-500">{label(assessment.transition_type)} · {when(assessment.evaluated_at)}</p></div><p className="text-sm">Score <span className="text-cyan-200">{label(assessment.score)}</span></p><p className="text-sm">Confidence <span className="text-cyan-200">{label(assessment.confidence)}%</span></p><Link className="text-sm text-cyan-300 hover:underline" href={`/api/trust/replay/${assessment.state_decision_id}`}>Replay</Link></article>)}{!initialAssessments.length ? <p className="text-zinc-500">No material transitions have been recorded.</p> : null}</div></section>
    <div className="grid gap-6 xl:grid-cols-2"><section className={panel}><h2 className="text-lg font-semibold">Trust drift and alerts</h2><div className="mt-4 space-y-3">{openAlerts.slice(0, 20).map((alert) => <article key={String(alert.id)} className="rounded-xl border border-white/10 p-3"><div className="flex justify-between gap-3"><p className="font-medium">{label(alert.alert_type).replaceAll("_", " ")}</p><span className="text-xs uppercase text-amber-200">{label(alert.severity)}</span></div><p className="mt-2 text-sm text-zinc-400">{label(alert.remediation_guidance, "Review the referenced evidence and policy context.")}</p><p className="mt-2 text-xs text-zinc-600">{label(alert.subject_reference)} · {when(alert.detected_at)}</p></article>)}{!openAlerts.length ? <p className="text-zinc-500">No open continuous trust alerts.</p> : null}</div></section>
      <section className={panel}><h2 className="text-lg font-semibold">Provider health</h2><div className="mt-4 space-y-3">{providers.map((provider) => <article key={String(provider.providerKey)} className="flex items-center justify-between rounded-xl border border-white/10 p-3"><div><p className="font-medium">{label(provider.providerKey)}</p><p className="mt-1 text-xs text-zinc-500">Observed {when(provider.observedAt)}</p></div><span className="text-xs uppercase text-cyan-200">{label(provider.state)}</span></article>)}{!providers.length ? <p className="text-zinc-500">Provider health is awaiting measured data.</p> : null}</div></section></div>
  </div>;
}
