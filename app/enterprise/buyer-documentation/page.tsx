import type { Metadata } from "next";
import Link from "next/link";
import { EnterpriseBreadcrumbs } from "@/components/enterprise-breadcrumbs";
import { EnterpriseCTAGroup } from "@/components/enterprise-cta-group";
import { BuyerJourneyGrid, type BuyerJourney } from "@/components/enterprise-visuals";
import { ExecutiveSummary } from "@/components/executive-summary";
import { enterpriseCtas } from "@/lib/enterprise-experience";

const buyerActions: BuyerJourney["actions"] = [
  enterpriseCtas.requestDemo,
  enterpriseCtas.bookPilot,
  enterpriseCtas.contactEnterprise,
];

const buyerJourneys: BuyerJourney[] = [
  {
    id: "ciso",
    role: "CISO",
    answers: [
      { question: "Buying problem", answer: "Blind spots persist between authentication and consequential action." },
      { question: "Why Cyber Sentinels", answer: "Authority, evidence, policy and runtime change are evaluated before execution." },
      { question: "Trust evidence", answer: "Replay, evidence lineage, human review and explicit limitations remain inspectable." },
    ],
    actions: buyerActions,
  },
  {
    id: "cio-cto",
    role: "CIO / CTO",
    answers: [
      { question: "Buying problem", answer: "Trust controls cannot require replacement of systems of record." },
      { question: "Why Cyber Sentinels", answer: "A vendor-agnostic Trust Fabric and normalized adapters sit beside existing workflows." },
      { question: "Trust evidence", answer: "Provider state, deployment boundaries, failure behavior and exportable evidence remain explicit." },
    ],
    actions: buyerActions,
  },
  {
    id: "compliance",
    role: "Compliance",
    answers: [
      { question: "Buying problem", answer: "Decision rationale becomes disconnected from accountable evidence." },
      { question: "Why Cyber Sentinels", answer: "Policy, authority, evidence, Replay and governance remain connected in one record." },
      { question: "Trust evidence", answer: "Trust Evidence Packs support JSON, PDF and Enterprise Summary review formats." },
    ],
    actions: buyerActions,
  },
  {
    id: "ceo-investor",
    role: "CEO / Investor",
    answers: [
      { question: "Buying problem", answer: "Intelligent systems create accountability risk beyond identity and access." },
      { question: "Why Cyber Sentinels", answer: "Operational Trust Infrastructure governs consequential human and machine actions." },
      { question: "Trust evidence", answer: "Evidence-defined readiness, explicit blockers and controlled pilot outcomes." },
    ],
    actions: buyerActions,
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

const evidenceTypes = [
  ["Replay", "A chronological account of the evidence, authority, runtime change and governance action behind a decision."],
  ["Evidence lineage", "Provider state, source references and deployment boundaries remain connected to the reviewed workflow."],
  ["Human review", "Escalations retain a named reviewer, disposition, rationale and timestamp."],
  ["Trust Evidence Packs", "Approved cases can produce JSON, PDF and Enterprise Summary formats without hiding limitations."],
];

export default function EnterpriseBuyerDocumentationPage() {
  return (
    <main className="operational-shell min-h-screen px-4 py-10 text-white sm:px-6 md:px-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <EnterpriseBreadcrumbs current="Buyer Documentation" />
        <ExecutiveSummary
          eyebrow="Buyer Documentation"
          title="One evidence-backed buying path for every enterprise stakeholder."
          description="Review the buying problem, operating model and evidence boundary for a controlled Cyber Sentinels deployment without leaving the product experience."
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
          <div className="mt-6">
            <BuyerJourneyGrid journeys={buyerJourneys} />
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
          <p className="operational-eyebrow">Trust evidence</p>
          <h2 className="mt-3 text-3xl font-semibold">Proof stays connected to the decision and its limitations.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {evidenceTypes.map(([title, detail]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{detail}</p>
              </article>
            ))}
          </div>
          <h3 className="mt-8 text-xl font-semibold text-zinc-100">Current evidence boundary</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Readiness remains explicit before a pilot starts.</p>
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
          <div className="mt-6 rounded-lg border border-cyan-950 bg-black p-5">
            <h3 className="text-lg font-semibold text-zinc-100">Continue to deployment planning</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Review prerequisites, owners, success measures and rollback controls before requesting a pilot.
            </p>
            <Link href={enterpriseCtas.pilotChecklist.href} className="brand-secondary-action brand-action-large mt-4 min-h-11 w-full text-sm sm:w-auto">
              Open {enterpriseCtas.pilotChecklist.label}
            </Link>
          </div>
        </section>

        <section className="mt-8 operational-panel p-6 md:p-8" aria-labelledby="buyer-next-steps">
          <p className="operational-eyebrow">Enterprise next steps</p>
          <h2 id="buyer-next-steps" className="mt-3 max-w-3xl text-3xl font-semibold">Choose the next conversation for your evaluation.</h2>
          <div className="mt-6">
            <EnterpriseCTAGroup label="Buyer documentation next steps" />
          </div>
        </section>
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: "Enterprise Buyer Documentation | Cyber Sentinels",
  description: "See how Cyber Sentinels supports CISOs, CIOs, CTOs, compliance leaders, CEOs and investors through operational trust evidence and controlled deployment.",
  alternates: { canonical: "/enterprise/buyer-documentation" },
  openGraph: {
    type: "website",
    url: "/enterprise/buyer-documentation",
    title: "Enterprise Buyer Documentation | Cyber Sentinels",
    description: "See how Cyber Sentinels supports CISOs, CIOs, CTOs, compliance leaders, CEOs and investors through operational trust evidence and controlled deployment.",
    siteName: "Cyber Sentinels",
  },
};
