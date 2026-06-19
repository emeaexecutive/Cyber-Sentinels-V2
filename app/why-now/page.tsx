import Link from "next/link";

const sections = [
  [
    "AI agents now act inside workflows",
    "AI systems can screen candidates, handle data and recommend actions. Teams need to know which identity acted and what it was allowed to do.",
  ],
  [
    "Synthetic identities are easier to create",
    "Fake candidates, impersonation attempts and generated credentials can reach enterprise teams before traditional checks expose them.",
  ],
  [
    "Reviews are fragmented",
    "Identity checks, evidence and approvals often sit in different tools. That makes urgent reviews slower and later audits harder to defend.",
  ],
  [
    "Regulated teams need a decision record",
    "Security, legal and operations teams need clear risk flags, named human reviews and an audit trail showing how each outcome was reached.",
  ],
];

export default function WhyNowPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Why Now
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            AI-native systems create a new trust problem.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels is built around a simple premise: as operations
            become more AI-assisted, trust must become infrastructure.
          </p>
        </section>

        <div className="mt-8 grid gap-4">
          {sections.map(([title, copy]) => (
            <article
              key={title}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{copy}</p>
            </article>
          ))}
        </div>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Why trust infrastructure matters</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels brings identity verification, risk flags, human
            review and audit trails into one operational workflow before a
            person or AI agent reaches a critical system.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/enterprise-access"
              className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
            >
              Request Enterprise Access
            </Link>
            <Link
              href="/journal"
              className="rounded-lg border border-cyan-800 px-4 py-3 text-sm text-cyan-100 hover:text-white"
            >
              Read Founder Journal
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
