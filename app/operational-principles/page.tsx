import Link from "next/link";

const principles = [
  [
    "Evidence-first verification",
    "Trust workflows should be grounded in reviewable evidence rather than unsupported assertions or opaque signals.",
  ],
  [
    "Human governance",
    "Sensitive trust outcomes should preserve escalation, review and accountable decision-making.",
  ],
  [
    "Explainability",
    "Users and operators should be able to understand what is complete, what is missing and why a review state changed.",
  ],
  [
    "Auditability",
    "Important actions should leave a traceable record across evidence, review, decisions, trust events and operational history.",
  ],
  [
    "Privacy-aware trust workflows",
    "Evidence handling and verification workflows should minimize unnecessary exposure while preserving accountability.",
  ],
  [
    "Operational accountability",
    "Trust infrastructure should help teams understand ownership, responsibility and review paths as systems become more autonomous.",
  ],
];

export default function OperationalPrinciplesPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Operational Principles
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Built around accountable trust workflows.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels is designed to feel early but intentional:
            evidence-backed, governed, explainable and careful about operational
            trust.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {principles.map(([title, copy]) => (
            <article
              key={title}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">
            Human oversight remains central.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels does not rely solely on autonomous AI decisions for
            high-risk trust outcomes. Escalation, review, accountability and
            operational governance remain part of the platform posture.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/why-now"
              className="rounded-lg border border-cyan-800 px-4 py-3 text-sm text-cyan-100 hover:text-white"
            >
              Why Now
            </Link>
            <Link
              href="/enterprise-access"
              className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
            >
              Request Enterprise Access
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
