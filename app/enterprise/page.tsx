import type { Metadata } from "next";
import Link from "next/link";
import { BuyerJourneyGrid, type BuyerJourney } from "@/components/enterprise-visuals";
import { ExecutiveSummary } from "@/components/executive-summary";
import { enterpriseCtas } from "@/lib/enterprise-experience";

const buyerJourneys: BuyerJourney[] = [
  {
    id: "ciso",
    role: "CISO",
    answers: [
      { question: "Why?", answer: "Reduce blind spots between authentication and consequential action." },
      { question: "How?", answer: "Evaluate authority, evidence, policy and runtime change before execution." },
      { question: "Different?", answer: "Trust stays governed before, during and after the action." },
      { question: "Trust it?", answer: "Replay, evidence lineage, human review and limitations remain inspectable." },
    ],
    actions: [
      enterpriseCtas.requestDemo,
      enterpriseCtas.bookPilot,
      enterpriseCtas.buyerDocumentation,
    ],
  },
  {
    id: "cio-cto",
    role: "CIO / CTO",
    answers: [
      { question: "Why?", answer: "Add operational trust without replacing systems of record." },
      { question: "How?", answer: "Use one API contract and replaceable provider adapters beside existing workflows." },
      { question: "Different?", answer: "Enterprise Trust Fabric™ connects identity, authority, decision and proof." },
      { question: "Trust it?", answer: "Provider state, deployment boundary and failure behavior stay explicit." },
    ],
    actions: [
      enterpriseCtas.requestDemo,
      enterpriseCtas.bookPilot,
      enterpriseCtas.buyerDocumentation,
    ],
  },
  {
    id: "compliance",
    role: "Compliance",
    answers: [
      { question: "Why?", answer: "Keep decision rationale connected to evidence and accountable ownership." },
      { question: "How?", answer: "Retain policy, authority, evidence, Replay and governance in one record." },
      { question: "Different?", answer: "Trust Evidence Packs make operational decisions portable for review." },
      { question: "Trust it?", answer: "Unknown evidence remains unknown; no compliance guarantee is inferred." },
    ],
    actions: [
      enterpriseCtas.requestDemo,
      enterpriseCtas.bookPilot,
      enterpriseCtas.buyerDocumentation,
    ],
  },
  {
    id: "ceo-investor",
    role: "CEO / Investor",
    answers: [
      { question: "Why?", answer: "Intelligent enterprises need accountability beyond identity and access." },
      { question: "How?", answer: "Operational Trust Infrastructure governs critical human and machine actions." },
      { question: "Different?", answer: "A vendor-agnostic trust layer links authority, evidence, decisions and memory." },
      { question: "Trust it?", answer: "Readiness claims stay bounded by measured product, pilot and provider evidence." },
    ],
    actions: [
      enterpriseCtas.requestDemo,
      enterpriseCtas.bookPilot,
      enterpriseCtas.buyerDocumentation,
    ],
  },
];

const readiness = [
  ["deployment", "Deployment", "Pilot scope, environments, production gates and operational ownership."],
  ["compliance", "Compliance", "Evidence continuity and review records for customer control mapping."],
  ["sso-scim", "SSO / SCIM", "Enterprise identity integration verified for the selected deployment."],
  ["data-residency", "Data Residency", "Regional, retention and provider boundaries agreed before production."],
  ["support", "Enterprise Support", "Named owners for onboarding, escalation and evidence review."],
  ["procurement", "Procurement & Legal", "Security, privacy, capability and contractual boundaries ready for review."],
];

const adoptionSteps = ["Choose one workflow", "Agree evidence and authority", "Validate in pilot", "Review production gates"];

export default function EnterprisePage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Enterprise"
          title="Adopt operational trust one governed workflow at a time."
          bullets={["Deploy beside existing systems.", "Give security, risk and compliance one evidence record.", "Assign every escalation to an owner.", "Verify production boundaries before launch."]}
          primary={enterpriseCtas.bookPilot}
          secondary={enterpriseCtas.buyerDocumentation}
        />

        <section className="mt-8">
          <p className="operational-eyebrow">Buying journeys</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold">Four stakeholders. One operational trust decision record.</h2>
          <div className="mt-6"><BuyerJourneyGrid journeys={buyerJourneys} /></div>
        </section>

        <section className="mt-8 operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Controlled adoption</p>
          <h2 className="mt-3 text-2xl font-semibold">A bounded path from workflow selection to production review.</h2>
          <ol className="mt-6 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 md:grid-cols-4">
            {adoptionSteps.map((step, index) => (
              <li key={step} className="bg-black p-5">
                <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 font-semibold text-zinc-100">{step}</h3>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">Deployment and buying readiness</p>
          <h2 className="mt-3 text-2xl font-semibold">The controls enterprise stakeholders need to proceed.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {readiness.map(([id, title, copy]) => (
              <article id={id} key={id} className="scroll-mt-28 operational-card p-5">
                <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/security" className="inline-flex text-sm font-semibold text-cyan-200 hover:text-white">Review security controls →</Link>
            <Link href="/enterprise/trust-platform" className="inline-flex text-sm font-semibold text-cyan-200 hover:text-white">Open Epic 36 coordination view →</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: "Enterprise | Cyber Sentinels",
  description: "Deployment, security, compliance, data residency, pilot adoption, procurement and enterprise support.",
  alternates: { canonical: "/enterprise" },
};
