import Link from "next/link";

export const dynamic = "force-dynamic";

const capabilities = [
  [
    "Candidate Verification",
    "Review candidate records, submitted evidence, recruiter context, profile details and workflow status before a hiring or access decision moves forward.",
  ],
  [
    "Interview Integrity",
    "Keep interview notes, session-integrity checks, flags and reviewer actions together for a clear operational review.",
  ],
  [
    "Synthetic Applicant Defense",
    "Surface missing evidence, suspicious workflow activity, proxy-interview indicators and unresolved review items without claiming automatic lie detection.",
  ],
  [
    "Governance Reviews",
    "Route high-risk hiring cases to human reviewers with escalation reason, session context and evidence needed for a defensible decision.",
  ],
];

const riskExamples = [
  [
    "Identity continuity",
    "Candidate identity, submitted evidence and workflow context can change in confidence over time. Cyber Sentinels keeps those changes visible so reviewers can request stronger evidence before the process advances.",
  ],
  [
    "Proxy interviews",
    "The person in the interview may not match the verified candidate context. Reviewer notes, liveness checks, voice/video continuity, device context and escalation history stay attached to the same hiring workflow for governance review.",
  ],
  [
    "Session assistance and manipulation",
    "Generated answers, coached presence or manipulated media can change session integrity. Cyber Sentinels records observable anomalies and reviewer notes without turning them into unsupported detection claims.",
  ],
  [
    "Session integrity failures",
    "The meeting can continue as an interview record while the trust state changes. Teams see what failed, what remains usable, what needs reverification and whether governance escalation is required.",
  ],
];
const workflow = [
  "A candidate and hiring workflow enter the trusted process.",
  "Identity, Session Integrity and evidence are checked.",
  "Trust Posture changes when workflow evidence changes.",
  "Governance Review assigns a named owner when risk appears.",
  "Replay Timeline explains the event, evidence and intervention.",
  "Verification Receipt preserves the final hiring outcome.",
];

export default function HiringSecurityPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Hiring Security
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            Replayable evidence for trusted hiring workflows.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-300">
            Apply Cyber Sentinels’ operational trust infrastructure to candidate
            identity, Session Integrity, governed review and replayable hiring outcomes.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Hiring Security is one major workflow domain within a broader platform
            for continuous identity, authorization lineage and governance continuity.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-200">
            Operational trust infrastructure for humans, AI agents and
            enterprise workflows.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/demo/hiring-attack"
              className="brand-primary-action brand-action-large text-sm"
            >
              View Demo
            </Link>
            <Link
              href="/enterprise-access"
              className="brand-secondary-action brand-action-large text-sm"
            >
              Request Enterprise Access
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
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            Session integrity anomalies are treated as review context, not automatic conclusions. Governance escalation records why the hiring workflow needs human review before the decision moves forward.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Operational Examples
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Hiring risk becomes a governed workflow.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            The product avoids black-box authenticity claims. It shows what changed, what verification evidence exists, who reviewed it, why escalation occurred and where replay evidence is available.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {riskExamples.map(([title, body]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{body}</p>
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
              Workflow chronology
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              From workflow entry to verification receipt.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              Start with one reviewable workflow. The outcome is an Evidence
              Chain, reviewer decision, Replay Timeline and Verification
              Receipt.
            </p>
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
            hiring workflow can be reviewed without unsupported certainty
            claims or invasive monitoring.
          </p>
        </section>
      </div>
    </main>
  );
}
