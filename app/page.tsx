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
  ["Persistent Trust Posture", "The current, explainable state of identity, authorization, evidence and workflow context."],
  ["Governed Workflows", "Human and agent activity stays inside visible authority, evidence and review boundaries."],
  ["Governed Trust Continuity", "Authorization changes and reviewer interventions remain connected to their rationale."],
  ["Replayable Operational Trust", "Replay Timeline preserves what changed, who intervened and why the outcome followed."],
];

const workflowDomains = [
  ["Human identity", "Continuous verification and reviewable trust posture."],
  ["AI agents", "Registered identity, bounded permissions and governed execution."],
  ["Enterprise workflows", "Evidence continuity from entry through final outcome."],
  ["Hiring Security", "A major operational domain for identity, session and review integrity."],
];

export default function Home() {
  return (
    <main className="operational-shell min-h-screen text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-12 md:px-8 md:pb-20 md:pt-20">
        <div className="max-w-4xl">
          <p className="operational-eyebrow">
            Operational trust infrastructure.
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
            Operational trust for intelligent systems.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200 md:text-xl md:leading-9">
            Trust is not a moment. It is a continuous operational state.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            Protect people, AI agents and enterprise workflows by keeping
            identity, authorization, evidence and governance connected—then
            replay why each outcome followed.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3">
          <Link href="/verification-replay" className="brand-primary-action brand-action-large text-sm">
            See Replay Timeline
          </Link>
          <Link href="/enterprise-access" className="brand-secondary-action brand-action-large text-sm">
            Request Enterprise Access
          </Link>
          <Link href="/trust-center" className="rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-400 hover:text-white">
            Trust Center
          </Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <div className="max-w-3xl">
            <p className="operational-eyebrow">
              Proof workflow
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
              Trust changes. Cyber Sentinels shows why.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              Trust changes over time. Replay connects entry, evidence, Trust
              Posture, Governance Review and final outcome.
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
          <p className="operational-eyebrow">
            Platform focus
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
            Governed trust continuity across identity, authority and execution.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Persistent Trust Posture shows what is true now. Replay Timeline
            preserves the operational memory of how it became true.
          </p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {platformSurfaces.map(([title, copy]) => (
            <article key={title} className="operational-card p-5">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-zinc-950/60">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <p className="operational-eyebrow">Operational domains</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-white">
            One trust layer, across human and machine activity.
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflowDomains.map(([title, copy]) => (
              <article key={title} className="operational-card p-5">
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
