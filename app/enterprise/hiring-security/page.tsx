import Link from "next/link";
import { PrivateBetaBadge, PrivateBetaNotice } from "@/components/private-beta";

export const dynamic = "force-dynamic";

const capabilities = [
  [
    "Candidate Verification",
    "Review candidate records, submitted evidence, profile details and hiring workflow status before a decision moves forward.",
  ],
  [
    "Interview Integrity",
    "Keep interview notes, assessment records, flags and reviewer actions together for a clear operational review.",
  ],
  [
    "Synthetic Applicant Defense",
    "Surface missing evidence, suspicious workflow activity and unresolved review items without claiming automatic lie detection.",
  ],
  [
    "Recruiter Verification",
    "Help teams confirm recruiter ownership, hiring context and handoffs for sensitive roles.",
  ],
  [
    "Governance Reviews",
    "Route high-risk cases to human reviewers with the evidence and context needed for a defensible decision.",
  ],
  [
    "Audit Trails",
    "Preserve review history, evidence updates, governance actions, receipts and replay timelines.",
  ],
];

const workflow = [
  "Open a hiring security workspace.",
  "Upload candidate, recruiter and interview evidence.",
  "Review active flags and missing information.",
  "Escalate the case for governance review when needed.",
  "Generate a verification receipt and replay the audit trail.",
];

export default function HiringSecurityPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-4">
            <PrivateBetaBadge />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Hiring Security
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            Protect enterprise hiring workflows against synthetic trust attacks.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-300">
            Cyber Sentinels helps teams verify candidates, protect interview
            integrity, review evidence, manage governance actions and preserve
            audit trails for sensitive hiring decisions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/interview-risk"
              className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-200"
            >
              Open Hiring Review Dashboard
            </Link>
            <Link
              href="/enterprise-access"
              className="rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-400"
            >
              Request Demo
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map(([title, body]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
              Pilot Workflow
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              From evidence upload to verification receipt.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              The hiring security pilot is intentionally simple so enterprise
              teams can complete a first review quickly and understand the
              operational value without new architecture.
            </p>
            <PrivateBetaNotice className="mt-5" />
          </section>
          <section className="grid gap-3">
            {workflow.map((item, index) => (
              <article key={item} className="flex gap-4 rounded-lg border border-zinc-800 bg-black p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/50 text-sm font-semibold text-cyan-100">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-zinc-200">{item}</p>
              </article>
            ))}
          </section>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Enterprise Readiness
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Hiring review that security, legal and people teams can understand.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels connects workspaces, review cases, evidence, active
            flags, governance reviews, audit trails, receipts and replay so a
            hiring workflow can be reviewed without relying on unsupported AI
            claims or invasive monitoring.
          </p>
        </section>
      </div>
    </main>
  );
}
