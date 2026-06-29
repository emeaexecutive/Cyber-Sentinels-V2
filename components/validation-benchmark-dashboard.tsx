import type {
  BenchmarkObservation,
  BenchmarkSummary,
  ExplainableMetric,
} from "@/lib/benchmarking";

function percentageWidth(metric: ExplainableMetric) {
  if (metric.denominator === null) return Math.min(100, metric.value * 10);
  if (!metric.denominator) return 0;
  return Math.round((metric.value / metric.denominator) * 100);
}

export function ValidationBenchmarkDashboard({
  metrics,
  summary,
  observations,
  admin = false,
}: {
  metrics: ExplainableMetric[];
  summary: BenchmarkSummary;
  observations: BenchmarkObservation[];
  admin?: boolean;
}) {
  const interviewMetrics = [
    [
      "Candidate provenance",
      observations.filter((item) => item.kind === "candidate_provenance"),
    ],
    [
      "Recruiter verification",
      observations.filter((item) => item.kind === "recruiter_verification"),
    ],
    [
      "Proxy-candidate reviews",
      observations.filter((item) => item.kind === "proxy_candidate_review"),
    ],
    [
      "Voice / video mismatch reviews",
      observations.filter((item) => item.kind === "media_mismatch_review"),
    ],
    [
      "Session integrity outcomes",
      observations.filter((item) => item.kind === "session_integrity_failure"),
    ],
  ] as const;

  return (
    <div className="grid gap-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.id} className="rounded-lg border border-zinc-800 bg-black p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {metric.label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-zinc-100">
              {metric.displayValue}
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-cyan-400"
                style={{ width: `${percentageWidth(metric)}%` }}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              {metric.whatHappened}
            </p>
            <details className="mt-4 border-t border-zinc-800 pt-3 text-sm text-zinc-400">
              <summary className="cursor-pointer text-cyan-200">Explain metric</summary>
              <div className="mt-3 grid gap-3 leading-6">
                <p><span className="text-zinc-200">Evidence:</span> {metric.evidenceContributed.slice(0, 4).join(", ") || "No linked evidence in this window."}</p>
                <p><span className="text-zinc-200">Governance:</span> {metric.governanceAction}</p>
                <p><span className="text-zinc-200">Why trust changed:</span> {metric.whyTrustChanged}</p>
                <p className="text-zinc-500">{metric.boundary}</p>
              </div>
            </details>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Continuity benchmark
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Replay continuity", `${summary.replayContinuityScore}%`],
              ["Governance response coverage", `${summary.governanceResponseCoverage}%`],
              ["Anomaly frequency", `${summary.anomalyFrequency}% of retained observations`],
              ["Session integrity trend", summary.sessionIntegrityTrend.replaceAll("_", " ")],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                <p className="mt-2 text-lg font-semibold capitalize text-zinc-100">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 border-t border-zinc-800 pt-4 text-xs leading-6 text-zinc-500">
            {summary.boundary}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Interview integrity benchmarking
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Provenance and mismatch records are review measures. They do not automatically reject a candidate or accuse a workflow actor.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {interviewMetrics.map(([label, rows]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-100">{label}</p>
                  <span className="font-mono text-sm text-cyan-200">{rows.length}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {rows.filter((row) => row.evidenceReferences.length > 0).length} evidence-linked /{" "}
                  {rows.filter((row) => row.governanceAction).length} governance-linked
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
          Provider comparison
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Observed</th>
                <th className="px-4 py-3">Success state</th>
                <th className="px-4 py-3">Failure state</th>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Evidence coverage</th>
              </tr>
            </thead>
            <tbody>
              {summary.providerComparison.length ? (
                summary.providerComparison.map((provider) => (
                  <tr key={provider.provider} className="border-t border-zinc-800 bg-black">
                    <th className="px-4 py-3 font-semibold text-zinc-100">{provider.provider}</th>
                    <td className="px-4 py-3 text-zinc-300">{provider.observedWorkflows}</td>
                    <td className="px-4 py-3 text-zinc-300">{provider.observedSuccesses}</td>
                    <td className="px-4 py-3 text-zinc-300">{provider.observedFailures}</td>
                    <td className="px-4 py-3 text-zinc-300">{provider.reviewRequired}</td>
                    <td className="px-4 py-3 text-zinc-300">{provider.evidenceCoverage}%</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-zinc-800 bg-black">
                  <td colSpan={6} className="px-4 py-5 text-zinc-500">
                    No provider-backed workflow observations are available in this window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-6 text-zinc-500">
          Observed workflow states and evidence coverage only. This table does not claim provider accuracy or superiority.
        </p>
      </section>

      {admin ? (
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Workflow risk comparison
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summary.workflowRiskComparison.map((workflow) => (
              <article key={workflow.workflowType} className="rounded-lg border border-zinc-800 bg-black p-4">
                <h3 className="font-semibold capitalize text-zinc-100">
                  {workflow.workflowType.replaceAll("_", " ")}
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-zinc-400">
                  <p>Observations {workflow.observations}</p>
                  <p>Escalations {workflow.escalations}</p>
                  <p>Anomalies {workflow.anomalies}</p>
                  <p>Completion quality {workflow.completionQuality}%</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">{workflow.explanation}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
