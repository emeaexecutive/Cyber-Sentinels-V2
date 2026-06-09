import Link from "next/link";
import { PrivateBetaNotice } from "@/components/private-beta";

const demoSteps = [
  [
    "Create Trust Case",
    "Open a sample operational trust case inside the demo workspace.",
    "The walkthrough starts with a structured case, not real enterprise data.",
  ],
  [
    "Upload Evidence",
    "Attach sample evidence to explain what reviewers would inspect.",
    "Evidence gives the review process something concrete and reviewable.",
  ],
  [
    "Generate Signals",
    "Show sample signals such as missing provenance or a pending liveness step.",
    "Signals explain review context; they do not make autonomous decisions.",
  ],
  [
    "Governance Review",
    "Route the sample case into human review with recommended next actions.",
    "Governance remains human-led and accountable.",
  ],
  [
    "Timeline",
    "Walk through the sample operational history in chronological order.",
    "The timeline makes the trust workflow explainable.",
  ],
  [
    "Trust Receipt",
    "Open a sample verification receipt with evidence, status and reviewer context.",
    "Receipts are audit-ready explanations, not immutable truth claims.",
  ],
  [
    "Replay",
    "Replay the sample workflow to understand how evidence and governance evolved.",
    "Replay preserves operational memory and explainable provenance.",
  ],
  [
    "Hiring Integrity Review",
    "Review a sample candidate, recruiter and interview integrity workflow.",
    "Hiring review is explainable and human-governed.",
  ],
];

const demoConcepts = [
  [
    "What Cyber Sentinels does",
    "Cyber Sentinels gives teams a governed way to create trust records, collect evidence, review outcomes and keep an audit trail.",
  ],
  [
    "Trust Passport workflow",
    "A Trust Passport is the user-facing record that shows verification status, evidence state and decision history.",
  ],
  [
    "Evidence upload concept",
    "Users provide supporting evidence, while sensitive records stay out of the public demo experience.",
  ],
  [
    "Admin review concept",
    "Admins review evidence separately from the user journey and record outcomes through protected operational workflows.",
  ],
  [
    "Decision and audit trail",
    "Approvals, rejections and requests for more evidence are recorded with traceable audit history.",
  ],
  [
    "Trust Graph concept",
    "Trust relationships help explain how passports, evidence, decisions and audit events connect.",
  ],
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
            Guided Demo Mode
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Understand what Cyber Sentinels actually does.
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
            This guided walkthrough uses sample-only data to show how trust
            cases, evidence, signals, governance review, timelines, receipts,
            replay and hiring integrity fit together.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            Demo mode is isolated from real enterprise records. It does not
            expose admin tooling, service-role credentials or private customer
            data.
          </p>
          <PrivateBetaNotice className="mt-4 max-w-3xl" />
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/enterprise/walkthrough"
              className="rounded-lg bg-white px-4 py-3 font-semibold text-black"
            >
              Start Enterprise Walkthrough
            </Link>
            <Link
              href="/enterprise-access?intent=design_partner"
              className="rounded-lg border border-zinc-700 px-4 py-3 text-zinc-300 hover:text-white"
            >
              Request Design Partner Access
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {demoConcepts.map(([title, copy]) => (
            <article
              key={title}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Onboarding Walkthrough</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                Minimal walkthrough tips appear where they matter: workspace,
                trust case, evidence, governance, timeline, replay and trust
                receipt. They are designed for live demos, not constant product
                noise.
              </p>
            </div>
            <span className="rounded-full border border-cyan-800 px-3 py-1 text-xs text-cyan-100">
              Sample data only
            </span>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {demoSteps.map(([step, copy, value], index) => (
            <article
              key={step}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                Step {index + 1}
              </span>
              <h2 className="mt-3 text-xl font-semibold text-zinc-100">
                {step}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-500">
                {value}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Demo Outcome</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            By the end of the flow, the user can see a verification status, the
            evidence supporting review, the recorded decision and the audit
            trail that explains what happened.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-6">
          <h2 className="text-2xl font-semibold">What was unclear?</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels is evolving through early operational feedback and
            design collaboration. Share confusion points, onboarding issues or
            enterprise use cases after signing in.
          </p>
          <Link
            href="/login?next=/feedback"
            className="mt-5 inline-flex rounded-lg border border-cyan-800 px-4 py-3 text-sm font-semibold text-cyan-100 hover:text-white"
          >
            Share Feedback
          </Link>
        </section>
      </div>
    </main>
  );
}
