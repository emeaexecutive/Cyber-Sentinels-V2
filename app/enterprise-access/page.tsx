import type { Metadata } from "next";
import Link from "next/link";
import { EnterpriseAccessForm } from "@/components/turnstile-field";
import { EvidenceDisclaimer } from "@/components/evidence-disclaimer";
import { operationalPilotTemplates } from "@/lib/pilot-templates";

export const metadata: Metadata = {
  title: "Enterprise Access | Cyber Sentinels",
  description: "Request a Cyber Sentinels enterprise demo, design-partner conversation or operational trust pilot.",
  alternates: { canonical: "/enterprise-access" },
};

export const dynamic = "force-dynamic";

export default async function EnterpriseAccessPage({ searchParams }: {
  searchParams?: Promise<{ success?: string; error?: string; intent?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const designPartner = query.intent === "design_partner";
  const introCall = query.intent === "intro_call";
  const demoRequest = query.intent === "demo";
  const trustTeam = query.intent === "trust-team";
  const pilot = query.intent === "pilot";
  const pageTitle = designPartner
    ? "Become a Design Partner"
    : introCall
      ? "Book Intro Call"
      : demoRequest
        ? "Request Enterprise Demo"
        : trustTeam
          ? "Talk to Trust Team"
          : pilot
            ? "Start Pilot"
            : "Request Enterprise Access";
  const buttonLabel = designPartner
    ? "Become a Design Partner"
    : introCall
      ? "Book Intro Call"
      : demoRequest
        ? "Request Enterprise Demo"
        : trustTeam
          ? "Talk to Trust Team"
          : pilot
            ? "Start Pilot"
            : "Request Enterprise Access";

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto grid min-w-0 max-w-6xl gap-8 lg:grid-cols-[1fr_460px]">
        <section className="min-w-0 border-b border-zinc-800 pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Enterprise Access</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Executive Summary</p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">{pageTitle}</h1>
          <ul className="mt-5 grid max-w-2xl gap-3 text-sm leading-6 text-zinc-300 sm:grid-cols-2">
            <li className="border-l border-cyan-900 pl-4">Name the workflow and business decision at risk.</li>
            <li className="border-l border-cyan-900 pl-4">Identify the accountable operational owner.</li>
            <li className="border-l border-cyan-900 pl-4">Agree evidence, authority and provider boundaries.</li>
            <li className="border-l border-cyan-900 pl-4">Define what a provable pilot outcome looks like.</li>
          </ul>
          {designPartner ? (
            <div className="mt-6 rounded-lg border border-cyan-950 bg-black p-4">
              <p className="text-sm font-semibold text-cyan-100">Design partner pilot ask</p>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-300">
                <li>Select one human, AI-agent or enterprise workflow.</li>
                <li>Define its identity, evidence and authorization boundary.</li>
                <li>Review Trust Posture shifts and Replay Timeline continuity.</li>
                <li>Evaluate governance ownership and the final receipt.</li>
              </ul>
            </div>
          ) : null}
          <div className="mt-6 rounded-lg border border-zinc-800 bg-black p-4">
            <p className="text-sm font-semibold text-zinc-100">Operational pilot expectations</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Select one workflow, identify its review owner, agree the evidence boundary,
              review governance and replay together, then evaluate the final receipt with stakeholders.
            </p>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Supported: {operationalPilotTemplates.map((template) => template.name).join(" · ")}
            </p>
          </div>
          <EvidenceDisclaimer className="mt-6 max-w-2xl" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Persistent Trust Posture", "Operational state remains visible as identity, authorization, session and evidence change."],
              ["Governance escalation", "Human authority remains attached to the workflow transition and its rationale."],
              ["Replay continuity", "Replay Timeline, receipts and audit references preserve what changed and why."],
              ["Governed execution", "Teams can see whether human or agent activity is authorized, restricted or awaiting review."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-zinc-800 bg-black p-3">
                <p className="text-xs font-semibold text-zinc-100">{title}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-300">{copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <Link href="/demo" className="brand-secondary-action">View Guided Demo</Link>
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-zinc-800 bg-black p-6">
          {query.success ? <p className="mb-5 rounded-md border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-100">Your request has been received. We will follow up about pilot fit and next steps.</p> : null}
          {query.error ? <p className="mb-5 rounded-md border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-100">Please check the required fields and try again.</p> : null}
          <EnterpriseAccessForm buttonLabel={buttonLabel} designPartner={designPartner} />
        </section>
      </div>
    </main>
  );
}
