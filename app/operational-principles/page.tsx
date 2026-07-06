import Link from "next/link";

const principles = [
  [
    "Operational continuity",
    "Identity, runtime context, authority, evidence, governance and outcomes should remain connected as work changes over time.",
  ],
  [
    "Evidence-first execution",
    "Consequential workflows should advance through reviewable evidence rather than unsupported assertions or opaque signals.",
  ],
  [
    "Authorization continuity",
    "Grants, delegated scope, changes and revocations should retain accountable lineage throughout the workflow.",
  ],
  [
    "Governed intervention",
    "Material trust-state changes should preserve named ownership, escalation, review rationale and accountable decisions.",
  ],
  [
    "Replayable accountability",
    "Actors, evidence, authorization changes, governance actions and operational outcomes should remain reconstructable after runtime ends.",
  ],
  [
    "Enterprise control",
    "Operational memory, restricted data and provider use should remain governed by enterprise policy without unnecessary exposure.",
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
            Trust continuity is an operating discipline.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels keeps consequential human, AI-agent and workflow
            activity evidence-backed, governed, explainable and replayable from
            entry through operational outcome.
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
            Cyber Sentinels does not delegate high-risk trust outcomes to an
            opaque automated verdict. Escalation, review, evidence verification
            and accountable decision authority remain part of the operating
            model.
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
