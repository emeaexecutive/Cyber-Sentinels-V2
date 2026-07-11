import Link from "next/link";
import { TrustOpsOperatingStack } from "@/components/trustops-operating-stack";

const canonicalConcepts = [
  ["Trust Memory", "The durable platform memory that connects actors, evidence, authority, review and outcomes across workflow history."],
  ["Runtime Trust", "The current execution state for a human, agent, machine identity or workflow as evidence and authority change."],
  ["Governance", "The accountable review path for escalation, intervention, approval, blocking and recorded rationale."],
  ["Persistent Trust Posture", "The explainable current condition produced by evidence freshness, authorization state and governance outcomes."],
];

const engines = [
  ["Trust Engine", "Evaluates identity, authority, evidence and confidence boundaries."],
  ["Runtime Engine", "Observes execution state, permission scope and provider availability."],
  ["Replay Engine", "Preserves the chronology as operational memory."],
  ["Governance Engine", "Routes accountable review, escalation and intervention."],
  ["Validation Engine", "Keeps benchmark, reviewed-sample and calibration evidence explicit."],
];

const executionContract = [
  ["Enter", "Record the actor, workflow purpose and accountable owner."],
  ["Authorize", "Confirm scope and preserve grants, changes and revocations."],
  ["Execute", "Attach runtime context and evidence as work advances."],
  ["Govern", "Escalate material trust changes to named reviewers."],
  ["Remember", "Close with a replayable outcome retained under policy."],
];

export default function PlatformPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Platform</p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            The architecture home for Cyber Sentinels trust infrastructure.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Platform owns the core architecture: Trust Memory, Runtime Trust, Governance, Persistent Trust Posture and the five-engine execution model.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Solution pages describe business problems. Trust Center explains replay, provider boundaries and public trust principles. Platform explains how the system is organized.
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-2">
          {canonicalConcepts.map(([title, copy]) => (
            <article key={title} className="operational-card p-5">
              <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 operational-panel p-6">
          <p className="operational-eyebrow">Governed execution contract</p>
          <h2 className="mt-3 text-2xl font-semibold">
            Continuity from actor entry to retained outcome.
          </h2>
          <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-5">
            {executionContract.map(([title, copy], index) => (
              <article key={title} className="min-w-0 bg-black p-4">
                <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 operational-panel p-6">
          <p className="operational-eyebrow">Five engines</p>
          <h2 className="mt-3 text-2xl font-semibold">One product model for trust execution.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {engines.map(([title, copy], index) => (
              <article key={title} className="operational-card p-4">
                <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">TrustOps operating stack</p>
          <h2 className="mt-3 text-2xl font-semibold">The canonical platform layer model.</h2>
          <div className="mt-6">
            <TrustOpsOperatingStack />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/trust" className="brand-secondary-action">Trust Center</Link>
            <Link href="/developers" className="brand-secondary-action">Developers</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
