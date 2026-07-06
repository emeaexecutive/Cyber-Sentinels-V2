import Link from "next/link";

export const dynamic = "force-dynamic";

const registryConcepts = [
  [
    "Organization-owned AI agents",
    "Agent identity should be connected to the organization responsible for its deployment.",
  ],
  [
    "Governed execution",
    "Agent activity should carry identity, authorization, evidence and review context before sensitive actions are trusted.",
  ],
  [
    "Replayable execution",
    "Actions, evidence, authorization changes and reviewer intervention remain one operational chronology.",
  ],
  [
    "Operational accountability",
    "Every agent remains attributable to an owner, declared purpose, delegated authority and reviewable outcome.",
  ],
];

const accountabilityLinks = [
  "Organizations",
  "Human owners",
  "Governance workflows",
  "Operational accountability",
];

const runtimeControls = [
  ["Runtime posture", "Current identity, authorization, policy, evidence and anomaly state remains visible without collapsing trust into a universal score."],
  ["Delegated authority", "Every sensitive action can be evaluated against the scope, owner and approval path under which it was executed."],
  ["Posture changes", "New evidence, context shifts and governance interventions produce explainable state transitions."],
  ["Replay continuity", "Activity, authorization changes and review decisions remain one operational history after execution ends."],
  ["Execution continuity", "Requested action, delegated scope, runtime evidence, intervention and outcome remain connected across the full operation."],
  ["Signed action receipts", "Consequential actions retain actor, authority, declared intent, constraints, evidence and outcome for verification."],
  ["Kill-switch visibility", "Revocation and interruption state remain visible to reviewers; Cyber Sentinels does not imply control the runtime has not exposed."],
  ["Blast-radius review", "Delegated scope, reachable systems and action sensitivity provide bounded review context rather than a universal risk score."],
  ["Shadow-agent risk", "Unregistered or ownerless automation is routed for identity, authority and governance review before reliance."],
];

const actionAccountability = [
  ["Request", "The intended action and workflow purpose are recorded."],
  ["Authority", "Active delegated scope and accountable ownership are checked."],
  ["Runtime", "Evidence, policy state and material anomalies remain visible."],
  ["Intervention", "Governance action and human review remain attributable."],
  ["Outcome", "The final state and unresolved conditions enter Replay."],
];

export default function AgentsPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">
            Governed AI operations
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-6xl">
            Authorization-aware AI execution.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">
            AI agents participate in operational workflows. Cyber Sentinels links
            agent identity and Authorization Lineage to Trust Posture, governed
            execution, workflow verification, Replay Timeline and accountable
            ownership.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Each action remains connected to declared purpose, active authority,
            evidence, governance state and final outcome. Named people and
            organizations remain accountable; AI agents do not approve work
            outside declared authority.
          </p>
        </section>

        <section className="mt-8 operational-panel p-6">
          <p className="operational-eyebrow">Replayable AI actions</p>
          <h2 className="mt-3 max-w-3xl text-2xl font-semibold">
            Every consequential action retains its accountability chain.
          </h2>
          <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-5">
            {actionAccountability.map(([title, copy], index) => (
              <article key={title} className="min-w-0 bg-black p-4">
                <p className="font-mono text-xs text-cyan-300">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">Runtime trust operations</p>
          <h2 className="mt-3 max-w-3xl text-2xl font-semibold">
            See risk, authority and governance as execution unfolds.
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {runtimeControls.map(([title, copy]) => (
              <article key={title} className="operational-card p-5">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="operational-card p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">
              Operational Boundary
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Governed AI workflow layer
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              Organization-owned agents, activity records, Authorization
              Lineage, governed execution and human accountability remain
              connected. Cyber Sentinels makes runtime trust reviewable without
              claiming control that an underlying workflow system does not provide.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {accountabilityLinks.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {registryConcepts.map(([title, copy]) => (
              <article
                key={title}
                className="operational-card p-5"
              >
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">
            Registry Record
          </p>
          <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold">
                Agent identity should remain linked to people and organizations.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                An agent profile can show verified name, owner organization,
                identity claims, declared scope, registry status and activity history
                while keeping governance decisions tied to accountable owners.
              </p>
            </div>
            <Link
              href="/trust/agent/example-agent"
              className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
            >
              View Agent Record
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
