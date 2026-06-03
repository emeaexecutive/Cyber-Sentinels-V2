import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const productCards = [
  [
    "Create Trust Passports",
    "Start a structured trust record for a person, organisation, agent or workflow.",
  ],
  [
    "Upload Evidence",
    "Attach documents and supporting records to a verification workflow.",
  ],
  [
    "Review Verification",
    "Support governed review with evidence, status history and human oversight.",
  ],
  [
    "Track Audit Trails",
    "See what changed, when it changed and which workflow recorded it.",
  ],
  [
    "Visualise Trust Relationships",
    "Connect passports, evidence, decisions, signals and audit history.",
  ],
  [
    "Govern Operational Risk",
    "Keep trust decisions explainable, reviewable and grounded in evidence.",
  ],
];

const workflow = [
  ["1", "Create Passport", "Create the trust record."],
  ["2", "Upload Evidence", "Add supporting proof."],
  ["3", "Verification Review", "Review evidence with human oversight."],
  ["4", "Decision & Audit", "Record the outcome and audit history."],
  ["5", "Trust Visibility", "Track status, signals and relationships."],
];

const metrics = [
  ["passports", "Passports"],
  ["evidence_files", "Evidence Files"],
  ["audit_logs", "Audit Events"],
  ["verification_cases", "Verification Cases"],
];

async function liveCount(table: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  return { count: count ?? 0, available: !error };
}

export default async function HomePage() {
  const liveMetrics = await Promise.all(
    metrics.map(async ([table, label]) => ({
      table,
      label,
      ...(await liveCount(table)),
    }))
  );

  return (
    <main className="min-h-screen bg-[#04070c] text-white">
      <section className="border-b border-zinc-900 px-6 py-20 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-[0.28em] text-cyan-200">
            Evidence-backed trust
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight md:text-7xl">
            Cyber Sentinels™
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            Evidence-backed trust infrastructure for verification, governance
            and operational transparency.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/passport"
              className="rounded-lg bg-white px-5 py-3 font-semibold text-black hover:bg-cyan-100"
            >
              Create Trust Passport
            </Link>
            <Link
              href="/demo"
              className="rounded-lg border border-cyan-800 px-5 py-3 font-semibold text-cyan-100 hover:border-cyan-400"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-12 md:grid-cols-4 md:px-8">
        {[
          ["What is it?", "A governed Trust OS for evidence-backed verification workflows."],
          ["Who is it for?", "Teams and individuals who need reviewable trust, evidence and audit visibility."],
          ["What does it do?", "Creates passports, tracks evidence, records decisions and keeps audit history visible."],
          ["Why it matters", "Trust decisions should be understandable, human-governed and traceable."],
        ].map(([title, copy]) => (
          <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
          </article>
        ))}
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            What Cyber Sentinels Does
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {productCards.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:px-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          How It Works
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {workflow.map(([step, title, copy]) => (
            <div key={step} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-800 text-sm font-semibold text-cyan-100">
                {step}
              </p>
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Trust Principles Preview
          </p>
          <div className="mt-5 max-w-3xl">
            <h2 className="text-3xl font-semibold">
              Built for evidence, human oversight and auditability.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              Cyber Sentinels treats trust as an operational process. Evidence
              matters, decisions should be explainable, and high-risk outcomes
              should remain governed by humans.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {[
              ["/trust-principles", "Trust Principles"],
              ["/ai-governance", "AI Governance"],
              ["/transparency", "Transparency"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:px-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          System Metrics
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {liveMetrics.map((metric) => (
            <div key={metric.table} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                {metric.label}
              </p>
              <p className="mt-4 text-4xl font-semibold">
                {metric.available ? metric.count : "n/a"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
