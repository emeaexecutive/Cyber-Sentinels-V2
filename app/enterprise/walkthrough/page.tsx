import Link from "next/link";
import { PrivateBetaBadge } from "@/components/private-beta";

const workflow = [
  [
    "Hiring workflow",
    "Teams start with a review case for the candidate, recruiter or interview workflow being assessed.",
  ],
  [
    "Evidence review",
    "Evidence, active flags, governance actions, receipts and replay are connected in one review path.",
  ],
  [
    "Interview integrity",
    "Hiring workflows can review candidate records, recruiter verification and interview evidence without claiming binary detection.",
  ],
  [
    "Governance process",
    "Human reviewers approve, reject, escalate, defer or request more evidence. AI may summarize, but it does not decide.",
  ],
  [
    "AI-assisted review",
    "Operational summaries can highlight missing evidence, unresolved flags and bottlenecks while keeping source records visible.",
  ],
  [
    "Auditability",
    "Timeline events, audit logs, replay sessions and verification receipts preserve what happened and why it mattered.",
  ],
];

const problemPoints = [
  "Hiring and operational workflows now face synthetic applicant risk and fragmented review trails.",
  "Teams need clear evidence and governance context before decisions, not another opaque score.",
  "Design partners need to see how trust work moves from intake to evidence, review, receipt and replay.",
];

export default function EnterpriseWalkthroughPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Enterprise Walkthrough
          </p>
          <PrivateBetaBadge className="mt-4" />
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold md:text-6xl">
            AI-era hiring security needs evidence, governance and audit trails.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels helps organizations protect hiring integrity with
            verification workflows, governance reviews, audit trails and
            operational replay.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">
              Open Guided Demo
            </Link>
            <Link href="/enterprise-access?intent=design_partner" className="rounded-lg border border-cyan-800 px-4 py-3 text-sm text-cyan-100">
              Request Design Partner Access
            </Link>
            <Link href="/enterprise/pilot-setup" className="rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300">
              Pilot Setup
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {problemPoints.map((point) => (
            <article key={point} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-sm leading-7 text-zinc-400">{point}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflow.map(([title, copy], index) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-3 text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-6">
          <h2 className="text-2xl font-semibold">Why auditability matters</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels shows what evidence existed, which flags were
            unresolved, what governance action occurred, which receipt was
            issued and how the workflow can be replayed later.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            The system is designed for guided enterprise conversations and
            design partner learning. Demo data is sample-only and does not
            expose operational internals or real customer records.
          </p>
        </section>
      </div>
    </main>
  );
}
