import Link from "next/link";

const principles = [
  ["01", "Trust must be explainable.", "Operators should understand what changed, why it changed and which evidence informed the outcome."],
  ["02", "Trust must be replayable.", "Important workflow events, evidence and reviewer actions should remain available in chronological order."],
  ["03", "Trust must evolve over time.", "Posture should reflect new evidence, session changes, authorization context and governance intervention."],
  ["04", "Trust decisions require evidence.", "Provider signals and risk flags are review inputs; sensitive outcomes require traceable supporting records."],
  ["05", "Governance must remain human-reviewable.", "Named reviewers, escalation reasons and decision rationale should remain visible before high-risk workflows advance."],
  ["06", "Verification is probabilistic, not absolute.", "Verification reduces uncertainty. It does not create perfect certainty about identity, media or intent."],
  ["07", "Operational trust should be auditable.", "Workflow outcomes should connect to evidence, authorization lineage, replay chronology and a portable receipt."],
];

export default function TrustPrinciplesPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-14 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="border-b border-zinc-800 pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Operational trust standards
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
            Principles for accountable workflow trust.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
            Cyber Sentinels treats trust as an evidence-backed operational state:
            explainable, replayable, governed and specific to the workflow where a decision is made.
          </p>
        </section>

        <section className="divide-y divide-zinc-800">
          {principles.map(([number, title, description]) => (
            <article key={number} className="grid gap-3 py-7 md:grid-cols-[72px_1fr]">
              <p className="text-sm font-semibold text-cyan-200">{number}</p>
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-300">{description}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 border-t border-zinc-800 pt-8">
          <h2 className="text-2xl font-semibold">Human authority remains central.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels does not create hidden monitoring, universal identity scores or automatic claims
            of authenticity. Access remains role-bound, evidence remains purpose-specific and high-risk
            workflow outcomes remain subject to accountable human review.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
              View workflow demo
            </Link>
            <Link href="/governance" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-400">
              Review governance model
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
