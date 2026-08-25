import Link from "next/link";
import { createSentinelOperations, createSentinelTrustBrief, type SentinelAttention } from "@/lib/trust-fabric/sentinel-agents";
import { createAgentAlphaTrustTwinDemo } from "@/lib/trust-fabric/trust-twin";

export const dynamic = "force-dynamic";

const attentionStyle: Record<SentinelAttention, string> = {
  NORMAL: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  WATCHING: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  INVESTIGATING: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  ESCALATED: "border-rose-300/30 bg-rose-300/10 text-rose-100",
  PAUSED: "border-zinc-300/20 bg-zinc-300/5 text-zinc-300",
};

function words(value: string) { return value.toLowerCase().replaceAll("_", " "); }

export default function SentinelOperationsPage() {
  const demo = createAgentAlphaTrustTwinDemo();
  const operations = createSentinelOperations({
    enterpriseId: demo.baseline.enterpriseId,
    twins: [demo.baseline],
    simulations: [demo.projected],
    generatedAt: "2026-08-24T09:20:00.000Z",
  });
  const brief = operations.trustBriefs[0];
  const controlledBrief = createSentinelTrustBrief({
    enterpriseId: demo.baseline.enterpriseId,
    currentTwin: demo.projected.projectedTwin,
    simulation: demo.controlled,
    evaluatedAt: "2026-08-24T09:40:00.000Z",
  });
  const primaryGaps = brief.hypothesis.requiredProof.filter((item) => item === "VERIFY_RUNTIME" || item === "VERIFY_DESTINATION");

  return (
    <main className="min-h-screen bg-[#05070b] text-zinc-100">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_82%_0%,rgba(245,158,11,0.13),transparent_35%),radial-gradient(circle_at_12%_10%,rgba(56,189,248,0.10),transparent_30%),linear-gradient(180deg,#0b1018_0%,#05070b_100%)]">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
          <nav className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <Link href="/" className="font-semibold tracking-wide text-zinc-200 hover:text-white">Cyber Sentinels</Link>
            <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-sky-100">NON-PRODUCTION DEMO</span>
          </nav>
          <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_0.45fr] lg:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">Autonomous trust observation</p><h1 className="mt-4 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Sentinel Operations</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">One operational surface for seven bounded Sentinel roles. They observe, investigate, simulate, and recommend; the canonical Trust Fabric alone decides.</p></div>
            <div className="border-l border-white/10 pl-6"><p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Enterprise Trust Weather</p><p className="mt-3 text-4xl font-semibold text-amber-100">{operations.weather.state}</p><p className="mt-3 text-sm leading-6 text-zinc-500">Derived conditions, never a canonical trust status.</p></div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-10 px-6 py-10 md:px-10 md:py-14">
        <div><p className="text-xs uppercase tracking-[0.2em] text-zinc-500">What needs attention now?</p><p className="mt-2 text-sm text-zinc-400">Highest-priority material change, correlated into one investigation.</p></div>
        <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <article className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.035] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Agent Alpha · pre-action</p>
            <div className="mt-5 flex flex-wrap items-center gap-3"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${attentionStyle[brief.attention]}`}>{brief.attention}</span><span className="text-sm text-zinc-400">{brief.sentinelRole} Sentinel</span></div>
            <div className="mt-8 grid grid-cols-3 gap-4"><div><p className="text-xs text-zinc-500">Pressure</p><p className="mt-1 text-4xl font-semibold">{brief.currentPressure.value}</p></div><div><p className="text-xs text-zinc-500">Budget</p><p className="mt-1 text-4xl font-semibold">{brief.currentBudget.remaining}</p></div><div><p className="text-xs text-zinc-500">Reach</p><p className="mt-1 text-4xl font-semibold">{brief.consequenceReach.systemCount}</p></div></div>
            <p className="mt-7 text-sm leading-6 text-zinc-300">The Sentinel correlated the proposed write authority, new MCP tool, and weakened destination binding into one material investigation.</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#090d14] p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Sentinel Trust Brief</p><h2 className="mt-2 text-2xl font-semibold">Prevent before execution</h2></div><span className="font-mono text-[10px] text-zinc-600">{brief.briefId.slice(0, 13)}…</span></div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Hypothesis · not fact</p><p className="mt-2 text-sm leading-6 text-zinc-300">{brief.hypothesis.statement}</p>
            <div className="mt-6 grid gap-5 md:grid-cols-2"><div><p className="text-xs text-zinc-500">Priority trust gaps</p><div className="mt-3 flex flex-wrap gap-2">{primaryGaps.map((gap) => <span key={gap} className="rounded-full border border-rose-300/25 bg-rose-300/5 px-3 py-1.5 text-xs text-rose-100">{words(gap)}</span>)}</div></div><div><p className="text-xs text-zinc-500">Minimum preventative control</p><p className="mt-3 text-sm leading-6 text-zinc-200">Retain read-only authority · pin destination · re-attest runtime and monitoring</p></div></div>
            <p className="mt-6 text-xs leading-5 text-zinc-600">Confidence {Math.round(brief.confidence.value * 100)}% · supporting and contradicting evidence retained · required proof remains explicit</p>
          </article>
        </section>

        <section className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.03] p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs uppercase tracking-[0.18em] text-emerald-200">Counterfactual prevention</p><h2 className="mt-2 text-2xl font-semibold">Controls restore a stable path</h2></div><p className="text-xs text-zinc-500">Simulation only · no execution · no persistence</p></div>
          <div className="mt-7 grid gap-5 md:grid-cols-4"><div><p className="text-xs text-zinc-500">Forecast</p><p className="mt-2 text-2xl font-semibold text-emerald-100">{controlledBrief.currentForecast}</p></div><div><p className="text-xs text-zinc-500">Pressure</p><p className="mt-2 text-2xl font-semibold">{controlledBrief.currentPressure.value}</p></div><div><p className="text-xs text-zinc-500">Budget remaining</p><p className="mt-2 text-2xl font-semibold">{controlledBrief.currentBudget.remaining}</p></div><div><p className="text-xs text-zinc-500">Trust gap</p><p className="mt-2 text-2xl font-semibold">{controlledBrief.trustGaps[0]?.status ?? "RESOLVED"}</p></div></div>
        </section>

        <section aria-labelledby="sentinel-roster" className="rounded-2xl border border-white/10 bg-[#090d14] p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-zinc-500">One architecture · role-configured</p><h2 id="sentinel-roster" className="mt-2 text-2xl font-semibold">Active Sentinels</h2></div><p className="text-xs text-zinc-600">All are observable operational entities · implicit trust: false</p></div>
          <div className="mt-6 overflow-hidden rounded-xl border border-white/10"><div className="hidden grid-cols-[1fr_8rem_8rem_1fr] gap-4 border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-zinc-600 md:grid"><span>Role</span><span>State</span><span>Attention</span><span>Authority boundary</span></div>{operations.sentinels.map((sentinel) => <div key={sentinel.sentinelId} className="grid gap-2 border-b border-white/8 px-5 py-4 last:border-0 md:grid-cols-[1fr_8rem_8rem_1fr] md:items-center"><div><p className="text-sm font-semibold">{sentinel.name}</p><p className="mt-1 text-xs text-zinc-600">{sentinel.role}</p></div><span className="text-sm">{sentinel.currentState}</span><span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] ${attentionStyle[sentinel.attention]}`}>{sentinel.attention}</span><span className="text-xs leading-5 text-zinc-500">Observe, simulate, recommend, escalate. No ALLOW / REVIEW / DENY.</span></div>)}</div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <article data-demo-reason="AUTHORITY_SCOPE_INVALID" className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.035] p-6 md:p-8"><p className="text-xs uppercase tracking-[0.18em] text-rose-200">Actual canonical request</p><h2 className="mt-3 text-4xl font-semibold text-rose-100">{demo.canonicalRuntimeRequest.decision}</h2><p className="mt-3 font-mono text-sm text-rose-200">{demo.canonicalRuntimeRequest.reasonCode}</p><p className="mt-5 text-sm leading-6 text-zinc-400">The Sentinel did not decide this result and could not execute the write.</p></article>
          <article className="rounded-2xl border border-white/10 bg-[#090d14] p-6 md:p-8"><p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Evidence, replay, memory</p><h2 className="mt-2 text-2xl font-semibold">One explainable investigation chain</h2><p className="mt-5 text-sm leading-7 text-zinc-400">Sentinel → observation → hypothesis → simulation → recommendation → entity. Material events are replayable and retained through existing Trust Memory references; non-material observations are deduplicated.</p><div className="mt-6 flex flex-wrap gap-3 text-xs"><Link className="rounded-full border border-white/10 px-3 py-2 text-zinc-300 hover:border-white/25" href="/trust-prediction">Trust Twin / What If?</Link><span className="rounded-full border border-white/10 px-3 py-2 text-zinc-500">Evidence Graph</span><span className="rounded-full border border-white/10 px-3 py-2 text-zinc-500">Replay</span><span className="rounded-full border border-white/10 px-3 py-2 text-zinc-500">Receipt</span></div></article>
        </section>

        <footer className="border-t border-white/10 pt-8"><p className="text-sm leading-6 text-zinc-300">Canonical separation: Sentinels may observe, investigate, correlate, forecast, simulate, recommend, and escalate. Only the existing Trust Fabric may ALLOW, REVIEW, or DENY.</p><p className="mt-3 text-xs text-zinc-600">Deterministic-first · provider-neutral · no autonomous training · no online policy learning · no parallel evaluator, graph, evidence store, identity model, or runtime-security engine</p></footer>
      </div>
    </main>
  );
}
