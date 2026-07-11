import Link from "next/link";
import { DecisionSummary } from "@/components/executive-summary";
import type { NetworkIntelligenceSummary } from "@/lib/network-intelligence";

function trendClass(trend: NetworkIntelligenceSummary["signals"][number]["trend"]) {
  if (trend === "increasing") return "border-amber-900 text-amber-200";
  if (trend === "decreasing") return "border-emerald-900 text-emerald-200";
  return "border-zinc-700 text-zinc-300";
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function SignalGrid({
  summary,
  simulated = false,
}: {
  summary: NetworkIntelligenceSummary;
  simulated?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {summary.signals.map((signal) => (
        <article key={signal.id} className="rounded-lg border border-zinc-800 bg-black p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">
                {simulated ? "Controlled simulation" : signal.evidenceCategory}
              </p>
              <h3 className="mt-2 font-semibold text-zinc-100">{signal.label}</h3>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${trendClass(signal.trend)}`}>
              {label(signal.trend)}
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-cyan-100">
            {signal.suppressed ? "Suppressed" : signal.count}
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{signal.whatChanged}</p>
          <div className="mt-4 border-t border-zinc-800 pt-4 text-sm leading-6 text-zinc-500">
            <p><span className="text-zinc-400">Why it matters:</span> {signal.whyItMatters}</p>
            <p className="mt-2"><span className="text-zinc-400">Operational advisory:</span> {signal.advisory}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {signal.sourceClasses.map((source) => (
              <span key={source} className="rounded-full border border-zinc-800 px-2.5 py-1 text-xs capitalize text-zinc-500">
                {source}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function NetworkIntelligenceDashboard({
  live,
  simulation,
  enterprise = false,
}: {
  live: NetworkIntelligenceSummary;
  simulation: NetworkIntelligenceSummary;
  enterprise?: boolean;
}) {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-9 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid-bg rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            {enterprise ? "Consortium Intelligence Foundations" : "Network Risk"}
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold md:text-6xl">
            Shared operational patterns, without shared identities.
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-zinc-200">
            Cyber Sentinels helps organizations understand operational trust
            continuity and emerging workflow risk patterns across intelligent
            systems through aggregated, explainable evidence categories.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/trust-replay" className="brand-primary-action brand-action-large text-sm">
              Review Canonical Replay
            </Link>
            <Link href="/dashboard/governance" className="brand-secondary-action brand-action-large text-sm">
              Governance Awareness
            </Link>
            <Link href={enterprise ? "/admin/benchmarking" : "/dashboard/validation"} className="brand-secondary-action brand-action-large text-sm">
              Source Benchmarking
            </Link>
          </div>
        </section>

        <div className="mt-6">
          <DecisionSummary items={[
            { label: "Current posture", value: live.observationCount ? "Aggregated operational evidence available" : "No cohort meets the reporting threshold" },
            { label: "Current risks", value: `${live.signals.filter((signal) => signal.trend === "increasing").length} increasing pattern(s)` },
            { label: "Recommended action", value: "Review increasing patterns against local workflow evidence" },
            { label: "Evidence available", value: `${live.observationCount} aggregated observation(s)` },
            { label: "Confidence", value: "Measured aggregates; small cohorts suppressed; simulations separate" },
            { label: "Responsible owner", value: "Network risk and governance reviewer" },
          ]} />
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Aggregated observations", live.observationCount],
            ["Workflow categories", live.workflowCategoryCount],
            ["Explainable indicators", live.signals.length],
            ["Minimum cohort", live.minimumCohortSize],
          ].map(([name, value]) => (
            <article key={name} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{name}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Authorized operational evidence window
          </p>
          <h2 className="mt-3 text-3xl font-semibold">Aggregated network signals</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            Small cohorts are suppressed. Counts describe retained operational
            categories; they do not identify people, expose organizations or
            establish that wrongdoing occurred.
          </p>
          <div className="mt-5">
            <SignalGrid summary={live} />
          </div>
        </section>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Provider reliability summaries
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Operational history, not provider rankings.</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {live.providerReliability.length ? live.providerReliability.map((provider) => (
              <article key={provider.provider} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h3 className="font-semibold text-zinc-100">{provider.provider}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{provider.summary}</p>
              </article>
            )) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm leading-6 text-zinc-500 md:col-span-2">
                No provider cohort meets the minimum aggregation threshold.
                Provider names and small samples remain suppressed.
              </p>
            )}
          </div>
        </section>

        <section className="mt-10 border-t border-zinc-800 pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
            Simulated advisory patterns
          </p>
          <h2 className="mt-3 text-3xl font-semibold">Controlled fixtures remain separate.</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            These scenarios test aggregation, suppression and explanation
            behavior. They are not live consortium observations or detection
            effectiveness claims.
          </p>
          <div className="mt-5">
            <SignalGrid summary={simulation} simulated />
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-cyan-950 bg-cyan-950/10 p-5">
          <h2 className="font-semibold text-cyan-100">Privacy and governance boundary</h2>
          <p className="mt-2 max-w-5xl text-sm leading-7 text-zinc-300">
            Outputs are aggregated operational advisories. Identity data, raw
            biometrics, workflow references and personal profiles are excluded.
            No signal authorizes public identity scoring, cross-organization
            identity disclosure or automatic accusation.
          </p>
        </section>
      </div>
    </main>
  );
}
