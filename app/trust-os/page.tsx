import Link from "next/link";

export default function TrustOsPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Operational Trust
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            One evidence-backed path through operational trust workflows.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels connects verification, Evidence Chain, Governance
            Review, Replay Timeline and explainable Trust Posture.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-6">
          <h2 className="text-2xl font-semibold">A clear operational boundary.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            The route is retained for compatibility. The active product language
            is Operational Trust: provider evidence, Session Integrity, named
            reviewer decisions, Authorization Lineage and replayable outcomes.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/why-now"
              className="rounded-lg border border-cyan-800 px-4 py-3 text-sm text-cyan-100 hover:text-white"
            >
              Why Now
            </Link>
            <Link
              href="/timeline"
              className="rounded-lg border border-cyan-800 px-4 py-3 text-sm text-cyan-100 hover:text-white"
            >
              Replay Timeline
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
