import Link from "next/link";

const replayPath = [
  "Actor enters the workflow",
  "Identity and authority are checked",
  "Evidence and trust state evolve",
  "Governance reviews exceptions",
  "Replay explains the outcome",
];

const buyerOutcomes = [
  [
    "Know who and what is acting",
    "Verify human identity, register AI agents and preserve the authority behind every action.",
  ],
  [
    "See trust change over time",
    "Keep identity, session integrity, evidence and authorization connected throughout the workflow.",
  ],
  [
    "Review and explain outcomes",
    "Give governance teams a replayable chronology of what changed, who intervened and why the outcome followed.",
  ],
];

const governedActors = [
  [
    "Humans",
    "Identity and session evidence remain connected to the work being performed.",
  ],
  [
    "AI agents",
    "Ownership, purpose, permissions and revocation stay visible and reviewable.",
  ],
  [
    "Enterprise workflows",
    "Evidence, governance and outcomes remain connected from entry to completion.",
  ],
];

export default function Home() {
  return (
    <main className="operational-shell min-h-screen text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pt-16 md:px-8 md:pb-24 md:pt-24">
        <div className="max-w-5xl">
          <p className="operational-eyebrow">Cyber Sentinels</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.06] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Trust infrastructure for intelligent enterprises.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200 sm:text-xl sm:leading-9">
            Understand identity, authenticity and trust across humans, AI
            agents and enterprise workflows.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
            Cyber Sentinels connects verification, authorization, evidence and
            governance so enterprises can see what changed and act with
            accountable context.
          </p>
        </div>

        <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Link
            href="/enterprise-access"
            className="brand-primary-action brand-action-large text-center text-sm"
          >
            Request Enterprise Access
          </Link>
          <Link
            href="/verification-replay"
            className="brand-secondary-action brand-action-large text-center text-sm"
          >
            Explore Verification Replay
          </Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8 md:py-16">
          <div className="max-w-3xl">
            <p className="operational-eyebrow">What Cyber Sentinels does</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
              Keep trust connected to the workflow.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              Built for enterprises governing consequential work across people,
              AI agents and the systems they use together.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {buyerOutcomes.map(([title, copy]) => (
              <article key={title} className="operational-card p-5">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <div className="max-w-3xl">
          <p className="operational-eyebrow">Verification replay</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
            One chronology. Every material trust change.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Replay preserves the evidence, authorization changes, trust-state
            evolution and governance actions behind an outcome. It turns
            workflow history into reviewable operational memory.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {replayPath.map((step, index) => (
            <article key={step} className="border-t border-zinc-700 pt-4">
              <p className="text-xs font-semibold text-cyan-200">
                0{index + 1}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-zinc-100">
                {step}
              </p>
            </article>
          ))}
        </div>
        <Link
          href="/verification-replay"
          className="mt-8 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100"
        >
          See how verification replay works →
        </Link>
      </section>

      <section className="border-t border-zinc-800 bg-zinc-950/60">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
          <p className="operational-eyebrow">Continuous trust</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight text-white md:text-4xl">
            Trust is not a moment. It is a continuous operational state.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            A single check cannot explain a changing workflow. Cyber Sentinels
            keeps identity, authority, evidence and governance connected as
            human and machine activity unfolds.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {governedActors.map(([title, copy]) => (
              <article key={title} className="operational-card p-5">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
