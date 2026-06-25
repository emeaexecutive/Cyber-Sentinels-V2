import Link from "next/link";

const replayFlow = [
  ["Verification started", "The workflow records when identity review began."],
  ["Evidence ordered", "Session, human presence and risk events are placed in chronology."],
  ["Governance action linked", "Reviewer decisions are tied back to the evidence that triggered review."],
  ["Replay available", "A protected replay can reconstruct what happened without exposing data publicly."],
];

export default function VerificationReplayPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Verification Replay
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Replayable evidence for sensitive verification workflows.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            Verification Replay explains how Cyber Sentinels reconstructs identity, session integrity, injection risk and governance events into a reviewable chronology. Actual replay records remain protected operational data.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {replayFlow.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Protected by design</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Public visitors can understand the replay model here. Case-level replay timelines, subjects and reviewer notes require sign-in because they contain operational trust data.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/demo/hiring-attack" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100">
              View demo flow
            </Link>
            <Link href="/trust-replay" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
              Open protected replay
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
