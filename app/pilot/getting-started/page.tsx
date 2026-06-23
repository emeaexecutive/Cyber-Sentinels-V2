import Link from "next/link";

const onboardingSteps = [
  ["1", "Confirm the pilot scope", "Choose the hiring, session integrity or governance workflow that will be shown first. Keep data sample-only unless a customer workspace has been approved."],
  ["2", "Open the guided demo", "Use `/demo`, `/demo/hiring-attack` and `/demo/session-integrity` to explain the operational narrative before showing live records."],
  ["3", "Create the first workspace", "Use Pilot Setup to create an isolated workspace, first trust case, governance action and replay path."],
  ["4", "Review evidence and flags", "Attach candidate, recruiter or session evidence. Keep liveness, deepfake risk and injection risk as separate signals."],
  ["5", "Complete governance review", "Record human review, escalation, evidence requests or resolution notes before presenting an outcome."],
  ["6", "Export the receipt", "Open the verification receipt, confirm replay links and use Print / Save PDF for the pilot artifact."],
];

const faq = [
  ["What does Cyber Sentinels protect?", "Sensitive workflows where identity, evidence, session integrity and governance decisions must remain explainable after the fact."],
  ["Is this a hiring decision engine?", "No. It supports human review with evidence, flags, replay and receipts. It does not approve or reject candidates."],
  ["What happens when a session flag appears?", "The flag becomes reviewable context. A reviewer can request more evidence, escalate, pause the workflow or record a decision."],
  ["What should support collect?", "Workspace, subject, receipt or replay link, what the operator expected, what happened, and whether a governance action is pending."],
];

const supportFlow = [
  "Confirm the route, workspace and subject involved.",
  "Capture the receipt or replay link if available.",
  "Check whether governance review is pending or resolved.",
  "Route pilot issues through the agreed support contact or enterprise-access request.",
];

export default function PilotGettingStartedPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Pilot Getting Started</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Run the first enterprise walkthrough with evidence, governance and replay in view.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            This guide keeps pilot onboarding focused on operational trust: what happened, what evidence exists, which signals changed, who reviewed it and how the workflow can be replayed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pilot/welcome" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400">
              Pilot welcome
            </Link>
            <Link href="/demo" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:border-cyan-400">
              Demo flow
            </Link>
            <Link href="/admin/pilot-overview" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400">
              Admin overview
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {onboardingSteps.map(([number, title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs text-cyan-200">{number}</p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Pilot FAQ</p>
            <div className="mt-5 grid gap-3">
              {faq.map(([question, answer]) => (
                <article key={question} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <h2 className="font-semibold text-zinc-100">{question}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{answer}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-black p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Support contact flow</p>
            <h2 className="mt-3 text-2xl font-semibold">Keep support tied to evidence.</h2>
            <div className="mt-5 grid gap-3">
              {supportFlow.map((item) => (
                <p key={item} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-300">
                  {item}
                </p>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/help" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400">
                Help centre
              </Link>
              <Link href="/enterprise-access" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100">
                Contact support
              </Link>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}