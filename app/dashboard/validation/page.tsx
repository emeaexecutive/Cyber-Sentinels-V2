import Link from "next/link";
import { redirect } from "next/navigation";
import { ValidationBenchmarkDashboard } from "@/components/validation-benchmark-dashboard";
import { DecisionSummary } from "@/components/executive-summary";
import { buildBenchmarkSummary } from "@/lib/benchmarking";
import { loadBenchmarkObservations } from "@/lib/benchmarking/server";
import { mlValidationEngine } from "@/lib/core/ml-validation-engine";
import { createClient } from "@/lib/supabase/server";
import { buildValidationMetrics } from "@/lib/validation-metrics";

export const dynamic = "force-dynamic";

function percent(value: number | null) {
  return value === null ? "Awaiting data" : `${Math.round(value * 100)}%`;
}

type ValidationEvidenceState = "Live" | "Test" | "Estimated" | "Unavailable";

export default async function ValidationDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/validation");

  const [observations, validation] = await Promise.all([
    loadBenchmarkObservations(supabase),
    mlValidationEngine.runMlValidationEngine(),
  ]);
  const metrics = buildValidationMetrics(observations);
  const summary = buildBenchmarkSummary(observations);
  const benchmark = validation.benchmark;
  const groundTruth = benchmark.groundTruth.validation;
  const metricReady = groundTruth.precision.status === "computed";
  const testState: ValidationEvidenceState = benchmark.caseCount ? "Test" : "Unavailable";
  const reviewedState: ValidationEvidenceState = groundTruth.reviewedSamples ? "Test" : "Unavailable";
  const computedState: ValidationEvidenceState = metricReady ? "Test" : "Unavailable";
  const validationMetrics: Array<{ label: string; value: string; state: ValidationEvidenceState }> = [
    { label: "Dataset version", value: benchmark.datasetCoverageReport.datasetVersion, state: testState },
    { label: "Ground truth availability", value: `${groundTruth.reviewedSamples}/${groundTruth.minimumReviewedSamples} reviewed samples`, state: reviewedState },
    { label: "Provider evidence", value: benchmark.providerAgreement === null ? "No reviewed provider comparison" : percent(benchmark.providerAgreement), state: benchmark.providerAgreement === null ? "Unavailable" : "Test" },
    { label: "Human-reviewed outcomes", value: String(groundTruth.reviewedSamples), state: reviewedState },
    { label: "Synthetic test coverage", value: benchmark.caseCount ? `${benchmark.caseCount} controlled case(s)` : "No controlled cases loaded", state: testState },
    { label: "Unknown rate", value: percent(groundTruth.unknownRate.value), state: computedState },
    { label: "Precision", value: percent(groundTruth.precision.value), state: computedState },
    { label: "Recall", value: percent(groundTruth.recall.value), state: computedState },
    { label: "False positives", value: metricReady ? String(groundTruth.confusionMatrix.falsePositives) : "Awaiting data", state: computedState },
    { label: "False negatives", value: metricReady ? String(groundTruth.confusionMatrix.falseNegatives) : "Awaiting data", state: computedState },
    { label: "Calibration status", value: metricReady ? "Calibration Complete" : "Calibration Incomplete", state: computedState },
    { label: "Retained workflow observations", value: String(observations.length), state: observations.length ? "Live" : "Unavailable" },
  ];
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
            Validation Center
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

        <div className="mt-6">
          <DecisionSummary items={[
            { label: "Current posture", value: observations.length ? "Measured workflow observations available" : "Awaiting validation data" },
            { label: "Current risks", value: observations.length ? "Cohort remains limited to retained observations" : "No reviewed cohort supports accuracy claims" },
            { label: "Recommended action", value: "Collect human-reviewed outcomes before publishing model metrics" },
            { label: "Evidence available", value: `${observations.length} measured observation(s)` },
            { label: "Confidence", value: "Measured where shown; provider supplied and estimated states remain separate" },
            { label: "Responsible owner", value: "Validation governance reviewer" },
          ]} />
        </div>

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

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">Validation proof</p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Reviewed ground-truth metrics</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Accuracy-like metrics remain unavailable until the reviewed sample and dataset-quality gates pass.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${metricReady ? "border-emerald-800 text-emerald-200" : "border-amber-800 text-amber-200"}`}>
              {metricReady ? "CALIBRATION COMPLETE" : "CALIBRATION INCOMPLETE"}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {validationMetrics.map((metric) => (
              <article key={metric.label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{metric.label}</p>
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-zinc-300">{metric.state}</span>
                </div>
                <p className="mt-2 text-lg font-semibold text-zinc-100">{metric.value}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-amber-200">{metricReady ? groundTruth.message : "Calibration incomplete - insufficient reviewed ground truth."}</p>
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Validation metric state legend">
            {(["Live", "Test", "Estimated", "Unavailable"] as ValidationEvidenceState[]).map((state) => <span key={state} className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs text-zinc-400">{state}</span>)}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">Decision-source audit</p>
          <h2 className="mt-3 text-2xl font-semibold">Every decision input remains attributable.</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {validation.decisionSourceAudit.map((item) => (
              <article key={item.source} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-zinc-100">{item.source}</h3>
                  <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">{item.state}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{item.evidence}</p>
                <p className="mt-3 border-t border-zinc-800 pt-3 text-xs leading-5 text-zinc-600">{item.boundary}</p>
              </article>
            ))}
          </div>
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
