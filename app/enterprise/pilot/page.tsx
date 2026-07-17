import type { Metadata } from "next";
import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";
import { enterpriseCtas } from "@/lib/enterprise-experience";

const proofJourney = [
  ["Operational Trust Infrastructure", "Identity, authority, evidence, policy and runtime change are evaluated before consequential action."],
  ["What is proven", "Deterministic Trust Fabric execution, fail-closed controls, Replay, Evidence Graph, Trust Memory and evidence packs pass controlled source tests."],
  ["Validation evidence", "The versioned Release 1 cohort exists; human-reviewed approval and scoped metrics remain blocked."],
  ["Provider execution evidence", "The Hopae path is implemented; a credentialed target execution and reviewed outcome remain required."],
  ["Security evidence", "Source controls exist; deployed authentication, authorization, RLS, tenant and webhook proof remains required."],
  ["Performance evidence", "Durable telemetry is implemented; representative staging samples and evidence-backed percentiles remain required."],
  ["Known limitations", "No universal accuracy, Live provider, penetration-test, certification or SLA claim is made."],
  ["Controlled pilot scope", "One consequential workflow, named owners, approved data and explicit rollback boundaries."],
  ["Customer prerequisites", "Approved staging, controlled tenants, reviewers, provider credentials and security-test identities."],
  ["Request Pilot", "Request evaluation only after the evidence boundary and customer prerequisites are accepted."],
];

const releaseEvidence = [
  ["Validation", "Blocked", "30 pending fixtures; 0 approved. Scoped precision and recall remain unavailable."],
  ["Provider", "Requires customer configuration", "Hopae is selected; credentials and a retained target execution are absent."],
  ["Security", "Requires pilot evidence", "Source controls exist; deployed denial and isolation evidence is absent."],
  ["Performance", "Requires pilot evidence", "Durable telemetry is implemented; representative retained samples are absent."],
];

const outcomes = [
  "A documented workflow from intake to review.",
  "Clear separation of identity, liveness, deepfake risk and injection risk.",
  "A governance chronology that names what is pending or resolved.",
  "A replay timeline for audit and executive review.",
  "A verification receipt that can be printed or saved as PDF.",
];

const pilotChecklist = [
  "Name the customer sponsor, pilot owner, security reviewer and operational reviewer.",
  "Select one consequential workflow and document the authority boundary.",
  "Agree approved sample data, retention, provider egress and restricted-data controls.",
  "Configure only reviewed providers; preserve Awaiting Credentials where setup is incomplete.",
  "Exercise allow, review and block paths with Replay and Trust Evidence Pack export.",
  "Review success evidence, unresolved risks and production gates before closeout.",
];

const successMetrics = [
  ["Decision traceability", "Every reviewed decision links rationale, authority, evidence, Replay and owner."],
  ["Workflow completion", "The agreed pilot cases complete without an unresolved critical path failure."],
  ["Review accountability", "Every escalation has a named reviewer, disposition and timestamp."],
  ["Evidence portability", "JSON, PDF and Enterprise Summary Trust Evidence Packs can be produced for approved cases."],
  ["Operational usability", "Customer reviewers can locate posture, evidence, next action and limitations without assistance."],
];

const timeline = [
  ["Week 0", "Scope, owners, security boundary and rollback trigger approval."],
  ["Week 1", "Workspace configuration, data mapping and provider readiness review."],
  ["Week 2", "Controlled execution, review-path testing and evidence capture."],
  ["Week 3", "Outcome review, blocker closure and production-readiness decision."],
];

const responsibilities = [
  ["Customer", "Provide accountable owners, approved data, access boundaries, reviewers and timely outcome adjudication."],
  ["Cyber Sentinels", "Configure the bounded workflow, preserve evidence boundaries, support execution and document unresolved limitations."],
  ["Shared", "Approve success criteria, review incidents, rehearse rollback and sign the pilot closeout record."],
];

const rollbackPlan = [
  "Pause new pilot submissions and preserve existing audit records.",
  "Disable affected provider or workflow integration without weakening authorization controls.",
  "Return the source workflow to its documented pre-pilot decision path.",
  "Notify the named customer and Cyber Sentinels support owners.",
  "Export retained evidence, record the rollback reason and require approval before restart.",
];

export default function EnterprisePilotPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Enterprise Pilot"
          title="Prove one accountable decision workflow before expanding."
          bullets={["Select one consequential workflow and responsible owner.", "Agree identity, authority and evidence boundaries.", "Exercise runtime change, governance, Replay and receipt.", "Close with measurable acceptance evidence and next-step ownership."]}
          primary={enterpriseCtas.requestControlledPilot}
          secondary={enterpriseCtas.pilotChecklist}
        />

        <section className="mt-8 operational-panel p-6">
          <p className="operational-eyebrow">Release evidence</p>
          <h2 className="mt-3 text-3xl font-semibold">What is proven—and what still requires execution.</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {releaseEvidence.map(([area, status, detail]) => (
              <article key={area} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-semibold text-zinc-100">{area}</h3>
                  <span className="rounded-full border border-amber-800 px-3 py-1 text-xs text-amber-200">{status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{detail}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-zinc-500">Known limitation: no production accuracy, Live provider, deployed-security or SLA claim is made. Controlled pilot activation requires retained evidence for all four areas.</p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {proofJourney.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="operational-panel p-6">
            <p className="operational-eyebrow">Pilot checklist</p>
            <h2 className="mt-3 text-3xl font-semibold">Evidence before activation.</h2>
            <ol className="mt-5 grid gap-3">
              {pilotChecklist.map((item, index) => (
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
            <dl className="mt-5 grid gap-3">
              {successMetrics.map(([label, detail]) => (
                <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <dt className="font-semibold text-zinc-100">{label}</dt>
                  <dd className="mt-2 text-sm leading-6 text-zinc-400">{detail}</dd>
                </div>
              ))}
            </dl>
          </article>
        </section>

        <section className="mt-8 operational-panel p-6">
          <p className="operational-eyebrow">Deployment timeline</p>
          <h2 className="mt-3 text-3xl font-semibold">Four bounded phases with explicit owners.</h2>
          <ol className="mt-5 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 md:grid-cols-4">
            {timeline.map(([week, detail]) => (
              <li key={week} className="bg-black p-5">
                <p className="font-semibold text-cyan-200">{week}</p>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="operational-panel p-6">
            <p className="operational-eyebrow">Customer responsibilities and support</p>
            <div className="mt-5 grid gap-3">
              {responsibilities.map(([owner, detail]) => (
                <div key={owner} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <h2 className="font-semibold text-zinc-100">{owner}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-400">Support contacts are named during kickoff: customer pilot owner, Cyber Sentinels pilot owner and security escalation owner. No unassigned mailbox is treated as operational ownership.</p>
            <Link href="/enterprise-access?intent=pilot-support" className="mt-4 inline-flex text-sm font-semibold text-cyan-200 hover:text-white">Confirm support contacts →</Link>
          </article>
          <article className="operational-panel p-6">
            <p className="operational-eyebrow">Rollback plan</p>
            <h2 className="mt-3 text-3xl font-semibold">Fail closed and preserve evidence.</h2>
            <ol className="mt-5 grid gap-3 text-sm leading-6 text-zinc-300">
              {rollbackPlan.map((item, index) => <li key={item} className="border-l border-rose-800 pl-4"><span className="font-semibold text-rose-200">{index + 1}. </span>{item}</li>)}
            </ol>
          </article>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Pilot outcomes</p>
            <h2 className="mt-3 text-3xl font-semibold">What a successful pilot should produce.</h2>
            <div className="mt-6 grid gap-3">
              {outcomes.map((item) => (
                <p key={item} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300">
                  {item}
                </p>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-zinc-800 bg-black p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Enterprise proof</p>
            <h2 className="mt-3 text-3xl font-semibold">Show the review path, not a magic score.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              The pilot keeps Verification Evidence, Governance Review, Replay Evidence and Session Integrity visible for practical conversations about fake applicants, proxy interviews and injected sessions.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/trust" className="brand-secondary-action brand-action-large text-sm">Read Trust Framework</Link>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
export const metadata: Metadata = {
  title: "Enterprise Pilot Programme | Cyber Sentinels",
  description: "Pilot one consequential workflow with controlled deployment, governance and Replay evidence.",
  alternates: { canonical: "/enterprise/pilot" },
};
