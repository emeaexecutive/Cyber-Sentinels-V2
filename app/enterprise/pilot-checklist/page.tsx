import type { Metadata } from "next";
import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";
import { enterpriseCtas } from "@/lib/enterprise-experience";

const kickoffChecklist = [
  "Name the customer sponsor, pilot owner, security reviewer, operational reviewer and Cyber Sentinels pilot owner.",
  "Select one consequential workflow and document its authority boundary.",
  "Approve sample data, retention, provider egress and restricted-data controls.",
  "Agree measurable success criteria, escalation ownership and rollback triggers.",
];

const timeline = [
  ["Week 0", "Approve scope, owners, security boundaries and rollback triggers."],
  ["Week 1", "Review workspace configuration, data mapping and provider readiness."],
  ["Week 2", "Exercise allow, review and block paths with retained evidence."],
  ["Week 3", "Review outcomes and record the production-readiness decision."],
];

const successMetrics = [
  "Every reviewed decision links rationale, authority, evidence, Replay and an accountable owner.",
  "Every escalation has a named reviewer, disposition and timestamp.",
  "Approved cases can produce JSON, PDF and Enterprise Summary Trust Evidence Packs.",
  "Customer reviewers can locate posture, evidence, next action and limitations without assistance.",
  "No unresolved critical-path failure remains at closeout.",
];

const responsibilities = [
  ["Customer", "Supply accountable owners, approved data, access boundaries, reviewers and outcome adjudication."],
  ["Cyber Sentinels", "Configure the bounded workflow, preserve evidence boundaries and document limitations."],
  ["Shared", "Approve success criteria, review incidents, rehearse rollback and sign the closeout record."],
];

const rollback = [
  "Pause new submissions and preserve existing audit records.",
  "Disable the affected integration without weakening authorization controls.",
  "Restore the documented pre-pilot decision path.",
  "Notify the named customer and Cyber Sentinels owners.",
  "Export retained evidence and require approval before restart.",
];

export default function EnterprisePilotChecklistPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Pilot Checklist"
          title="Make every pilot prerequisite, owner and exit condition explicit."
          bullets={[
            "One bounded consequential workflow.",
            "Named customer and Cyber Sentinels owners.",
            "Approved data, provider and security boundaries.",
            "Observable success criteria and a rehearsed rollback path.",
          ]}
          primary={enterpriseCtas.requestControlledPilot}
          secondary={enterpriseCtas.buyerDocumentation}
        />

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="operational-panel p-6">
            <p className="operational-eyebrow">Before kickoff</p>
            <h2 className="mt-3 text-3xl font-semibold">Evidence before activation.</h2>
            <ol className="mt-5 grid gap-3">
              {kickoffChecklist.map((item, index) => (
                <li key={item} className="flex gap-3 rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300">
                  <span className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </article>

          <article className="operational-panel p-6">
            <p className="operational-eyebrow">Success metrics</p>
            <h2 className="mt-3 text-3xl font-semibold">Acceptance is observable.</h2>
            <ul className="mt-5 grid gap-3">
              {successMetrics.map((metric) => (
                <li key={metric} className="border-l border-cyan-900 pl-4 text-sm leading-6 text-zinc-300">{metric}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-8 operational-panel p-6">
          <p className="operational-eyebrow">Deployment timeline</p>
          <h2 className="mt-3 text-3xl font-semibold">Four bounded phases with explicit outcomes.</h2>
          <ol className="mt-5 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 md:grid-cols-4">
            {timeline.map(([week, outcome]) => (
              <li key={week} className="bg-black p-5">
                <p className="font-semibold text-cyan-200">{week}</p>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{outcome}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="operational-panel p-6">
            <p className="operational-eyebrow">Responsibilities and support</p>
            <div className="mt-5 grid gap-3">
              {responsibilities.map(([owner, detail]) => (
                <div key={owner} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <h2 className="font-semibold text-zinc-100">{owner}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              Support contacts are named roles agreed at kickoff. An unassigned mailbox is not operational ownership.
            </p>
          </article>

          <article className="operational-panel p-6">
            <p className="operational-eyebrow">Rollback</p>
            <h2 className="mt-3 text-3xl font-semibold">Fail closed and preserve evidence.</h2>
            <ol className="mt-5 grid gap-3 text-sm leading-6 text-zinc-300">
              {rollback.map((item, index) => (
                <li key={item} className="border-l border-rose-800 pl-4">
                  <span className="font-semibold text-rose-200">{index + 1}. </span>{item}
                </li>
              ))}
            </ol>
          </article>
        </section>

        <section className="mt-8 operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Ready to scope the workflow?</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold">Request a controlled pilot only after the evidence boundary is accepted.</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={enterpriseCtas.requestControlledPilot.href} className="brand-primary-action brand-action-large text-sm">
              {enterpriseCtas.requestControlledPilot.label}
            </Link>
            <Link href={enterpriseCtas.buyerDocumentation.href} className="brand-secondary-action brand-action-large text-sm">
              {enterpriseCtas.buyerDocumentation.label}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: "Enterprise Pilot Checklist | Cyber Sentinels",
  description: "Pilot prerequisites, timeline, success metrics, ownership, support and rollback controls.",
  alternates: { canonical: "/enterprise/pilot-checklist" },
};
