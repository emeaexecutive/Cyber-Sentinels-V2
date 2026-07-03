import Link from "next/link";

const replayFlow = [
  ["01", "What entered", "The person, agent or workflow is recorded with its operating context."],
  ["02", "What changed", "Identity, session, authorization and runtime posture changes are ordered in time."],
  ["03", "Evidence available", "Provider, workflow and integrity evidence remains attached to its source."],
  ["04", "Who or what approved", "Delegated authority and named governance actions remain attributable."],
  ["05", "Why trust shifted", "Every posture transition stays connected to evidence and review rationale."],
  ["06", "Final outcome", "The governed outcome and receipt close the chronology without claiming certainty."],
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
            The operational memory of every critical workflow.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            Replay reconstructs identity checks, session integrity, authorization
            history, evidence and governance actions as a reviewable trust
            chronology. It preserves workflow verification continuity after the
            runtime session ends. Case records remain protected operational data.
          </p>
          <p className="mt-5 max-w-3xl border-l border-cyan-800 pl-4 text-base leading-7 text-zinc-200">
            Replayable evidence for critical workflows. Operational memory for
            enterprise trust.
          </p>
        </section>

        <section className="mt-8 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 md:grid-cols-2 lg:grid-cols-3">
          {replayFlow.map(([step, title, copy]) => (
            <article key={title} className="min-w-0 bg-black p-5">
              <p className="font-mono text-xs text-cyan-300">{step}</p>
              <h2 className="mt-3 text-lg font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Essential operational memory, protected evidence</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Public visitors can understand the replay model here. Case-level replay timelines, subjects and reviewer notes require sign-in because they contain operational trust data.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/replay/demo?scenario=proxy-candidate-interview" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100">
              Experience Replay
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
