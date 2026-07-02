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
  ["Trust Posture", "An explainable Operational Trust state across identity, Session Integrity, evidence and Governance Review."],
  ["Evidence Chain", "Provider, session, workflow and reviewer evidence retained with its source and chronology."],
  ["Governance Review", "Named review ownership, escalation rationale and human authority for sensitive decisions."],
  ["Replay Timeline", "What changed, when it changed, who reviewed it and which evidence supported the final state."],
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
            When evidence or session context changes, Governance Review controls
            the next action and Replay Timeline preserves why.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3">
          <Link href="/demo" className="brand-primary-action brand-action-large text-sm">
            View Demo
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
            Evidence, governance and replay in one operational path.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Preserve evidence, replay what changed, assign review ownership and issue a verification receipt before sensitive decisions move forward.
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

    </main>
  );
}
