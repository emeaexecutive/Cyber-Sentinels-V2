import Link from "next/link";
import { TrustOpsOperatingStack } from "@/components/trustops-operating-stack";

const proofPath = [
  "Person, agent or workflow enters",
  "Identity, session and evidence checked",
  "Trust changes over time",
  "Governance intervenes",
  "Replay explains why",
  "Receipt preserves the outcome",
];

const platformSurfaces = [
  ["Replayable Operational Memory", "The foundational chronology of what entered, what changed, which authority acted, what evidence existed and why the outcome followed."],
  ["Persistent Trust Posture", "The current, explainable state of identity, authorization, evidence and workflow context."],
  ["Governed Workflows", "Human and agent activity stays inside visible authority, evidence and review boundaries."],
  ["Workflow Verification", "The actor, work performed, evidence and operational outcome remain connected."],
];

const workflowDomains = [
  ["Human identity", "Continuous verification and reviewable trust posture."],
  ["AI agents and NHI", "Registered agents, service accounts and API actors retain ownership, bounded authority and governed execution."],
  ["Enterprise workflows", "Evidence continuity from entry through final outcome."],
  ["Authorization events", "Grants, changes and revocations retain accountable lineage."],
  ["Governance actions", "Review, escalation and intervention remain attached to operational history."],
  ["Enterprise AI sovereignty", "Customer data, workflow memory and operational IP remain under governed enterprise control."],
];

export default function Home() {
  return (
    <main className="operational-shell min-h-screen text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-12 md:px-8 md:pb-20 md:pt-20">
        <div className="max-w-4xl">
          <p className="operational-eyebrow">
            TrustOps infrastructure.
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
            Operational trust for intelligent systems.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200 md:text-xl md:leading-9">
            Trust is not a moment. It is a continuous operational state.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels is the operational trust infrastructure layer for
            humans, AI agents and enterprise workflows. It keeps identity,
            authority, execution, evidence and governance connected so teams can
            verify critical work and explain the outcome.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3">
          <Link href="/verification-replay" className="brand-primary-action brand-action-large text-sm">
            Experience Replay
          </Link>
          <Link href="/enterprise-access" className="brand-secondary-action brand-action-large text-sm">
            Request Enterprise Access
          </Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <div className="max-w-3xl">
            <p className="operational-eyebrow">
              Proof workflow
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
              Trust changes over time.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              Replayable evidence for critical workflows. One chronology shows
              what changed, why trust shifted and which outcome followed.
            </p>
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-6">
            {proofPath.map((step, index) => (
              <div key={step} className="border-t border-zinc-700 pt-4">
                <p className="text-xs font-semibold text-cyan-200">{index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="max-w-3xl">
          <p className="operational-eyebrow">
            TrustOps platform
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
            Governed trust continuity for intelligent systems.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Persistent Trust Posture shows what is true now. Replay is the
            operational memory of how it became true: chronology, authorization
            changes, evidence continuity, governance action and final outcome.
          </p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {platformSurfaces.map(([title, copy]) => (
            <article key={title} className="operational-card p-5">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-zinc-950/60">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <p className="operational-eyebrow">TrustOps operating stack</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-white">
            Eight layers. One governed operational record.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Identity, runtime context, authority, evidence and governance remain
            connected through Replay and continuously reflected in trust posture.
          </p>
          <div className="mt-7">
            <TrustOpsOperatingStack compact />
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <p className="operational-eyebrow">Operational domains</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-white">
            One trust layer, across human and machine activity.
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workflowDomains.map(([title, copy]) => (
              <article key={title} className="operational-card p-5">
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
              </article>
            ))}
          </div>
          <p className="mt-7 max-w-4xl text-sm leading-7 text-zinc-400">
            Apply the same continuity model to claims, underwriting, customer
            onboarding, hiring and high-impact workflow approvals: verify the
            actor, preserve delegated authority, govern execution and retain the
            operational chronology behind the decision.
          </p>
        </div>
      </section>

    </main>
  );
}
