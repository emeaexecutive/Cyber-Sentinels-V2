export const trustOpsOperatingLayers = [
  ["Actor Identity", "Verify the human, AI agent, service account or API actor entering the workflow."],
  ["Session Integrity", "Keep runtime, channel and continuity signals visible without treating one signal as certainty."],
  ["Authorization Lineage", "Retain delegated scope, grants, changes and revocations with accountable authority."],
  ["Evidence Chain", "Connect provider and workflow evidence to its source, time, decision and operational context."],
  ["Governance Review", "Route material changes to named reviewers with rationale and recorded action."],
  ["Replay Timeline", "Reconstruct actor, workflow, evidence, authorization changes, governance, trust-state evolution and outcome."],
  ["Persistent Trust Posture", "Show how trust evolves, escalates, decays, recovers and re-verifies over time."],
  ["Enterprise AI Sovereignty", "Keep operational data, provider use, workflow memory and IP under enterprise policy."],
] as const;

export function TrustOpsOperatingStack({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-4"}`}>
      {trustOpsOperatingLayers.map(([title, copy], index) => (
        <article key={title} className="operational-card min-w-0 p-4">
          <p className="font-mono text-xs text-cyan-300">
            {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-2 text-sm font-semibold text-zinc-100">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
        </article>
      ))}
    </div>
  );
}
