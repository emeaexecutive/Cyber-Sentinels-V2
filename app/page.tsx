import Link from "next/link";

const homepageAnswers = [
  [
    "Who are we?",
    "Cyber Sentinels builds operational trust infrastructure for enterprises governing humans, AI agents, machine identities and regulated workflows.",
  ],
  [
    "What do we do?",
    "We keep actor identity, authority, evidence, runtime state, governance review and replayable outcomes connected as work changes.",
  ],
  [
    "Why now?",
    "AI agents, synthetic media, delegated automation and fragmented workflow tools have made one-time verification too thin for consequential operations.",
  ],
  [
    "Why trust us?",
    "The platform is evidence-backed, replayable, governance-aware and explicit about capability boundaries. It does not claim perfect identity certainty or autonomous truth detection.",
  ],
  [
    "Why different?",
    "Cyber Sentinels is the independent trust record across providers, workflows and reviewers, not another model, dashboard or disconnected point check.",
  ],
];

const deeperLinks = [
  ["Platform", "/platform", "Architecture, Trust Memory, Runtime Trust and Governance."],
  ["Solutions", "/solutions", "Business problems by workflow domain."],
  ["Trust Center", "/trust", "Replay, AI sovereignty, evidence and trust principles."],
  ["Enterprise", "/enterprise", "Enterprise readiness, pilot fit and buying questions."],
];

export default function Home() {
  return (
    <main className="operational-shell min-h-screen text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-14 md:px-8 md:pb-20 md:pt-24">
        <div className="max-w-5xl">
          <p className="operational-eyebrow">AI Trust Infrastructure</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.06] tracking-tight text-white sm:text-5xl md:text-6xl">
            The independent trust record for enterprise AI and regulated workflows.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200">
            Cyber Sentinels shows who or what acted, under whose authority, what changed, what evidence existed and why the outcome was allowed, reviewed or blocked.
          </p>
        </div>

        <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Link href="/enterprise-access" className="brand-primary-action brand-action-large text-center text-sm">
            Request Enterprise Access
          </Link>
          <Link href="/platform" className="brand-secondary-action brand-action-large text-center text-sm">
            Explore Platform
          </Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <p className="operational-eyebrow">The short answer</p>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {homepageAnswers.map(([title, copy]) => (
              <article key={title} className="operational-card p-5">
                <h2 className="text-base font-semibold text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:px-8 md:py-16">
        <div className="max-w-3xl">
          <p className="operational-eyebrow">Where to go next</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
            Every detail has a clear home.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            The homepage gives the enterprise story. Platform explains architecture. Trust Center owns replay and sovereignty. Solutions stay focused on business problems.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {deeperLinks.map(([title, href, copy]) => (
            <Link key={href} href={href} className="operational-card block p-5 hover:border-cyan-800">
              <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
