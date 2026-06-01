import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const workflowSteps = [
  ["01", "Create Passport", "Identity proves who.", "/passport"],
  ["02", "Upload Evidence", "Evidence proves why.", "/evidence-upload"],
  ["03", "Review Evidence", "Human review remains in the loop.", "/back-office#evidence-review"],
  ["04", "Approve / Reject", "Every decision leaves a trail.", "/back-office#verification-queue"],
  ["05", "View Trust Passport", "Trust is dynamic.", "/passports"],
];

const positioningCards = [
  ["Workforce Trust", "Evidence-backed review for people, candidates and teams."],
  ["Evidence Chain", "Files, URLs, review status and timestamps connected to each case."],
  ["Intent Verification", "Trust context before sensitive actions move forward."],
  ["Autonomy Governance", "Accountability for agents, workflows and delegated action."],
  ["Audit-Ready Decisions", "Decisions, signals and audit events in one operating trail."],
];

const metricTables = [
  ["passports", "Passports"],
  ["verification_cases", "Verification Cases"],
  ["evidence_files", "Evidence Files"],
  ["decisions", "Decisions"],
  ["audit_logs", "Audit Events"],
  ["signals", "Signals"],
];

async function liveCount(table: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  return {
    count: count ?? 0,
    available: !error,
  };
}

export default async function HomePage() {
  const liveMetrics = await Promise.all(
    metricTables.map(async ([table, label]) => ({
      table,
      label,
      ...(await liveCount(table)),
    }))
  );
  const metricsUnavailable = liveMetrics.some((metric) => !metric.available);

  return (
    <main className="min-h-screen bg-[#04070c] text-white">
      <section className="relative min-h-[92vh] overflow-hidden border-b border-cyan-950/60">
        <Image
          src="/cyber-sentinels-hero.png"
          alt="Cyber Sentinels trust operations interface"
          fill
          priority
          className="object-cover opacity-70"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(8,145,178,0.2),transparent_34%),linear-gradient(90deg,rgba(0,0,0,0.92),rgba(2,6,23,0.76),rgba(0,0,0,0.72))]" />
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#04070c] to-transparent" />

        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-between px-6 py-7 md:px-8">
          <div />

          <div className="max-w-5xl pb-12">
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-200">
              Trust Infrastructure / Workforce Trust
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.02] md:text-7xl">
              Identity is not trust.
            </h1>
            <p className="mt-5 max-w-3xl text-2xl font-medium text-zinc-100 md:text-3xl">
              Trust requires evidence.
            </p>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
              Cyber Sentinels verifies people, candidates, agents and digital
              workflows through evidence-backed trust governance.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              Cyber Sentinels turns identity, evidence, signals and human
              review into an auditable Trust Passport.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/passport"
                className="rounded-lg bg-white px-5 py-3 font-semibold text-black hover:bg-cyan-100"
              >
                Create Trust Passport
              </Link>
              <Link
                href="/back-office"
                className="rounded-lg border border-cyan-300/40 bg-black/35 px-5 py-3 font-semibold text-cyan-100 backdrop-blur hover:border-cyan-200"
              >
                Enter Trust OS
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-900 bg-black">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 md:grid-cols-4 md:px-8">
          {[
            ["Evidence before approval.", "Governance"],
            ["Every decision leaves a trail.", "Audit"],
            ["Trust is dynamic.", "Signals"],
            ["Human review remains in the loop.", "Review"],
          ].map(([copy, label]) => (
            <div key={copy} className="border-l border-cyan-900/70 pl-4">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/70">
                {label}
              </p>
              <p className="mt-2 text-lg font-medium text-zinc-100">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-8">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trust OS Workflow
          </p>
          <h2 className="mt-4 text-3xl font-semibold md:text-5xl">
            From identity record to auditable trust timeline.
          </h2>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-5">
          {workflowSteps.map(([step, label, copy, href]) => (
            <Link
              key={step}
              href={href}
              className="rounded-lg border border-zinc-800 bg-[#07111c] p-4 transition hover:border-cyan-500/70 hover:bg-[#0a1725]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Step {step}
                </span>
                <span className="rounded-full border border-cyan-800 px-2 py-1 text-[11px] text-cyan-200">
                  Active
                </span>
              </div>
              <h3 className="mt-5 min-h-12 font-semibold text-zinc-100">
                {label}
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950/80">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-8">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.24em] text-blue-200">
              Market Positioning
            </p>
            <h2 className="mt-4 text-3xl font-semibold md:text-5xl">
              The Trust Layer for AI, Hiring and Digital Identity
            </h2>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {positioningCards.map(([title, copy]) => (
              <div
                key={title}
                className="rounded-lg border border-zinc-800 bg-black p-5"
              >
                <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
                <p className="mt-4 text-sm leading-6 text-zinc-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-200">
              Operating Proof
            </p>
            <h2 className="mt-4 text-3xl font-semibold md:text-5xl">
              Live trust operations, not static identity claims.
            </h2>
          </div>
          <Link
            href="/back-office"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-cyan-500 hover:text-white"
          >
            Open Back Office
          </Link>
        </div>
        {metricsUnavailable ? (
          <p className="mt-8 rounded-lg border border-amber-900/70 bg-amber-950/20 p-4 text-sm text-amber-200">
            Live metrics unavailable.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {liveMetrics.map((metric) => (
              <div
                key={metric.table}
                className="rounded-lg border border-zinc-800 bg-black p-5"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  {metric.label}
                </p>
                <p className="mt-4 text-4xl font-semibold text-white">
                  {metric.count}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
