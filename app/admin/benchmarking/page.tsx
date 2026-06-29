import Link from "next/link";
import { ValidationBenchmarkDashboard } from "@/components/validation-benchmark-dashboard";
import { buildBenchmarkSummary } from "@/lib/benchmarking";
import {
  benchmarkSimulationObservations,
} from "@/lib/benchmarking/records";
import { loadBenchmarkObservations } from "@/lib/benchmarking/server";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { buildValidationMetrics } from "@/lib/validation-metrics";

export const dynamic = "force-dynamic";

export default async function BenchmarkingPage() {
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: "/admin/benchmarking" });

  const liveObservations = await loadBenchmarkObservations(supabase);
  const liveMetrics = buildValidationMetrics(liveObservations);
  const liveSummary = buildBenchmarkSummary(liveObservations);
  const simulationMetrics = buildValidationMetrics(benchmarkSimulationObservations);
  const simulationSummary = buildBenchmarkSummary(benchmarkSimulationObservations);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Operational Trust Benchmarking
          </p>
          <h1 className="mt-3 max-w-5xl text-4xl font-semibold md:text-5xl">
            Measurable workflow evidence, without invented certainty.
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-300">
            Compare provider workflow observations, replay continuity, governance response and interview-integrity review coverage. Counts and ratios reflect retained records—not fraud-detection or biometric accuracy.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/admin/test-lab" className="brand-primary-action brand-action-large text-sm">
              Open Validation Lab
            </Link>
            <Link href="/dashboard/validation" className="brand-secondary-action brand-action-large text-sm">
              Validation Dashboard
            </Link>
            <Link href="/status/verification" className="brand-secondary-action brand-action-large text-sm">
              Verification Status
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
              Authorized operational records
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Live evidence window</h2>
          </div>
          <ValidationBenchmarkDashboard
            metrics={liveMetrics}
            summary={liveSummary}
            observations={liveObservations}
            admin
          />
        </section>

        <section className="mt-10 border-t border-zinc-800 pt-10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
              Controlled simulations
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Benchmark fixture outcomes</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
              Synthetic candidate, replay divergence, provider instability, governance-chain and injected-session fixtures validate metric behavior. They are clearly separated from live records and are not accuracy benchmarks.
            </p>
          </div>
          <ValidationBenchmarkDashboard
            metrics={simulationMetrics}
            summary={simulationSummary}
            observations={benchmarkSimulationObservations}
            admin
          />
        </section>
      </div>
    </main>
  );
}
