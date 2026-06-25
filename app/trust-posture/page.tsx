import Link from "next/link";

const postureSignals = [
  ["Current trust state", "A plain-language view of whether a workflow is verified, elevated risk or awaiting review."],
  ["Last evidence event", "The latest meaningful verification, session or governance event behind the current state."],
  ["Risk level", "A review-focused risk label, not a public score or automated trust promise."],
  ["Reviewer action", "Human decisions and pending actions remain visible in operational views."],
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
            Continuous trust status for operational workflows.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            Trust posture shows how identity verification, session integrity, evidence changes and governance review combine into a current operational state. The public view explains the model; live posture data stays protected.
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
