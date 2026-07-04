import { TrustOpsOperatingStack } from "@/components/trustops-operating-stack";

const operatingModel = [
  ["Memory", "Replay preserves who acted, what changed, which evidence existed, what governance occurred and which outcome followed as durable enterprise memory."],
  ["State", "Persistent Trust Posture shows the current explainable condition across actors, workflows, approvals and runtime sessions."],
  ["Control", "Governed execution keeps authorization, evidence and accountable human intervention connected to consequential work."],
  ["Sovereignty", "Enterprise policy controls operational memory, restricted data, provider use and workflow IP."],
];

export default function PlatformPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">
            Governed enterprise intelligence
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            The operational trust operating system for intelligent enterprises.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels connects humans, AI agents and enterprise workflows
            through replayable operational memory, persistent posture, governed
            execution and enterprise AI sovereignty.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels preserves operational trust continuity across
            humans, AI agents and enterprise workflows.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            Trust changes over time. Persistent Trust Posture explains the
            current state. Replay provides durable enterprise memory for
            operational trust.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            The operating system coordinates trust continuity without replacing
            accountable human authority, workflow systems of record or existing
            security controls.
          </p>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">One operating model</p>
          <h2 className="mt-3 text-2xl font-semibold">
            Memory, state, control and enterprise ownership.
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {operatingModel.map(([title, copy]) => (
              <article key={title} className="operational-card p-4">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-500">
            Governed enterprise intelligence means reviewable operational
            context—not automated judgment. Evidence, authority, trust changes
            and outcomes remain available to accountable decision-makers.
          </p>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">Eight connected layers</p>
          <h2 className="mt-3 text-2xl font-semibold">The TrustOps operating stack.</h2>
          <div className="mt-6">
            <TrustOpsOperatingStack />
          </div>
        </section>
      </div>
    </main>
  );
}
