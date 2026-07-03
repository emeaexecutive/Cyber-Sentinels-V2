const layers = [
  ["Persistent Trust Posture", "A current, explainable state across identity, evidence, authorization and governance history."],
  ["Continuous Identity", "Verification freshness and context remain visible after initial access is granted."],
  ["AI Agent Trust", "Registered agents carry declared purpose, permission scope, policy state and attributable activity."],
  ["Authorization Lineage", "Enterprise grants, changes and revocations retain their authority, rationale and chronology."],
  ["Governance Continuity", "Named human review and escalation remain attached to sensitive workflow transitions."],
  ["Replayable Evidence", "Operational history reconstructs what entered, what changed, who intervened and the final outcome."],
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
            Persistent operational trust for humans, agents and workflows.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels is the operational trust and verification layer for
            intelligent systems: people, AI agents and enterprise workflows.
            TrustOps verifies who acted, how the workflow changed and which
            operational outcome the evidence supports.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            Trust changes over time. Persistent Trust Posture explains the current
            state; Replay Timeline preserves the evidence, authority and Governance
            Review that produced it.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            The platform keeps workflow decisions explainable without replacing
            accountable human authority or turning trust into a permanent score.
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
