import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const workflow = [
  ["1", "Create Passport", "Create the subject trust record.", "/passport"],
  ["2", "Upload Evidence", "Attach proof to the verification case.", "/evidence-upload"],
  ["3", "Review", "Approve, reject or escalate with admin oversight.", "/verification-queue"],
  ["4", "Inspect", "Open the passport, audit trail and graph.", "/passports"],
];

const pillars = [
  ["Identity", "Who is being verified."],
  ["Evidence", "What supports the claim."],
  ["Decision", "What an admin approved or rejected."],
  ["Audit", "What happened, when and by whom."],
];

const metricTables = [
  ["passports", "Passports"],
  ["verification_cases", "Reviews"],
  ["evidence_files", "Evidence"],
  ["decisions", "Decisions"],
  ["audit_logs", "Audit Events"],
  ["signals", "Signals"],
];

async function liveCount(table: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  return { count: count ?? 0, available: !error };
}

export default async function HomePage() {
  const metrics = await Promise.all(
    metricTables.map(async ([table, label]) => ({
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
            Cyber Sentinels Trust OS
          </p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-tight md:text-7xl">
            Operational trust visibility.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            Create Trust Passports, attach evidence, review decisions and
            inspect graph-backed audit trails from one clear operating system.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/passport"
              className="rounded-lg bg-white px-5 py-3 font-semibold text-black hover:bg-cyan-100"
            >
              Create Passport
            </Link>
            <Link
              href="/how-to-use"
              className="rounded-lg border border-cyan-800 px-5 py-3 font-semibold text-cyan-100 hover:border-cyan-400"
            >
              How to Use
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:px-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Start Here
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {workflow.map(([step, title, copy, href]) => (
            <Link
              key={step}
              href={href}
              className="rounded-lg border border-zinc-800 bg-black p-5 hover:border-cyan-800"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
                Step {step}
              </p>
              <h2 className="mt-4 text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Trust OS Pillars
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {pillars.map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:px-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Live Operating Metrics
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {metrics.map((metric) => (
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
