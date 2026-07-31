import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology | Cyber Sentinels",
  description: "How Cyber Sentinels collects, normalizes and evaluates operational trust evidence.",
  alternates: { canonical: "/methodology" },
};

const stages = [
  ["1", "Collect", "Retain the consented workflow, identity, session and provider evidence available at that time."],
  ["2", "Normalize", "Separate provider-backed, rule-based, simulated and unavailable signals."],
  ["3", "Evaluate", "Apply explainable rules and policy thresholds without treating a score as certainty."],
  ["4", "Govern", "Assign accountable human review for escalated or high-assurance workflows."],
  ["5", "Replay", "Preserve chronology, authorization lineage, evidence references and final workflow state."],
];

const postureLifecycle = [
  ["Evolve", "New evidence or context produces an explainable transition."],
  ["Decay", "Evidence freshness or authority reaches a review checkpoint."],
  ["Escalate", "Risk or policy routes the workflow to accountable governance."],
  ["Recover", "Review or stronger evidence resolves the active condition."],
  ["Re-verify", "Expired or changed evidence is refreshed before reliance continues."],
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Methodology</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            How workflow Trust Posture is constructed and reviewed.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            The methodology is evidence-first, provider-aware and governance-led.
            It does not establish biometric certainty or guarantee fraud detection.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            The same posture model applies to humans, AI agents, non-human
            identities, workflows, approvals and runtime sessions.
          </p>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-5">
          {stages.map(([number, title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-sm font-semibold text-cyan-200">{number}</p>
              <h2 className="mt-3 text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Persistent posture lifecycle
          </p>
          <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-5">
            {postureLifecycle.map(([state, explanation]) => (
              <article key={state} className="min-w-0 bg-black p-4">
                <h2 className="font-semibold text-zinc-100">{state}</h2>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{explanation}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Validation boundary</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-300">
            Accuracy, false-positive, false-negative and adversarial-robustness
            claims require representative benchmark data. Until then, provider
            outputs and rule-based indicators remain evidence for human review.
          </p>
          <Link href="/verification-replay" className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-white">
            Review Replay Timeline
          </Link>
        </section>
      </div>
    </main>
  );
}
