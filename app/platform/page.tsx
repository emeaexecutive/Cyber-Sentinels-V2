const layers = [
  ["Persistent Trust Posture", "A current, explainable state across identity, evidence, authorization and governance history."],
  ["Continuous Identity", "Verification freshness and context remain visible after initial access is granted."],
  ["AI Agent Trust", "Registered agents carry declared purpose, permission scope, policy state and attributable activity."],
  ["Authorization Lineage", "Enterprise grants, changes and revocations retain their authority, rationale and chronology."],
  ["Governance Continuity", "Named human review and escalation remain attached to sensitive workflow transitions."],
  ["Replayable Evidence", "Operational history reconstructs what entered, what changed, who intervened and the final outcome."],
  ["Governed Execution", "High-impact human or agent actions advance within visible policy and evidence boundaries."],
  ["Hiring Security", "One major workflow domain applying the same trust, governance and replay infrastructure."],
];

export default function PlatformPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Platform
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Persistent operational trust for humans, agents and workflows.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels maintains continuous trust across identities,
            intelligent systems, authorization events and enterprise workflows.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            Trust evolves as evidence, permissions and context change. Governance
            and replay preserve why an action was allowed, restricted or escalated.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Assurance is consent-based and evidence-gated. Biometric references
            can support configured verification, but never establish certainty or
            replace human governance.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {layers.map(([title, body]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
