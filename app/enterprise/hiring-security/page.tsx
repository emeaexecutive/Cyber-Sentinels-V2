import Link from "next/link";

export const dynamic = "force-dynamic";

const hiringProblems = [
  ["Synthetic applicant risk", "Candidate evidence, profile context and reviewer notes can become inconsistent as the process advances."],
  ["Proxy interviews", "The person present in a session may not match the verified candidate context or expected workflow history."],
  ["Session manipulation", "Generated answers, coached presence or altered media can create review signals that need careful human evaluation."],
  ["Decision defensibility", "People, security and legal teams need one shared record of what was reviewed before a hiring outcome moves forward."],
];

const outcomes = [
  "Keep identity, interview context, review notes and receipts connected.",
  "Escalate unresolved risk without making unsupported detection claims.",
  "Give reviewers a replayable case history when hiring confidence changes.",
  "Preserve a clearer audit trail for security, legal and talent stakeholders.",
];

export default function HiringSecurityPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Hiring Security
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            Trusted hiring review when candidate confidence changes.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-300">
            Cyber Sentinels helps teams review synthetic applicant risk, proxy interviews, session anomalies and unresolved evidence without replacing human hiring judgment.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/demo/hiring-attack" className="brand-primary-action brand-action-large text-sm">
              View Demo
            </Link>
            <Link href="/enterprise-access" className="brand-secondary-action brand-action-large text-sm">
              Request Enterprise Access
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-2">
          {hiringProblems.map(([title, body]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Buyer outcomes
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {outcomes.map((outcome) => (
              <div key={outcome} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300">
                {outcome}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Need the underlying model?</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Platform explains Runtime Trust and Governance. Trust Center explains Replay and evidence boundaries.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/platform" className="brand-secondary-action">Platform</Link>
            <Link href="/trust" className="brand-secondary-action">Trust Center</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
