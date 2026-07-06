import Link from "next/link";
import { TrustOpsOperatingStack } from "@/components/trustops-operating-stack";

const regulatedWorkflows = [
  ["Fintech operations", "Preserve identity, delegated authority and approval evidence across payment, account and exception workflows."],
  ["Banking approvals", "Keep initiator, service-account activity, policy checks and dual-control decisions in one governed chronology."],
  ["Insurance claims", "Connect intake evidence, automation, adjuster review and governed outcome in one replayable chronology."],
  ["Healthcare operations", "Preserve identity, delegated access, clinical workflow evidence and accountable approvals across regulated operational handoffs."],
  ["Underwriting", "Keep data inputs, API actors, decision support, approvals and policy exceptions accountable over time."],
  ["Enterprise onboarding", "Continuously verify human and non-human actors as access, evidence and responsibilities change."],
  ["Vendor access", "Connect third-party identity, API access, evidence collection, exceptions and accountable approval."],
  ["Hiring", "Link candidate identity, session integrity, reviewer action and verification receipts without replacing human judgment."],
  ["Workflow approvals", "Retain who or what acted, under which authority, what changed and who approved the outcome across high-consequence decisions."],
  ["AI-assisted operations", "Evaluate runtime risk, delegated scope, evidence and human intervention across provider-agnostic AI-assisted work."],
];

export default function EnterprisePage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Enterprise TrustOps</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Govern trust across human and machine work.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Maintain governed trust continuity across people, AI agents,
            non-human identities and enterprise workflows—with persistent
            posture and replayable enterprise memory.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Security, risk, compliance and operations teams get one reviewable
            record without replacing accountable decision-makers or systems of record.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/demo" className="brand-primary-action brand-action-large text-sm">
              View Demo
            </Link>
            <Link href="/enterprise-access" className="brand-secondary-action brand-action-large text-sm">
              Request Enterprise Access
            </Link>
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
        </section>
      </div>
    </main>
  );
}
