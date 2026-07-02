import Link from "next/link";

const proofPath = [
  "Person, agent or workflow enters",
  "Identity, session and evidence checked",
  "Trust changes over time",
  "Governance intervenes",
  "Replay explains why",
  "Receipt preserves the outcome",
];

const platformSurfaces = [
  ["Persistent Trust Posture", "An explainable operational state that evolves as identity, authorization, evidence and workflow context change."],
  ["Continuous Identity", "Human and machine identities remain connected to verification freshness, session context and accountable review."],
  ["AI Agent Governance", "Agent identity, permission scope and governed execution stay visible throughout enterprise workflows."],
  ["Authorization Lineage", "Grants, changes and revocations remain connected to the authority and evidence behind them."],
  ["Governance Continuity", "Named review ownership and intervention history follow sensitive decisions across systems."],
  ["Replayable Evidence", "What changed, when it changed and why the final outcome was allowed, restricted or escalated."],
];

const workflowDomains = [
  ["Human identity", "Continuous verification and reviewable trust posture."],
  ["AI agents", "Registered identity, bounded permissions and governed execution."],
  ["Enterprise workflows", "Evidence continuity from entry through final outcome."],
  ["Hiring Security", "A major operational domain for identity, session and review integrity."],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#05070b] text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-12 md:px-8 md:pb-20 md:pt-20">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Operational trust infrastructure.
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
            Operational trust for intelligent systems.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200 md:text-xl md:leading-9">
            Understand identity, authenticity and trust across every workflow.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            Protect trust across humans, AI agents, enterprise workflows,
            authorization events and governance actions—then replay why it changed.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3">
          <Link href="/trust-center" className="brand-primary-action brand-action-large text-sm">
            Enter Trust Center
          </Link>
          <Link href="/enterprise-access" className="brand-secondary-action brand-action-large text-sm">
            Request Enterprise Access
          </Link>
          <Link href="/enterprise/hiring-security" className="rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-400 hover:text-white">
            Hiring Security
          </Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
              Proof workflow
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
              Trust changes. Cyber Sentinels shows why.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              One path connects entry, evidence, Trust Posture, governance, Replay Timeline and final receipt.
            </p>
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-6">
            {proofPath.map((step, index) => (
              <div key={step} className="border-t border-zinc-700 pt-4">
                <p className="text-xs font-semibold text-cyan-200">{index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Platform focus
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
            Persistent trust across identity, authority and execution.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Maintain continuous trust posture, preserve authorization lineage and keep human governance connected to every sensitive outcome.
          </p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {platformSurfaces.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-zinc-950/60">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">Operational domains</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-white">
            One trust layer, across human and machine activity.
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflowDomains.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
