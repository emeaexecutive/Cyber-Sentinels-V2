import Link from "next/link";

const postureSignals = [
  ["Current trust state", "A plain-language view of whether a human, agent or workflow is verified, elevated risk or awaiting review."],
  ["Identity continuity", "Verification freshness and context remain visible as a subject moves through enterprise workflows."],
  ["Authorization continuity", "Permission changes and revocations remain connected to the authority and evidence behind them."],
  ["Governance continuity", "Human decisions, interventions and pending actions remain visible over time."],
  ["Runtime risk visibility", "Anomalies, evidence gaps and context shifts remain visible while an agent or workflow is executing."],
  ["Replay continuity", "Prior posture, authorization and governance changes remain available as operational memory."],
];

const postureLifecycle = [
  ["Evolve", "New identity, session, authorization and workflow evidence changes the current posture."],
  ["Decay", "Evidence freshness ages into a visible review checkpoint rather than silently remaining current."],
  ["Escalate", "Risk shifts and unresolved governance actions interrupt ordinary reliance."],
  ["Recover", "New evidence or an accountable governance resolution can restore a current posture."],
  ["Re-verify", "Missing or expired evidence returns the actor or workflow to verification."],
];

export default function PublicTrustPosturePage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Trust Posture
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Trust is a posture that evolves over time.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            Trust posture connects continuous identity, agent activity, authorization
            changes, workflow evidence and governance review into a current operational
            state. Layered trust assurance continuously evaluates what changed
            without presenting probabilistic signals as certainty. The public
            view explains the model; live posture data stays protected.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {postureSignals.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Trust over time</p>
          <h2 className="mt-3 text-2xl font-semibold">Posture evolves; Replay explains every transition.</h2>
          <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-5">
            {postureLifecycle.map(([title, copy]) => (
              <article key={title} className="min-w-0 bg-black p-4">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">From public narrative to protected operations</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Teams can evaluate the trust posture concept here, then sign in to review active flags, session integrity checks, governance actions and receipts inside the dashboard.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard/trust-posture" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
              Open protected posture
            </Link>
            <Link href="/demo/session-integrity" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:text-white">
              View session demo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
