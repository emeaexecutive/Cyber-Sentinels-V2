import type { Metadata } from "next";
import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";
import { enterpriseCtas } from "@/lib/enterprise-experience";

const buyerJourneys = [
  {
    role: "CISO",
    problem: "Blind spots persist between authentication and consequential action.",
    mechanism: "Authority, evidence, policy and runtime change are evaluated before execution.",
    proof: "Replay, evidence lineage, human review and explicit limitations remain inspectable.",
  },
  {
    role: "CIO / CTO",
    problem: "Trust controls cannot require replacement of systems of record.",
    mechanism: "A vendor-agnostic Trust Fabric and normalized adapters sit beside existing workflows.",
    proof: "Provider state, deployment boundaries, failure behavior and exportable evidence remain explicit.",
  },
  {
    role: "Compliance",
    problem: "Decision rationale becomes disconnected from accountable evidence.",
    mechanism: "Policy, authority, evidence, Replay and governance remain connected in one record.",
    proof: "Trust Evidence Packs support JSON, PDF and Enterprise Summary review formats.",
  },
  {
    role: "CEO / Investor",
    problem: "Intelligent systems create accountability risk beyond identity and access.",
    mechanism: "Operational Trust Infrastructure governs consequential human and machine actions.",
    proof: "Readiness claims stay bounded by measured product, pilot and provider evidence.",
  },
];

const adoptionPath = [
  ["Category promise", "Identify the consequential workflow and accountable business outcome."],
  ["Mechanism review", "Inspect identity, authority, evidence, decision and runtime boundaries."],
  ["Proof review", "Review Replay, Trust Memory, provider state, limitations and readiness evidence."],
  ["Controlled pilot", "Validate one bounded workflow with named owners and measurable acceptance criteria."],
  ["Production gate", "Proceed only when security, provider, performance and validation evidence is retained."],
];

const readiness = [
  ["Validation", "Blocked", "Approved-only metric gates exist; reviewed ground truth is still required."],
  ["Provider", "Awaiting Credentials", "The Hopae path is implemented; a retained target run is still required."],
  ["Security", "Blocked", "Source controls exist; deployed authorization, RLS and tenant-denial proof is still required."],
  ["Performance", "Awaiting Data", "Durable telemetry exists; representative target samples are still required."],
];

export default function EnterpriseBuyerDocumentationPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Buyer Documentation"
          title="One evidence-backed buying path for every enterprise stakeholder."
          bullets={[
            "Start with one consequential workflow.",
            "Inspect the same authority and evidence boundaries.",
            "Keep readiness claims tied to retained proof.",
            "End with a controlled pilot and named ownership.",
          ]}
          primary={enterpriseCtas.requestDemo}
          secondary={enterpriseCtas.bookPilot}
        />

        <section className="mt-8">
          <p className="operational-eyebrow">Stakeholder journeys</p>
          <h2 className="mt-3 text-3xl font-semibold">Different buying questions. One governed decision record.</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {buyerJourneys.map((journey) => (
              <article key={journey.role} className="operational-card p-6">
                <h3 className="text-2xl font-semibold text-zinc-100">{journey.role}</h3>
                <dl className="mt-5 grid gap-4 text-sm leading-6">
                  <div>
                    <dt className="font-semibold text-cyan-200">Buying problem</dt>
                    <dd className="mt-1 text-zinc-400">{journey.problem}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-cyan-200">Cyber Sentinels mechanism</dt>
                    <dd className="mt-1 text-zinc-400">{journey.mechanism}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-cyan-200">Evidence available</dt>
                    <dd className="mt-1 text-zinc-400">{journey.proof}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Adoption sequence</p>
          <h2 className="mt-3 text-3xl font-semibold">From evaluation to a production-gate decision.</h2>
          <ol className="mt-6 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 lg:grid-cols-5">
            {adoptionPath.map(([title, detail], index) => (
              <li key={title} className="bg-black p-5">
                <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Current evidence boundary</p>
          <h2 className="mt-3 text-3xl font-semibold">Readiness remains explicit before a pilot starts.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {readiness.map(([area, status, detail]) => (
              <article key={area} className="rounded-lg border border-zinc-800 bg-black p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-semibold text-zinc-100">{area}</h3>
                  <span className="rounded-full border border-amber-800 px-3 py-1 text-xs text-amber-200">{status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{detail}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={enterpriseCtas.requestDemo.href} className="brand-primary-action brand-action-large text-sm">
              {enterpriseCtas.requestDemo.label}
            </Link>
            <Link href={enterpriseCtas.pilotChecklist.href} className="brand-secondary-action brand-action-large text-sm">
              {enterpriseCtas.pilotChecklist.label}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: "Enterprise Buyer Documentation | Cyber Sentinels",
  description: "Buyer journeys, evidence boundaries and the controlled enterprise adoption path.",
  alternates: { canonical: "/enterprise/buyer-documentation" },
};
