import Link from "next/link";

const shifts = [
  ["From cybersecurity to operational trust", "Security protects infrastructure from compromise. Operational trust explains identity, session context, evidence, authority and accountable review."],
  ["From identity to context", "Knowing who entered a workflow is the beginning. Enterprises must also understand session integrity, authority and change over time."],
  ["From detection to governance", "A flag is not a verdict. It needs evidence, review ownership, escalation and a recorded human outcome."],
  ["From logs to operational memory", "Auditability means reconstructing the sequence, not searching disconnected systems after trust has already failed."],
  ["From verification to replayable evidence", "Verification matters, but enterprise teams also need chronology, reviewer action and a receipt that explains what proof remains."],
];

export default function FutureOfTrustPage() {
  return (
    <main className="min-h-screen bg-[#05070b] text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14 md:px-8 md:pb-28 md:pt-20">
        <nav className="text-sm text-zinc-400"><Link href="/" className="hover:text-white">Cyber Sentinels</Link> / Future of Trust</nav>
        <div className="mt-16 max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">A founder narrative for operational trust</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Trust changed quietly.
          </h1>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-zinc-300">
            AI changed identity risk. Verification alone no longer explains
            whether a sensitive workflow remained trustworthy after entry.
            Trust must become operational infrastructure.
          </p>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-8 md:py-24">
          <p className="max-w-5xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-5xl">
            The question is no longer only whether someone passed a check. It is
            what happened next, what evidence remained, who reviewed the case
            and whether the outcome can be replayed.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:px-8 md:py-24">
        <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {shifts.map(([title, copy], index) => (
            <article key={title} className="border-t border-zinc-700 pt-5">
              <p className="text-xs font-semibold text-cyan-200">0{index + 1}</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
              <p className="mt-3 max-w-xl text-base leading-8 text-zinc-300">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/65">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:px-8 md:py-24 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Where it becomes real</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.025em] text-white">Hiring is the first visible fault line.</h2>
          </div>
          <div className="space-y-5 text-base leading-8 text-zinc-300">
            <p>
              A candidate can be genuine while an interview channel is compromised.
              Credentials can be real while evidence is incomplete. A synthetic
              applicant can appear credible inside a process designed for another era.
            </p>
            <p>
              The responsible answer is not automated suspicion. It is a reviewable
              chain: identity evidence, session integrity, flags, human
              governance, a verification receipt and the ability to replay what happened.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:px-8 md:py-24">
        <div className="max-w-4xl border-l-2 border-cyan-300 pl-6 md:pl-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Our position</p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.025em] text-white md:text-5xl">
            Verified identity is not the same as trusted workflow state.
          </h2>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            Cyber Sentinels combines upstream verification with Verification
            Evidence, Session Integrity, Governance Review, Replay Evidence and
            Verification Receipts. AI can assist the review. Human authority
            remains visible.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/demo" className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950">View Demo</Link>
          <Link href="/enterprise-access" className="rounded-md border border-zinc-600 px-5 py-3 text-sm font-semibold text-white">Request Enterprise Access</Link>
          <Link href="/enterprise-access?intent=design_partner" className="rounded-md border border-zinc-600 px-5 py-3 text-sm font-semibold text-white">Become a Design Partner</Link>
          <Link href="/enterprise-access?intent=intro_call" className="rounded-md border border-zinc-600 px-5 py-3 text-sm font-semibold text-white">Book Intro Call</Link>
        </div>
      </section>
    </main>
  );
}
