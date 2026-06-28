import Link from "next/link";

const reviewSteps = [
  ["Evidence chain opened", "Identity, provider, session and workflow evidence remain linked to the review."],
  ["Reviewer assigned", "A named human reviewer receives the escalation reason, current trust state and authorization context."],
  ["Transition recorded", "Reviewer action, rationale and resulting trust-state change enter the replay chronology."],
  ["Continuity preserved", "The final outcome remains connected across replay, evidence and the verification receipt."],
];

export default function GovernancePage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">
            Governance
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Human review for high-risk verification decisions.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels keeps sensitive workflow decisions reviewable. Governance connects evidence chains,
            escalation ownership, reviewer attribution and trust-state transitions before an outcome is treated as operationally ready.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/demo" className="brand-primary-action brand-action-large text-sm">
              View Demo
            </Link>
            <Link href="/enterprise-access" className="brand-secondary-action brand-action-large text-sm">
              Request Enterprise Access
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {reviewSteps.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Public overview, protected operations</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            This page explains the governance model without exposing customer data. Operational queues, reviewer assignments and evidence records remain inside authenticated dashboard workflows.
          </p>
          <Link href="/dashboard/governance" className="mt-5 inline-flex rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
            Open protected governance queue
          </Link>
        </section>
      </div>
    </main>
  );
}
