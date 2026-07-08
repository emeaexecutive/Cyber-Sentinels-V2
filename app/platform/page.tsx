import { TrustOpsOperatingStack } from "@/components/trustops-operating-stack";

const operatingModel = [
  ["Memory", "Replay preserves who acted, what changed, which evidence existed, what governance occurred and which outcome followed as durable enterprise memory."],
  ["State", "Persistent Trust Posture shows the current explainable condition across actors, workflows, approvals and runtime sessions."],
  ["Control", "Governed execution keeps authorization, evidence and accountable human intervention connected to consequential work."],
  ["Sovereignty", "Enterprise policy controls customer-owned memory, restricted data, provider orchestration and workflow IP."],
];

const executionContract = [
  ["Enter", "Record the human, AI agent or non-human identity, workflow purpose and accountable owner."],
  ["Authorize", "Confirm active scope and preserve the lineage behind grants, changes and revocations."],
  ["Execute", "Keep runtime context and evidence attached as the workflow advances."],
  ["Govern", "Escalate material trust changes to named reviewers with rationale and recorded action."],
  ["Remember", "Close the workflow with a replayable outcome that remains part of enterprise memory."],
];

const postureLifecycle = [
  ["Evolve", "New evidence or context produces an attributable trust-state transition."],
  ["Decay", "Evidence freshness checkpoints increase review priority instead of implying permanent trust."],
  ["Escalate", "Risk, authority or policy changes interrupt ordinary reliance and route accountable review."],
  ["Recover", "Recorded intervention and sufficient new evidence restore a current posture."],
  ["Re-verify", "Material workflow changes reopen verification before consequential execution continues."],
];

const workflowVerificationQuestions = [
  "Who acted?",
  "What changed?",
  "Why did trust change?",
  "What evidence existed?",
  "What governance occurred?",
  "What outcome resulted?",
];

export default function PlatformPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">TrustOps platform</p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            The trust operating system for governed enterprise workflows.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels connects humans, AI agents, machine identities and
            regulated workflows through replayable enterprise memory, persistent
            posture, governed execution and enterprise AI sovereignty.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            Persistent Trust Posture explains what is true now. Replay preserves
            the durable enterprise record of how it became true.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels adds a governed trust record without replacing
            accountable human authority, workflow systems of record or existing
            security controls.
          </p>
        </section>

        <section className="mt-8 operational-panel p-6">
          <p className="operational-eyebrow">Governed execution contract</p>
          <h2 className="mt-3 text-2xl font-semibold">
            Continuity from actor entry to durable outcome.
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
          <p className="operational-eyebrow">Governed enterprise intelligence</p>
          <h2 className="mt-3 text-2xl font-semibold">
            Reviewable operational context for consequential decisions.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Governed intelligence is not an autonomous decision-maker. It is the
            evidence-backed context that lets accountable teams verify a workflow,
            understand trust-state transitions and govern human or AI-assisted execution.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {workflowVerificationQuestions.map((question, index) => (
              <div key={question} className="operational-card flex min-w-0 items-center gap-3 p-4">
                <span className="font-mono text-xs text-cyan-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-sm font-medium text-zinc-200">{question}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">One operating model</p>
          <h2 className="mt-3 text-2xl font-semibold">
            Memory, state, control and enterprise ownership.
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {operatingModel.map(([title, copy]) => (
              <article key={title} className="operational-card p-4">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-500">
            TrustOps means reviewable operational context, not automated
            judgment. Evidence, authority, trust changes
            and outcomes remain available to accountable decision-makers.
          </p>
        </section>

        <section className="mt-8 operational-panel p-6">
          <p className="operational-eyebrow">Persistent Trust Posture</p>
          <h2 className="mt-3 text-2xl font-semibold">
            Trust remains current only while evidence and authority remain current.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            The same lifecycle applies to humans, AI agents, non-human identities,
            workflows, approvals and runtime sessions. Posture is explainable
            operational context, never a permanent identity verdict.
          </p>
          <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-5">
            {postureLifecycle.map(([title, copy]) => (
              <article key={title} className="min-w-0 bg-black p-4">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">Eight connected layers</p>
          <h2 className="mt-3 text-2xl font-semibold">The TrustOps operating stack.</h2>
          <div className="mt-6">
            <TrustOpsOperatingStack />
          </div>
        </section>
      </div>
    </main>
  );
}
