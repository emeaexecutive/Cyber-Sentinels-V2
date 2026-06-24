import Link from "next/link";
import { PrivateBetaBadge, PrivateBetaNotice } from "@/components/private-beta";

export const dynamic = "force-dynamic";

const capabilities = [
  [
    "Candidate Verification",
    "Review candidate records, submitted evidence, profile details and workflow status before a decision moves forward.",
  ],
  [
    "Interview Integrity",
    "Keep interview notes, session-integrity checks, flags and reviewer actions together for a clear operational review.",
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

const riskExamples = [
  [
    "Synthetic applicants",
    "A candidate profile looks complete, but submitted identity evidence, employment history and interview behavior do not line up. Cyber Sentinels separates identity confidence from session integrity so reviewers can request evidence before the process advances.",
  ],
  [
    "Proxy interviews",
    "The person in the interview may not match the verified candidate context. Reviewer notes, liveness checks, voice/video consistency and escalation history stay attached to the same hiring workflow.",
  ],
  [
    "Injected interview feeds",
    "A screen, camera or audio channel shows signs of manipulation. Injection risk becomes an active flag, not a hidden score, and the case can move into governance review.",
  ],
  [
    "Session integrity failures",
    "The meeting can continue as an interview record while the trust state changes. Teams see what failed, what remains usable, and what needs reverification.",
  ],
  [
    "Voice/video mismatch",
    "A mismatch between claimed identity, voice pattern, video continuity or device context is preserved as evidence for human review instead of becoming an automatic rejection.",
  ],
  [
    "Governance escalation",
    "High-risk signals open a reviewer-owned decision path with evidence, chronology, receipt and replay references available for audit.",
  ],
];
const workflow = [
  "Fake applicant enters the hiring workflow.",
  "Verification begins across candidate, recruiter and interview context.",
  "Session integrity fails because channel evidence changes.",
  "Governance review opens with reviewer ownership.",
  "Replay evidence is generated from recorded workflow state.",
  "The threat is blocked by human-governed action.",
  "A verification receipt is issued for audit review.",
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
            Hiring Security is the clearest entry point for Operational Trust Infrastructure: fake applicants, proxy interviews, AI-assisted hiring fraud and injected sessions become reviewable workflows with verification evidence, governance, replay and receipts.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels coordinates trust across humans, AI agents, enterprise workflows, and digital interactions so security, legal and people teams can see trust state changes, governance escalation events and reviewer actions in one operational chronology.
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

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Session Integrity Review
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Identity and session integrity stay separate.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Liveness, deepfake risk, injection risk, channel integrity and
            session anomalies are separate verification signals. A candidate
            identity may be verified while channel integrity evidence or other
            verification flags still require manual review.
          </p>
          <Link href="/dashboard/session-integrity" className="mt-5 inline-flex text-sm font-semibold text-cyan-200 underline">
            Review session integrity
          </Link>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Operational Examples
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Hiring attacks become reviewable workflows.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            The product does not ask teams to trust a black-box authenticity claim. It shows what changed, what verification evidence exists, whether liveness, deepfake risk and injection risk are separate concerns, who reviewed it, whether governance escalation is required and where replay evidence is available.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {riskExamples.map(([title, body]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{body}</p>
              </article>
            ))}
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
              From fake applicant to verification receipt.
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
