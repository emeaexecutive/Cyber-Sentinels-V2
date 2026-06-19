import Link from "next/link";
import { PrivateBetaBadge, PrivateBetaNotice } from "@/components/private-beta";

const hiringRisks = [
  [
    "Synthetic applicant risk",
    "Generated profiles, copied work histories and manipulated interview evidence can move through hiring faster than review teams can verify them.",
  ],
  [
    "Interview integrity gaps",
    "Recruiters need a clear record of who was reviewed, what evidence was used and which flags still need human attention.",
  ],
  [
    "Audit pressure",
    "When a hiring decision is challenged, teams need defensible records, reviewer actions and a replayable workflow history.",
  ],
];

const productPillars = [
  [
    "Identity Verification",
    "Verify humans, candidates, employees, vendors, and AI-generated identities using trust checks, liveness signals, and verification evidence.",
  ],
  [
    "Trust Governance",
    "Manage approvals, reviews, audit trails, and verification cases across regulated teams and enterprise workflows.",
  ],
  [
    "AI Threat Defense",
    "Detect synthetic actors, fake candidates, impersonation attempts, and unverified AI agents before they enter critical systems.",
  ],
];

const hiringSecurity = [
  [
    "Candidate Verification",
    "Create a review case for the candidate, recruiter and interview workflow before sensitive hiring decisions move forward.",
  ],
  [
    "Interview Integrity",
    "Track interview evidence, unresolved flags, reviewer notes and decision history in one operational view.",
  ],
  [
    "Synthetic Applicant Defense",
    "Surface missing evidence, unusual workflow activity and review gaps without claiming automatic lie detection.",
  ],
  [
    "Governance & Audit Trails",
    "Route sensitive cases to human review and preserve the decision record for security, legal and people teams.",
  ],
  [
    "Verification Workflows",
    "Move from request access to workspace, evidence upload, governance review, receipt and replay in a simple pilot path.",
  ],
];

const workflowSteps = [
  "Identity enters workflow",
  "Verification checks run",
  "Risk flags are generated",
  "Governance review is triggered",
  "Audit trail is stored",
];

const aiToolGaps = [
  "They can summarize notes, but they do not verify the workflow.",
  "They do not prove who reviewed what evidence and when.",
  "They do not maintain hiring audit trails across teams.",
  "They do not route sensitive decisions through governance review.",
];

const dashboardFocus = [
  "Active Flags",
  "Audit Trails",
  "Pending Reviews",
  "Threat Activity",
  "Verification Progress",
  "Hiring Security Metrics",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#05070b] text-zinc-100">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-14 md:px-8 md:py-16">
        <div className="flex flex-wrap items-center gap-3">
          <PrivateBetaBadge />
          <span className="rounded-full border border-cyan-400/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Hiring Security
          </span>
        </div>

        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Cyber Sentinels
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-6xl">
            Enterprise Trust Infrastructure for Humans and AI Agents
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-300">
            Verify people, AI agents, and digital identities before they become
            a threat. Cyber Sentinels combines identity assurance, deepfake risk
            detection, governance workflows, and audit-ready trust trails.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/enterprise-access"
            className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-[#05070b]"
          >
            Explore Enterprise Trust
          </Link>
          <Link
            href="#trust-workflow"
            className="rounded-md border border-zinc-600 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 focus:ring-offset-[#05070b]"
          >
            View Trust Workflow
          </Link>
        </div>

        <PrivateBetaNotice className="max-w-3xl" />
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/70">
        <div className="mx-auto max-w-6xl px-6 py-12 md:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
              Enterprise Trust Platform
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              One trust layer across identity, governance, and AI threats.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {productPillars.map(([title, body]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-10 md:grid-cols-3 md:px-8">
          {hiringRisks.map(([title, body]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 md:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Hiring Security
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
            Verification workflows for hiring integrity.
          </h2>
          <p className="mt-4 text-base leading-7 text-zinc-300">
            The platform gives enterprise teams one place to review candidate
            evidence, interview flags, governance actions, audit trails and
            verification receipts.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hiringSecurity.map(([title, body]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="trust-workflow" className="scroll-mt-20 bg-zinc-950/70">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:px-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
              Trust Workflow
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              A clear path from identity entry to audit trail.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-300">
              Every identity follows a reviewable enterprise workflow, with
              verification checks, risk flags, human governance, and a stored
              record of what happened.
            </p>
          </div>
          <div className="grid gap-3">
            {workflowSteps.map((step, index) => (
              <article key={step} className="flex gap-4 rounded-lg border border-zinc-800 bg-black p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/50 text-sm font-semibold text-cyan-100">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-white">{step}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:px-8 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Why AI Tools Alone Are Not Enough
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            ChatGPT and Claude help teams write. They do not run hiring security.
          </h2>
          <p className="mt-4 text-base leading-7 text-zinc-300">
            Enterprise hiring needs identity assurance, governance, auditability,
            workflow visibility, operational trust and evidence continuity.
            Cyber Sentinels adds the operational layer around AI-assisted work.
          </p>
        </div>
        <div className="grid gap-3">
          {aiToolGaps.map((item) => (
            <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm font-medium text-zinc-100">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/70">
        <div className="mx-auto max-w-6xl px-6 py-12 md:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
              Dashboard Clarity
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              Operational views leaders can scan quickly.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-300">
              Dashboards focus on review work, not visual noise. Teams can see
              which hiring workflows need action, what evidence exists and where
              governance review is pending.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dashboardFocus.map((item) => (
              <div key={item} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm font-semibold text-zinc-100">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:px-8 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Demo Ready
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            See the hiring workflow from flag to receipt.
          </h2>
          <p className="mt-4 text-base leading-7 text-zinc-300">
            Use the founder demo routes, enterprise walkthrough and demo stories
            to show how a hiring review moves from evidence upload to human
            review, verification receipt and replay.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="rounded-md border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-zinc-300 hover:text-white"
            >
              Open Demo
            </Link>
            <Link
              href="/enterprise/walkthrough"
              className="rounded-md border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-zinc-300 hover:text-white"
            >
              Workflow Walkthrough
            </Link>
          </div>
        </div>
        <aside className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Explainer Video Placement
          </p>
          <h3 className="mt-3 text-xl font-semibold text-white">
            2-minute hiring security overview
          </h3>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Reserved for a short video that explains the problem, the review
            workflow, the governance checkpoint and the final verification
            receipt.
          </p>
          <Link
            href="/enterprise-access"
            className="mt-5 inline-flex rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-200"
          >
            Book a Call
          </Link>
        </aside>
      </section>
    </main>
  );
}
