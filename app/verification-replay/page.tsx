import Link from "next/link";

const replayFlow = [
  ["01", "Actor", "The human, AI agent, service account or API actor is recorded with accountable ownership."],
  ["02", "Workflow", "The operation, purpose and runtime context remain attached to the chronology."],
  ["03", "Evidence", "Provider, workflow and integrity evidence remains connected to its source."],
  ["04", "Authorization", "Delegated scope, grants, changes and revocations retain their lineage."],
  ["05", "Governance", "Named review, intervention and approval actions remain attributable."],
  ["06", "Trust change", "Every posture transition stays connected to evidence and review rationale."],
  ["07", "Outcome", "The governed result and receipt close the chronology without claiming certainty."],
];

const buyerQuestions = [
  ["Who acted?", "Human, agent and service-account activity remains connected to accountable ownership and authority."],
  ["What changed?", "A time-ordered record shows the workflow event and resulting trust-state transition."],
  ["Why did trust change?", "Each posture transition retains the signal, evidence or governance rationale that caused it."],
  ["What evidence existed?", "Provider and workflow evidence remains linked to source, time and operational context."],
  ["What governance occurred?", "Reviewers, approvals and interventions remain attributable through authorization lineage."],
  ["What outcome resulted?", "The governed decision, unresolved conditions and receipt close the record."],
];

const memoryProperties = [
  ["Durable", "The chronology remains reviewable after a runtime session or provider interaction ends."],
  ["Enterprise-owned", "Retention, access and permitted use remain governed by customer policy."],
  ["Authorization-aware", "Every material action retains the authority and accountable ownership under which it occurred."],
  ["Outcome-complete", "Resolved conditions, unresolved flags and the governed result remain attached to the record."],
];

const scaleControls = [
  ["Bounded reads", "Operational views load deterministic windows while preserving continuation state for deeper history."],
  ["Stable chronology", "Timestamp and record identity provide repeatable ordering when events arrive together or out of order."],
  ["Policy retention", "Retention duration, access and export remain controlled by enterprise policy and regulatory need."],
  ["Provider continuity", "Normalized evidence references preserve the accountability chain when providers or orchestration paths change."],
];

export default function VerificationReplayPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-cyan-950 bg-[linear-gradient(145deg,rgba(8,47,73,0.18),rgba(9,9,11,0.96)_45%)] p-6 shadow-2xl shadow-black/30 md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Replayable enterprise memory
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Replay is the memory and accountability layer for enterprise operations.
          </h1>
          <p className="mt-4 text-sm font-semibold text-cyan-100">
            Mission-critical continuity for enterprise trust operations.
          </p>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            Replay reconstructs identity checks, session integrity, authorization
            history, evidence and governance actions as a reviewable trust
            chronology. It preserves workflow verification continuity after the
            runtime session ends. Case records remain protected operational data.
          </p>
          <p className="mt-5 max-w-3xl border-l border-cyan-700 pl-4 text-base leading-7 text-zinc-200">
            The memory layer of the TrustOps operating system: replayable
            evidence for critical workflows and durable context for enterprise trust.
          </p>
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            Canonical chronology
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            From accountable actor to retained outcome.
          </h2>
          <div className="mt-6 grid overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-7">
            {replayFlow.map(([step, title, copy], index) => (
              <article
                key={title}
                className={`min-w-0 bg-black p-5 ${index === replayFlow.length - 1 ? "ring-1 ring-inset ring-cyan-900" : ""}`}
              >
                <p className="font-mono text-xs text-cyan-300">{step}</p>
                <h2 className="mt-3 text-lg font-semibold text-zinc-100">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            Enterprise memory properties
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            Built to preserve continuity, not just activity.
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {memoryProperties.map(([title, copy]) => (
              <article key={title} className="min-w-0 rounded-lg border border-zinc-800 bg-black p-4">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            Resilient by design
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            Long-lived memory without an unbounded operational view.
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {scaleControls.map(([title, copy]) => (
              <article key={title} className="min-w-0 rounded-lg border border-zinc-800 bg-black p-4">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            Buyer value
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            One replay answers six operational questions.
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {buyerQuestions.map(([question, answer]) => (
              <article key={question} className="min-w-0 rounded-lg border border-zinc-800 bg-black p-4">
                <h3 className="text-sm font-semibold text-zinc-100">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Durable enterprise memory, protected evidence</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Public visitors can understand the replay model here. Case-level
            timelines, subjects and reviewer notes require sign-in because they
            contain operational trust data. Retention follows enterprise policy;
            Replay is not a provider-owned activity log.
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
