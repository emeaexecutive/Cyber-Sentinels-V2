import Link from "next/link";
import { TrustOpsOperatingStack } from "@/components/trustops-operating-stack";

const trustControls = [
  ["Continuous Identity", "Human and machine identities retain verification freshness, context and accountable ownership after access begins."],
  ["AI Agent and NHI Governance", "Agent, service-account and API-actor purpose, ownership, delegated scope and execution history stay reviewable."],
  ["Enterprise Authorization", "Authorization grants, changes and revocations remain connected to their authority and rationale."],
  ["Persistent Trust Posture", "Identity, workflow, evidence and governance state evolve without becoming a hidden universal score."],
  ["Governance Continuity", "High-impact changes route to named reviewers with ownership, chronology and recorded action."],
  ["Workflow Verification", "The actor, governed execution, operational evidence and outcome remain one reviewable record."],
  ["Replayable Evidence", "Canonical chronology reconstructs what happened before, during and after a workflow changed state."],
  ["Enterprise AI Sovereignty", "Customer data, provider use, workflow memory and operational IP remain governed by enterprise policy."],
];

const coordinationControls = [
  ["Trust Posture changes", "Identity, session, evidence and reviewer states remain visible as workflows evolve."],
  ["Governance escalation events", "High-risk workflow changes can move into human review with ownership."],
  ["Evidence Chain attached", "Verification Receipt, Replay Timeline and audit references stay connected to the workflow."],
  ["Workflow authenticity status", "Teams can see whether a workflow is verified, elevated risk or awaiting review."],
];

const regulatedWorkflows = [
  ["Fintech operations", "Preserve identity, delegated authority and approval evidence across payment, account and exception workflows."],
  ["Banking approvals", "Keep initiator, service-account activity, policy checks and dual-control decisions in one governed chronology."],
  ["Insurance claims", "Connect intake evidence, automation, adjuster review and governed outcome in one replayable chronology."],
  ["Healthcare operations", "Preserve identity, delegated access, clinical workflow evidence and accountable approvals across regulated operational handoffs."],
  ["Underwriting", "Keep data inputs, API actors, decision support, approvals and policy exceptions accountable over time."],
  ["Enterprise onboarding", "Continuously verify human and non-human actors as access, evidence and responsibilities change."],
  ["Vendor onboarding", "Connect third-party identity, API access, evidence collection, exceptions and accountable approval."],
  ["Hiring", "Link candidate identity, session integrity, reviewer action and verification receipts without replacing human judgment."],
  ["Workflow approvals", "Retain who or what acted, under which authority, what changed and who approved the outcome."],
  ["AI-agent operations", "Evaluate runtime risk, delegated scope, evidence and intervention across agent-led work."],
];

export default function EnterprisePage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">
            Enterprise Trust Operations
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Operational trust for intelligent systems.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Maintain governed trust continuity across people, AI agents,
            non-human identities and enterprise workflows—with persistent
            posture and replayable operational memory.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-200">
            We verify the actor, the workflow and the evidence behind critical
            operations.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Verify the actor, the work and the evidence behind critical
            operational outcomes—not merely whether a point-in-time check passed.
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
          <p className="operational-eyebrow">Enterprise operating model</p>
          <h2 className="mt-3 text-2xl font-semibold">
            One stack from actor identity to operational sovereignty.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Each layer contributes reviewable context to governed execution;
            Replay preserves the chronology and Persistent Trust Posture shows
            the current state.
          </p>
          <div className="mt-6">
            <TrustOpsOperatingStack compact />
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

        <section className="operational-panel mt-8 p-6">
          <p className="operational-eyebrow">Regulated workflow continuity</p>
          <h2 className="mt-3 text-2xl font-semibold">
            Preserve trust continuity where operational decisions must remain explainable.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels applies layered trust assurance across identity,
            authorization, runtime evidence, governance and replay. It does not
            claim certainty; it preserves the evidence and intervention path
            enterprises need to evaluate consequential workflows.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {regulatedWorkflows.map(([title, copy]) => (
              <article key={title} className="operational-card p-4">
                <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">TrustOps operating path</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Start with one workflow, one accountable reviewer path and one
            replayable outcome that operations, compliance, security and
            executive stakeholders can evaluate together.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            Over time, this foundation can support managed trust operations,
            regulated workflow oversight and operational governance support.
            These are directional operating models, not claims of a managed
            service available today.
          </p>
        </section>
      </div>
    </main>
  );
}
