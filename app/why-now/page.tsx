import Link from "next/link";

const sections = [
  [
    "From software to operational actors",
    "Software is no longer only a passive tool. AI copilots, machine-driven workflows and agentic systems are beginning to participate in operational decisions.",
  ],
  [
    "The rise of AI agents",
    "As AI systems gain permissions, context and workflow responsibility, organizations need clearer ways to understand what acted, what evidence was used and where human oversight remains necessary.",
  ],
  [
    "Operational trust gaps",
    "Identity, evidence, approval and accountability can fragment across tools. Without a trust layer, teams may struggle to explain why a decision happened.",
  ],
  [
    "Provenance problems",
    "Synthetic media, copied credentials and weak source records make provenance a core operational concern rather than a niche security issue.",
  ],
  [
    "Accountability challenges",
    "AI-assisted workflows can make responsibility harder to trace. Trust infrastructure should preserve a clear record of evidence, review and decision history.",
  ],
  [
    "Governance requirements",
    "Human oversight, auditability and explainable workflows become foundational as organizations adopt AI-native operations.",
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
            Identity, permissions, auditability, provenance, explainability and
            human oversight are becoming infrastructure layers for AI-native
            operations. Cyber Sentinels is an early platform direction for that
            shift.
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
