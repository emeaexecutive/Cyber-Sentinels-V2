import {
  TRUST_LIFECYCLE_PHASES,
  phaseLabel,
  type LifecycleDashboardSnapshot,
} from "@/lib/core/trust-lifecycle";

function readable(value: string) {
  return value.replaceAll("_", " ");
}

export function ContinuousTrustLifecycleDashboard({
  snapshot,
}: {
  snapshot: LifecycleDashboardSnapshot;
}) {
  const currentIndex = TRUST_LIFECYCLE_PHASES.indexOf(snapshot.currentStage);
  const latestConfidence = snapshot.confidenceTrend.at(-1)?.confidence;
  const summary = [
    ["Current lifecycle stage", phaseLabel(snapshot.currentStage)],
    ["Current trust posture", readable(snapshot.currentTrustPosture)],
    ["Evidence completeness", `${snapshot.evidenceCompleteness}%`],
    ["Governance state", readable(snapshot.governanceState)],
    ["Confidence trend", latestConfidence === undefined ? "Not calculated" : `${Math.round(latestConfidence * 100)}%`],
    ["Replay availability", snapshot.replayAvailable ? "Available" : "Awaiting evidence"],
  ];

  return (
    <section className="mt-8 operational-panel p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="operational-eyebrow">Continuous Trust Lifecycle</p>
          <h2 className="mt-2 text-2xl font-semibold">Lifecycle trust operations</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Trust evolves across identity, credentials, devices, sessions, runtime activity,
            governance and recovery. Each phase remains linked to evidence, replay and Trust Memory™.
          </p>
        </div>
        <span className="rounded-full border border-cyan-900 px-3 py-1 text-xs font-semibold capitalize text-cyan-100">
          {readable(snapshot.governanceState)}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {summary.map(([label, value]) => (
          <article key={label} className="operational-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{label}</p>
            <p className="mt-2 text-sm font-semibold capitalize text-zinc-100">{value}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-800">
        <div className="grid min-w-[1080px] grid-flow-col auto-cols-[minmax(96px,1fr)] bg-zinc-800 gap-px">
          {TRUST_LIFECYCLE_PHASES.map((phase, index) => {
            const state = index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
            return (
              <div key={phase} className={state === "current" ? "bg-cyan-950/50 p-3" : "bg-black p-3"}>
                <p className="font-mono text-[10px] text-zinc-600">{String(index + 1).padStart(2, "0")}</p>
                <p className={state === "current" ? "mt-2 text-xs font-semibold text-cyan-100" : "mt-2 text-xs font-medium text-zinc-300"}>
                  {phaseLabel(phase)}
                </p>
                <p className="mt-2 text-[10px] capitalize text-zinc-600">{state}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="operational-card p-4">
          <h3 className="text-sm font-semibold text-zinc-100">Outstanding actions</h3>
          {snapshot.outstandingActions.length ? (
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              {snapshot.outstandingActions.map((action) => <li key={action}>• {action}</li>)}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No outstanding lifecycle action.</p>
          )}
        </article>
        <article className="operational-card p-4">
          <h3 className="text-sm font-semibold text-zinc-100">Trust Memory™ summary</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{snapshot.trustMemorySummary}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.12em] text-zinc-600">
            Template: {readable(snapshot.template)}
          </p>
        </article>
      </div>
    </section>
  );
}
