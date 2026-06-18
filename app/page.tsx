import Link from "next/link";
import { PrivateBetaBadge, PrivateBetaNotice } from "@/components/private-beta";

const workflowSteps = [
  [
    "Request Access",
    "Start with a controlled enterprise or design-partner access request.",
  ],
  [
    "Create Workspace",
    "Create a workspace and first trust case for the workflow under review.",
  ],
  [
    "Upload Evidence",
    "Attach supporting records so review is grounded in concrete material.",
  ],
  [
    "Trigger Governance",
    "Route unresolved context into human-led governance review.",
  ],
  [
    "Generate Receipt",
    "Issue a verification receipt that explains status, evidence and review context.",
  ],
  [
    "Review Replay",
    "Replay the operational timeline so teams can understand what happened.",
  ],
];

const wedges = [
  "Hiring Security",
  "Interview Integrity",
  "Explainable Governance",
  "Evidence Chains",
  "Trust Freshness",
  "Verification Receipts",
  "Replayable Trust Timelines",
];

const audiences = [
  "Enterprise operations teams",
  "Trust and safety reviewers",
  "Hiring and workforce verification teams",
  "Governance and compliance leads",
];

const principles = [
  "Deployment-ready pilot paths",
  "Operational readiness checks",
  "Evidence-backed trust",
  "Explainable trust freshness",
  "Explainable verification",
  "Human review where it matters",
  "Governance visibility without invasive monitoring",
];

const narrative = [
  [
    "Problem",
    "Synthetic trust, weak provenance and fragmented reviews make operational decisions harder to explain.",
  ],
  [
    "Why Now",
    "Hiring workflows, AI agents and identity-sensitive operations need reviewable evidence before teams act.",
  ],
  [
    "How It Works",
    "Create a case, attach evidence, review signals, record governance, preserve timeline, issue receipts and replay history.",
  ],
  [
    "Explainability",
    "Every workflow shows source context, missing requirements, reason codes and audit history.",
  ],
  [
    "Governance",
    "AI can assist with summaries, but humans remain responsible for approvals, escalations and decisions.",
  ],
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <section className="border-b border-zinc-900 px-6 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Operational Trust Infrastructure
          </p>
          <PrivateBetaBadge className="mt-4" />
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-tight md:text-7xl">
            Operational Trust Infrastructure for AI-era workflows.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            Cyber Sentinels is Operational Trust Infrastructure with
            explainable trust posture workflows for hiring security, interview
            integrity, AI agent governance and evidence-backed verification.
          </p>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-500">
            Built for enterprise operations, trust and safety, hiring,
            compliance and governance teams that need decisions to be
            reviewable, replayable and accountable.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500">
            The timing matters because AI-assisted work, synthetic identity
            risk and fragmented approvals are moving faster than traditional
            review records.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500">
            The difference is operational continuity: evidence chains, trust
            freshness, human governance, verification receipts and replayable
            timelines in one calm workflow.
          </p>
          <PrivateBetaNotice className="mt-5 max-w-3xl" />
          <div className="mt-6 flex max-w-4xl flex-wrap gap-2">
            {wedges.map((wedge) => (
              <span
                key={wedge}
                className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs text-zinc-300"
              >
                {wedge}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
            >
              View Pricing
            </Link>
            <Link
              href="/enterprise-access"
              className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-cyan-500"
            >
              Request Enterprise Access
            </Link>
            <Link
              href="/enterprise/demo-stories"
              className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-cyan-500"
            >
              View Demo Stories
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 md:px-8">
        <div className="grid gap-3 md:grid-cols-5">
          {narrative.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">{title}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Pilot Path
          </p>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
            First successful workflow in under 10 minutes.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            The pilot path is intentionally short: access, workspace, evidence,
            governance, receipt and replay.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {workflowSteps.map(([title, copy], index) => (
            <article
              key={title}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
                  {String(index + 1).padStart(2, "0")}
                </p>
                {index < workflowSteps.length - 1 ? (
                  <span className="text-zinc-600" aria-hidden="true">
                    &rarr;
                  </span>
                ) : null}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-100">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-16 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
              Who It Is For
            </p>
            <h2 className="mt-4 text-3xl font-semibold">
              Teams that need trust to be operational, not abstract.
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {audiences.map((audience) => (
                <div
                  key={audience}
                  className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
                >
                  {audience}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
              Trust Posture
            </p>
            <h2 className="mt-4 text-3xl font-semibold">
            Clear enough for users. Structured enough for enterprise review.
          </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              Operational trust posture evolves over time and requires
              explainable governance, review intervals and reverification when
              confidence ages.
            </p>
            <div className="mt-6 grid gap-3">
              {principles.map((principle) => (
                <div
                  key={principle}
                  className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
                >
                  {principle}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="rounded-lg border border-zinc-800 bg-black p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Operational Identity Context
          </p>
          <h2 className="mt-4 max-w-4xl text-3xl font-semibold md:text-4xl">
            Internal identity-layer capabilities support the platform quietly.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels may use internal identity-layer capabilities to
            connect people, workspaces, evidence, agents and operational context
            inside governed review workflows.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500">
            Public positioning should stay anchored on Cyber Sentinels and
            Operational Trust Infrastructure. Internal trust-layer technology
            supports verification context without becoming the external brand.
          </p>
          <Link
            href="/agents"
            className="mt-6 inline-flex rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
          >
            Explore AI Governance
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="grid gap-6 rounded-lg border border-zinc-800 bg-black p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
              Enterprise Readiness
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Start small, keep the audit path visible.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              Use Cyber Sentinels to create verification workflows, attach
              evidence, review status and preserve governance visibility as the
              workflow matures.
            </p>
          </div>
          <Link
            href="/enterprise"
            className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
          >
            Explore Enterprise
          </Link>
        </div>
      </section>
    </main>
  );
}
