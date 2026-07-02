import Link from "next/link";

const trustControls = [
  ["Continuous Identity", "Human and machine identities retain verification freshness, context and accountable ownership after access begins."],
  ["AI Agent Governance", "Agent purpose, permission scope, policy state and execution history stay reviewable."],
  ["Enterprise Authorization", "Authorization grants, changes and revocations remain connected to their authority and rationale."],
  ["Persistent Trust Posture", "Identity, workflow, evidence and governance state evolve without becoming a hidden universal score."],
  ["Governance Continuity", "High-impact changes route to named reviewers with ownership, chronology and recorded action."],
  ["Replayable Evidence", "Canonical chronology reconstructs what happened before, during and after a workflow changed state."],
  ["Hiring Security", "The same platform controls apply to candidate, recruiter and interview integrity as one operational domain."],
];

const coordinationControls = [
  ["Trust Posture changes", "Identity, session, evidence and reviewer states remain visible as workflows evolve."],
  ["Governance escalation events", "High-risk workflow changes can move into human review with ownership."],
  ["Evidence Chain attached", "Verification Receipt, Replay Timeline and audit references stay connected to the workflow."],
  ["Workflow authenticity status", "Teams can see whether a workflow is verified, elevated risk or awaiting review."],
];

export default function EnterprisePage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">
            Enterprise operational trust
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Operational trust for intelligent systems.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Maintain persistent Trust Posture across people, AI agents,
            authorization and workflows—with governance memory and replayable
            operational evidence.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/demo" className="brand-primary-action brand-action-large text-sm">
              View Demo
            </Link>
            <Link href="/enterprise-access" className="brand-secondary-action brand-action-large text-sm">
              Request Enterprise Access
            </Link>
            <Link href="/enterprise-access?intent=design_partner" className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 hover:text-white">
              Become a Design Partner
            </Link>
          </div>
        </section>

        <section className="operational-panel mt-8 p-6">
          <p className="operational-eyebrow">Enterprise trust infrastructure</p>
          <h2 className="mt-3 text-2xl font-semibold">What the platform makes reviewable.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {trustControls.map(([title, copy]) => (
              <div key={title} className="operational-card p-4">
                <p className="text-sm font-semibold text-zinc-100">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="operational-panel mt-8 p-6">
          <h2 className="text-2xl font-semibold">Trust must survive the workflow.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Access controls can establish a starting point. They do not explain
            whether identity, authorization or execution remained trustworthy as
            context changed.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Human and AI-agent activity now shares operational workflows. Teams
            need continuous evidence of who or what acted, under which authority,
            who reviewed the change and what outcome was recorded.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {coordinationControls.map(([title, copy]) => (
              <div key={title} className="operational-card p-4">
                <p className="text-sm font-semibold text-zinc-100">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Pilot conversion path</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Start with one workflow, one reviewer path and one receipt that can
            be discussed with security, talent, compliance and executive
            stakeholders.
          </p>
        </section>
      </div>
    </main>
  );
}
