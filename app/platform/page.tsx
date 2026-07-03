const layers = [
  ["Replayable Operational Memory", "The foundational chronology of what entered, what changed, which authority acted, why posture shifted and how the workflow concluded."],
  ["Persistent Trust Posture", "A current, explainable state across identity, evidence, authorization and governance history."],
  ["Continuous Identity", "Verification freshness and context remain visible after initial access is granted."],
  ["AI Agent Trust", "Registered agents carry declared purpose, permission scope, policy state and attributable activity."],
  ["Authorization Lineage", "Enterprise grants, changes and revocations retain their authority, rationale and chronology."],
  ["Governance Continuity", "Named human review and escalation remain attached to sensitive workflow transitions."],
  ["Governed Execution", "High-impact human or agent actions advance within visible policy and evidence boundaries."],
  ["Workflow Verification", "Actor, execution, evidence and outcome are evaluated as one governed operational record."],
  ["Hiring Security", "One major workflow domain applying the same trust, governance and replay infrastructure."],
];

export default function PlatformPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">
            Trust Operations platform
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Operational trust for intelligent systems.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels is the operational trust infrastructure layer for
            humans, AI agents and enterprise workflows. TrustOps connects
            persistent posture, governed execution, workflow verification and
            operational accountability.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            Trust changes over time. Persistent Trust Posture explains the
            current state. Replay provides operational memory for enterprise
            trust.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            The platform keeps workflow decisions explainable without replacing
            accountable human authority or turning trust into a permanent score.
          </p>
          <p className="mt-5 max-w-3xl border-l border-cyan-800 pl-4 text-base leading-7 text-zinc-200">
            We verify the actor, the workflow and the evidence behind critical
            operations.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {layers.map(([title, body]) => (
            <article key={title} className="operational-card p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
