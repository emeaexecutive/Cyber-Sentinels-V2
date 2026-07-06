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

const enterpriseTrustQuestions = [
  {
    title: "Can trust decisions be explained and audited?",
    body: "Cyber Sentinels does not operate as a black-box AI score. It creates an evidence-backed trust record for every human, AI agent and sensitive workflow it verifies. Decisions stay linked to identity evidence, behavioural signals, provenance, risk flags, timestamps, reviewer actions, rationale and audit history—so teams can replay what happened, what changed, who approved it and why trust was granted, reduced or escalated.",
    support: "Every trust decision should be replayable later.",
  },
  {
    title: "Who is accountable when AI agents act autonomously?",
    body: "AI agents increasingly access systems, trigger workflows, approve actions, move data and interact with customers, employees and suppliers. Cyber Sentinels preserves which human or AI agent acted, whether it was authorised, what workflow it touched, what changed, whether runtime behaviour crossed a review boundary, who reviewed the action and whether the event can be investigated later.",
    support: "The accountability layer between humans, AI agents and enterprise workflows.",
  },
  {
    title: "Why can’t the big platforms just build this?",
    body: "Large platforms can build parts of the problem. Cyber Sentinels is designed as an independent trust layer across models, identity providers, security tools, workflow systems and enterprise environments. It remains model-agnostic, provider-agnostic, workflow-aware, evidence-based and explainable to legal, risk, compliance, security and boards.",
    support: "The moat is not owning the AI model. The moat is owning the trust record.",
  },
] as const;

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

        <section className="operational-panel mt-8 p-6 md:p-8">
          <p className="operational-eyebrow">Independent trust layer</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold">
            The Questions Every Enterprise Will Ask
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Trust infrastructure earns confidence through evidence, accountability
            and independence—not opaque scoring or ownership of the underlying model.
          </p>
          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            {enterpriseTrustQuestions.map((question) => (
              <article key={question.title} className="operational-card flex min-w-0 flex-col p-5">
                <h3 className="text-lg font-semibold text-zinc-100">{question.title}</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-zinc-400">{question.body}</p>
                <p className="mt-5 border-t border-zinc-800 pt-4 text-sm font-medium leading-6 text-cyan-200">
                  {question.support}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-7">
            <Link href="/platform" className="brand-secondary-action brand-action-large text-sm">
              Explore the Trust Layer
            </Link>
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
