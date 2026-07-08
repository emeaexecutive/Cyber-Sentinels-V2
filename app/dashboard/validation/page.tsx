import Link from "next/link";
import { redirect } from "next/navigation";
import { ValidationBenchmarkDashboard } from "@/components/validation-benchmark-dashboard";
import { buildBenchmarkSummary } from "@/lib/benchmarking";
import { loadBenchmarkObservations } from "@/lib/benchmarking/server";
import { createClient } from "@/lib/supabase/server";
import { buildValidationMetrics } from "@/lib/validation-metrics";

export const dynamic = "force-dynamic";

export default async function ValidationDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/validation");

  const observations = await loadBenchmarkObservations(supabase);
  const metrics = buildValidationMetrics(observations);
  const summary = buildBenchmarkSummary(observations);
  const validationReadiness = [
    {
      label: "Implemented",
      items: [
        "Validation dashboard",
        "Benchmark dashboard",
        "Provider comparison table",
        "Replay and governance coverage metrics",
      ],
    },
    {
      label: "Measured",
      items: [
        `${observations.length} retained observation(s) in this window`,
        `${summary.replayContinuityScore}% replay continuity score`,
        `${summary.governanceResponseCoverage}% governance response coverage`,
      ],
    },
    {
      label: "Planned",
      items: [
        "Dataset dashboard with versioned registry",
        "Reviewed outcomes dashboard",
        "Calibration dashboard by workflow and provider",
      ],
    },
    {
      label: "Awaiting Data",
      items: [
        "Ground-truth labels from design-partner workflows",
        "Provider-backed outcomes with reviewer adjudication",
        "Precision, recall and calibration claims for published cohorts",
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Operational Validation
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold md:text-5xl">
            Trust workflow validation dashboard
          </h1>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-zinc-200">
            Cyber Sentinels helps organizations benchmark and understand operational trust continuity across workflows, identities and intelligent systems.
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            Metrics describe retained workflow records, replayable evidence, governance quality and provider-backed verification. Empty evidence remains visible; no accuracy is inferred.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/trust-replay" className="brand-primary-action brand-action-large text-sm">
              Review Replay
            </Link>
            <Link href="/dashboard/governance" className="brand-secondary-action brand-action-large text-sm">
              Governance Queue
            </Link>
            <Link href="/trust-center" className="brand-secondary-action brand-action-large text-sm">
              Trust Center
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {validationReadiness.map((lane) => (
            <article key={lane.label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-lg font-semibold text-zinc-100">{lane.label}</h2>
              <ul className="mt-4 grid gap-2 text-sm leading-6 text-zinc-400">
                {lane.items.map((item) => (
                  <li key={item} className="border-t border-zinc-800 pt-2">{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-8">
          <ValidationBenchmarkDashboard
            metrics={metrics}
            summary={summary}
            observations={observations}
          />
        </section>
      </div>
    </main>
  );
}
