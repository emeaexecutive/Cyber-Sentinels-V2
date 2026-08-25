import Link from "next/link";
import { createAgentAlphaTrustTwinDemo, type TrustTwin } from "@/lib/trust-fabric/trust-twin";

export const dynamic = "force-dynamic";

const forecastStyle: Record<TrustTwin["trustForecast"]["state"], string> = {
  STABLE: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  WATCH: "border-sky-300/40 bg-sky-300/10 text-sky-100",
  ELEVATED: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  SEVERE: "border-rose-300/40 bg-rose-300/10 text-rose-100",
  INSUFFICIENT_EVIDENCE: "border-zinc-400/40 bg-zinc-400/10 text-zinc-100",
};

function words(value: string) { return value.toLowerCase().replaceAll("_", " "); }

function StateBadge({ twin }: { twin: TrustTwin }) {
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] ${forecastStyle[twin.trustForecast.state]}`}>{twin.trustForecast.state}</span>;
}

function Meter({ value, tone }: { value: number; tone: "pressure" | "budget" }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-label={`${tone} ${value} of 100`}>
      <div className={`h-full rounded-full ${tone === "pressure" ? "bg-gradient-to-r from-sky-400 via-amber-300 to-rose-400" : "bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-300"}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function FlowState({ eyebrow, twin }: { eyebrow: string; twin: TrustTwin }) {
  return (
    <article className="min-w-0 flex-1 p-6 md:p-7">
      <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{eyebrow}</p><StateBadge twin={twin} /></div>
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div><p className="text-xs text-zinc-500">Pressure</p><p className="mt-1 text-4xl font-semibold tracking-[-0.05em]">{twin.trustPressure.value}</p></div>
        <div><p className="text-xs text-zinc-500">Budget remaining</p><p className="mt-1 text-4xl font-semibold tracking-[-0.05em]">{twin.trustBudget.remaining}</p></div>
      </div>
      <div className="mt-5"><Meter value={twin.trustPressure.value} tone="pressure" /></div>
      <p className="mt-4 text-xs leading-5 text-zinc-500">Reach: {twin.consequenceReach.systemCount} systems · {words(twin.trustPressure.trend)} pressure</p>
    </article>
  );
}

function TwinDimension({ label, value, evidence }: { label: string; value: string; evidence: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-4 border-t border-white/8 py-3 first:border-t-0">
      <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">{label}</p>
      <div><p className="text-sm font-medium text-zinc-200">{value}</p><p className="mt-1 text-xs leading-5 text-zinc-600">{evidence}</p></div>
    </div>
  );
}

function VerificationState({ label, twin }: { label: string; twin: TrustTwin }) {
  const verification = twin.adaptiveVerification;
  const gapOpen = verification.trustGap.exists;
  return (
    <article className="min-w-0 border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${gapOpen ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"}`}>{verification.verificationStatus}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{verification.requiredVerificationDepth}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{verification.consequence} consequence · proof {words(verification.evidenceFreshness)}</p>
      <p className="mt-4 text-sm leading-6 text-zinc-300">{gapOpen ? `${verification.missingEvidence.length} contextual proof gap(s). Minimum next proof: ${words(verification.minimumStepUp ?? "unknown")}.` : "Minimum sufficient proof is satisfied for this context."}</p>
    </article>
  );
}

export default function TrustPredictionPage() {
  const demo = createAgentAlphaTrustTwinDemo();
  const baseline = demo.baseline;
  const projected = demo.projected.projectedTwin;
  const controlled = demo.controlled.projectedTwin;
  return (
    <main className="min-h-screen bg-[#05070b] text-zinc-100">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_78%_0%,rgba(56,189,248,0.13),transparent_36%),radial-gradient(circle_at_18%_10%,rgba(16,185,129,0.09),transparent_28%),linear-gradient(180deg,#0a1019_0%,#05070b_100%)]">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-12">
          <nav className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <Link href="/" className="font-semibold tracking-wide text-zinc-200 hover:text-white">Cyber Sentinels</Link>
            <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" /><span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-sky-100">NON-PRODUCTION DEMO</span></div>
          </nav>
          <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_0.55fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Live operational trust projection</p>
              <h1 className="mt-4 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Trust Twin™</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">Cyber Sentinels maintains a live Trust Twin of autonomous operations. Trust isn&apos;t static; this view models how it is changing without becoming another canonical store.</p>
            </div>
            <div className="border-l border-white/10 pl-6">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Agent Alpha · current</p>
              <div className="mt-4 flex items-center gap-4"><p className="text-4xl font-semibold">{baseline.trustForecast.state}</p><StateBadge twin={baseline} /></div>
              <p className="mt-4 text-sm leading-6 text-zinc-500">Derived from canonical evidence · updated {baseline.updatedAt.slice(11, 16)} UTC</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-12 px-6 py-10 md:px-10 md:py-14">
        <section aria-labelledby="transformation-title">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-zinc-600">What If?</p><h2 id="transformation-title" className="mt-2 text-2xl font-semibold">NOW → PROPOSED CHANGE → PROJECTED STATE</h2></div><p className="max-w-lg text-right text-xs leading-5 text-zinc-600">COUNTERFACTUAL_TRUST_SIMULATION · isolated · replayable · no execution · no canonical event persistence</p></div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/8 lg:flex lg:items-stretch">
            <FlowState eyebrow="Now" twin={baseline} />
            <div className="border-y border-white/10 bg-[#0c121b] p-6 lg:w-72 lg:border-x lg:border-y-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300">Proposed change</p>
              <ol className="mt-5 space-y-3 text-sm text-zinc-300"><li>+ write_repository</li><li>+ new MCP tool</li><li>~ weaken destination binding</li></ol>
              <p className="mt-6 font-mono text-[11px] leading-5 text-zinc-600">SIMULATED<br />executionPerformed: false</p>
            </div>
            <FlowState eyebrow="Projected" twin={projected} />
          </div>
          <div className="grid border-x border-b border-emerald-300/20 bg-emerald-300/[0.035] lg:grid-cols-[1fr_1px_1fr]">
            <div className="p-6"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Smallest preventative controls</p><div className="mt-4 flex flex-wrap gap-2">{["RETAIN READ-ONLY AUTHORITY", "PIN DESTINATION", "VERIFY MONITORING"].map((control) => <span key={control} className="rounded-full border border-emerald-300/25 px-3 py-1.5 text-xs text-emerald-100">{control}</span>)}</div></div>
            <div className="bg-white/10" />
            <div className="p-6"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">After control</p><div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2"><StateBadge twin={controlled} /><p className="text-sm">Pressure <strong className="text-emerald-200">{controlled.trustPressure.value}</strong></p><p className="text-sm">Budget <strong className="text-emerald-200">{controlled.trustBudget.remaining}</strong></p></div></div>
          </div>
        </section>

        <section aria-labelledby="adaptive-verification-title" className="rounded-2xl border border-sky-300/20 bg-sky-300/[0.035] p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Adaptive Trust Verification™</p>
              <h2 id="adaptive-verification-title" className="mt-2 text-3xl font-semibold">Right entity. Right proof. Right moment.</h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">Verification depth adapts to consequence, freshness, Trust Forecast, Trust Pressure, Trust Budget, and material change. It asks only for the minimum missing proof.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-semibold text-zinc-100">VERIFIED ≠ AUTHORIZED</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Verification proves who or what is operating. Canonical authority determines what it is permitted to do. Low trust is not evidence of malicious intent.</p>
            </div>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <VerificationState label="Current" twin={baseline} />
            <VerificationState label="Proposed change" twin={projected} />
            <VerificationState label="After controls" twin={controlled} />
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-zinc-500">
            <p><strong className="text-amber-100">Unverified consequential authority:</strong> {projected.adaptiveVerification.trustGap.exists ? "1 priority gap" : "none"}</p>
            <p>Provider-neutral evidence · contextual freshness · no new identity authority</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-white/10 bg-[#090d14] p-6 md:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-zinc-600">Current conditions</p><h2 className="mt-2 text-2xl font-semibold">Trust Twin™ · Agent Alpha</h2></div><span className="font-mono text-[10px] text-zinc-700">{baseline.twinId.slice(0, 13)}…</span></div>
            <div className="mt-7">
              <TwinDimension label="Identity" value={baseline.identityState} evidence="Agent Passport and accountable owner remain continuous." />
              <TwinDimension label="Authority" value="read_repository" evidence="Authority is limited to the approved read-only contract." />
              <TwinDimension label="Intent" value={baseline.intentState} evidence="Signed human intent covers repository review." />
              <TwinDimension label="Runtime" value={baseline.runtimeState} evidence="Pinned and attested runtime evidence is current." />
              <TwinDimension label="Monitoring" value={baseline.monitoringState} evidence="Repository read-path coverage is verified." />
              <TwinDimension label="Destination" value={baseline.destinationState} evidence="Destination is pinned outside model control." />
              <TwinDimension label="Propagation" value={baseline.authorizationPropagation} evidence="No stale downstream authority is observed." />
            </div>
          </article>
          <div className="space-y-6">
            <article className="rounded-2xl border border-white/10 bg-[#090d14] p-6">
              <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-zinc-600">Trust Forecast™</p><h2 className="mt-2 text-xl font-semibold">Current forecast</h2></div><StateBadge twin={baseline} /></div>
              <dl className="mt-6 grid grid-cols-2 gap-5 text-sm"><div><dt className="text-zinc-600">Trend</dt><dd className="mt-1 font-medium">{words(baseline.forecastTrend)}</dd></div><div><dt className="text-zinc-600">Confidence</dt><dd className="mt-1 font-medium">{Math.round(baseline.providerConfidence * 100)}%</dd></div><div><dt className="text-zinc-600">Action recommendation</dt><dd className="mt-1 font-medium">{baseline.trustForecast.actionRecommendation}</dd></div><div><dt className="text-zinc-600">Method</dt><dd className="mt-1 font-medium">Deterministic rules v1</dd></div></dl>
            </article>
            <article className="rounded-2xl border border-white/10 bg-[#090d14] p-6">
              <div className="flex items-end justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-zinc-600">Trust Pressure</p><p className="mt-2 text-5xl font-semibold tracking-[-0.05em]">{projected.trustPressure.value}</p></div><p className="text-sm font-medium text-rose-200">{projected.trustPressure.level} · {projected.trustPressure.trend}</p></div>
              <div className="mt-5"><Meter value={projected.trustPressure.value} tone="pressure" /></div>
              <p className="mt-4 text-xs leading-5 text-zinc-600">Normalized explainable heuristic; it never maps directly to DENY.</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-[#090d14] p-6">
              <div className="flex items-end justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-zinc-600">Trust Budget</p><p className="mt-2 text-5xl font-semibold tracking-[-0.05em]">{projected.trustBudget.remaining}</p></div><p className="text-sm font-medium text-amber-200">{projected.trustBudget.status}</p></div>
              <div className="mt-5"><Meter value={projected.trustBudget.remaining} tone="budget" /></div>
              <div className="mt-4 flex justify-between text-xs text-zinc-600"><span>Total {projected.trustBudget.total}</span><span>Consumed {projected.trustBudget.consumed}</span><span>Remaining {projected.trustBudget.remaining}</span></div>
            </article>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-[#090d14] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">Primary drivers</p><h2 className="mt-2 text-2xl font-semibold">Pressure is attributable</h2>
            <div className="mt-6 space-y-4">{projected.trustPressure.primaryContributors.map((item) => <div key={item.code} className="grid grid-cols-[3rem_1fr] gap-4 border-t border-white/8 pt-4 first:border-0 first:pt-0"><p className="text-2xl font-semibold text-amber-200">+{item.impact}</p><div><p className="text-sm font-medium">{words(item.code)}</p><p className="mt-1 text-xs leading-5 text-zinc-600">{item.explanation}</p></div></div>)}</div>
            <p className="mt-7 text-xs uppercase tracking-[0.16em] text-zinc-600">Mitigating conditions</p><p className="mt-3 text-sm leading-6 text-zinc-400">Identity remains stable and provider evidence remains current. Mitigation is shown separately and never hides the pressure contributors.</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-[#090d14] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">Consequence reach · Projected blast radius</p><div className="mt-4 flex items-end gap-4"><p className="text-6xl font-semibold tracking-[-0.06em]">{projected.consequenceReach.systemCount}</p><p className="mb-2 text-sm text-zinc-500">reachable systems · {projected.consequenceReach.level}</p></div>
            <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10">{[["Credentials", projected.consequenceReach.credentials.length], ["Tools", projected.consequenceReach.tools.length], ["Data classes", projected.consequenceReach.dataClasses.length], ["Destinations", projected.consequenceReach.destinations.length], ["Production resources", projected.consequenceReach.productionResources.length], ["Downstream agents", projected.consequenceReach.downstreamAgents.length]].map(([label, value]) => <div key={label} className="bg-[#0c1119] p-4"><p className="text-xs text-zinc-600">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</div>
            <p className="mt-5 text-xs leading-5 text-zinc-600">Reach/exposure forecasting only. Cyber Sentinels does not claim exact damage prediction or exact incident prediction.</p>
          </article>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#090d14] p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-zinc-600">Recommended controls</p><h2 className="mt-2 text-2xl font-semibold">Minimum control to restore budget</h2></div><p className="text-xs text-zinc-600">least disruptive · most specific · expected restoration · evidence confidence</p></div>
          <div className="mt-6 overflow-hidden rounded-xl border border-white/10"><div className="hidden grid-cols-[3rem_1fr_8rem_8rem] gap-4 border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-zinc-600 md:grid"><span>Rank</span><span>Control</span><span>Restoration</span><span>Confidence</span></div>{projected.recommendedControls.map((control) => <div key={control.code} className="grid gap-2 border-b border-white/8 px-5 py-4 last:border-0 md:grid-cols-[3rem_1fr_8rem_8rem] md:items-center"><span className="text-sm text-zinc-600">{control.rank}</span><div><p className="text-sm font-semibold text-sky-100">{control.code}</p><p className="mt-1 text-xs text-zinc-600">{control.reason}</p></div><span className="text-sm">+{control.expectedRestoration}</span><span className="text-sm">{Math.round(control.evidenceConfidence * 100)}%</span></div>)}</div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-zinc-400">Recommended Trust Path: <strong className="text-zinc-100">direct production → sandbox with human approval</strong></p><p className="text-xs text-zinc-600">Advisory evidence only</p></div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <article data-demo-reason="AUTHORITY_SCOPE_INVALID" className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.035] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-rose-200">Canonical result</p><h2 className="mt-3 text-4xl font-semibold text-rose-100">{demo.canonicalRuntimeRequest.decision}</h2><p className="mt-3 font-mono text-sm text-rose-200">{demo.canonicalRuntimeRequest.reasonCode}</p><p className="mt-5 text-sm leading-6 text-zinc-400">Runtime request: write_repository. The counterfactual never executed it; the canonical evaluator independently denied it because write authority is invalid.</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-[#090d14] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">Forecast history</p><h2 className="mt-2 text-2xl font-semibold">Replayable trust evolution</h2><div className="mt-7 grid gap-4 sm:grid-cols-3">{[["09:00", baseline, "Baseline established"], ["09:20", projected, "Pressure spike projected"], ["09:40", controlled, "Control restored trust"]].map(([time, twin, label]) => { const item = twin as TrustTwin; return <div key={String(time)} className="border-l border-white/15 pl-4"><p className="font-mono text-xs text-zinc-600">{String(time)} UTC</p><p className="mt-2 text-sm font-semibold">{String(label)}</p><p className="mt-2 text-xs text-zinc-500">{item.trustForecast.state} · {item.trustPressure.value} → budget {item.trustBudget.remaining}</p></div>; })}</div>
          </article>
        </section>

        <section className="border-t border-white/10 pt-10">
          <div className="grid gap-4 md:grid-cols-4">{[["Evidence Graph", "Twin → conditions → pressure → budget → forecast → recommendation → decision → outcome."], ["Replay", "Reconstructs the before state, simulation, controls, canonical decision, and Twin update."], ["Trust Memory", "Retains material pressure spikes, budget events, forecast change, and restored trust only."], ["Receipt", "Keeps the canonical decision, evidence references, Trust Twin digest, and execution boundary together."]].map(([title, copy]) => <article key={title} className="border-t border-white/15 pt-4"><h2 className="text-sm font-semibold">{title}</h2><p className="mt-2 text-xs leading-5 text-zinc-600">{copy}</p></article>)}</div>
          <p className="mt-10 max-w-4xl text-xl leading-8 text-zinc-300">Cyber Sentinels saw the trust conditions weakening before the action, simulated the safer control path, and preserved the canonical result without claiming exact incident prediction.</p>
          <p className="mt-4 text-xs leading-5 text-zinc-600">Provider-neutral · no speculative ML · no parallel evidence store · no parallel decision engine · no production deployment</p>
        </section>
      </div>
    </main>
  );
}
