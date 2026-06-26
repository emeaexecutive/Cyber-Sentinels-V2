import Link from "next/link";

export const dynamic = "force-dynamic";

const registryConcepts = [
  [
    "Organization-owned AI agents",
    "Agent identity should be connected to the organization responsible for its deployment.",
  ],
  [
    "Verification status",
    "Agent records can show whether ownership, purpose and operating scope have been reviewed.",
  ],
  [
    "Operational provenance",
    "Important actions should be traceable to signed activity, evidence and review context.",
  ],
  [
    "Signed activity visibility",
    "Teams should be able to see what an agent claimed to do, when it happened and which workflow it belonged to.",
  ],
  [
    "Governed execution",
    "Agent activity should carry identity, authorization, evidence and review context before sensitive actions are trusted.",
  ],
];

const accountabilityLinks = [
  "Organizations",
  "Human owners",
  "Governance workflows",
  "Operational accountability",
];

export default function AgentsPage() {
  return (
    <main className="min-h-screen bg-[#05070b] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Early Platform Direction
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-6xl">
            AI Agent Identity
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">
            AI systems are evolving from passive assistants into operational actors. Cyber Sentinels treats AI agent identity and authorization lineage as staged roadmap work tied to governance, provenance and accountable ownership.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Every autonomous action will need identity, authorization and evidence.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500">
            Cyber Sentinels does not replace human governance or operational
            accountability. Agent identity should strengthen review,
            provenance and ownership clarity while keeping humans and
            organizations responsible for outcomes.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-zinc-800 bg-black p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">
              Expansion Wedge
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Governed AI workflow layer
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              This is a strategic direction layer, not a full agent control platform. The near-term goal is to align organization-owned agents, signed activity, authorization lineage, governed execution and human-to-agent accountability without overbuilding runtime control.
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
                className="rounded-lg border border-zinc-800 bg-black p-5"
              >
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">
            Concept Preview
          </p>
          <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold">
                Agent identity should remain linked to people and organizations.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                A future agent profile can show owner, organization, declared
                scope, verification status and signed activity visibility
                while keeping governance decisions tied to accountable owners.
              </p>
            </div>
            <Link
              href="/trust/agent/example-agent"
              className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
            >
              View Concept Agent
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
