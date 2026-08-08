import type { Metadata } from "next";
import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";
import { defaultTrustPolicies, evaluateTrustPolicy } from "@/lib/policy-engine";

const coordinationLayers = [
  {
    title: "People",
    detail: "Actionable accountability for human owners, reviewers and incident coordinators.",
  },
  {
    title: "AI Agents",
    detail: "Provider-neutral agent participation remains visible, attributable and bounded by policy.",
  },
  {
    title: "Authority",
    detail: "Authority lineage stays explicit so review can ask who had the power to act.",
  },
  {
    title: "Evidence",
    detail: "Evidence is cited, versioned and linked to the decision record rather than hidden in a dashboard.",
  },
  {
    title: "Replay",
    detail: "Every outcome has a replayable chronology that can be independently examined.",
  },
  {
    title: "Recommendations",
    detail: "Recommended actions remain grounded in the current evidence and reviewer context.",
  },
] as const;

const canonicalServices = [
  "Trust Fabric™",
  "Replay™",
  "Trust Memory™",
  "Evidence Graph™",
  "Authority Lineage™",
  "Enterprise Decision History™",
  "Operational Trust™",
  "Trust Journey™",
  "Trust Decision Intelligence™",
] as const;

const executiveModeFacts = [
  { label: "Known facts", value: "A governed workflow can be reviewed from identity through outcome without switching systems." },
  { label: "Evidence", value: "Policy evaluation, replay context and review routing remain attached to the same decision narrative." },
  { label: "Unknowns", value: "Any missing evidence is called out plainly instead of inferred as proof." },
  { label: "Open risks", value: "Freshness and provider confidence still require explicit human review when thresholds are crossed." },
  { label: "Recommended actions", value: "Route the workflow to the named reviewer, preserve replay evidence and record the outcome." },
  { label: "Confidence", value: "High for explainability and lower where evidence is incomplete." },
] as const;

const designPartnerFlow = [
  "Identity",
  "Authority",
  "Evidence",
  "Operational Trust",
  "Incident",
  "Replay™",
  "Trust Memory™",
  "Correction",
  "Recovery",
  "Recommendation™",
  "Executive Summary™",
] as const;

const investorAnswer = [
  "The platform becomes infrastructure because it is not a standalone AI detector; it coordinates existing enterprise trust records and replayable evidence into one explainable decision surface.",
  "Customer-owned history, trust memory, replay and authority lineage accumulate over time, making the platform more valuable as the organization uses it operationally.",
];

const futureModelReadiness = [
  "Model registry",
  "Evaluation registry",
  "Prompt versioning",
  "Grounding contracts",
  "Evidence citation framework",
  "Reviewer feedback capture",
  "Benchmark framework",
] as const;

export default function EnterpriseTrustPlatformPage() {
  const previewPolicy = defaultTrustPolicies[0];
  const previewEvaluation = evaluateTrustPolicy(previewPolicy, {
    workflowId: "epic-36-preview",
    workflowType: "candidate",
    trustScore: 61,
    providerConfidence: 68,
    sessionIntegrity: 72,
    daysSinceLastEvidence: 18,
    anomalyCount: 1,
    evidenceReferences: ["Provider evidence", "Session continuity", "Replay chronology"],
  });

  return (
    <main className="min-h-screen bg-[#05080d] px-6 py-12 text-white md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <ExecutiveSummary
          eyebrow="EPIC 36 / Enterprise Trust Platform™"
          title="Coordinate enterprise trust across people, agents, evidence and authority without duplicating the canonical systems."
          description="This experience consumes the existing Trust Fabric, Replay, Trust Memory, Evidence Graph, Authority Lineage, decision history and operational trust services."
          bullets={[
            "One coordinated view for enterprise trust operations, executive review and design-partner walkthroughs.",
            "Executive mode summarizes facts, evidence, unknowns, risks, actions and confidence in a single frame.",
            "Design-partner mode exposes a controlled path from identity through recommendation without internal implementation detail.",
            "Investor mode shows why this becomes infrastructure through accumulated customer-owned operational history rather than marketing language alone.",
          ]}
          primary={{ href: "/enterprise", label: "Go to enterprise hub" }}
          secondary={{ href: "/enterprise/operations", label: "Open enterprise operations" }}
        />

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Enterprise Trust Coordination™</p>
              <h2 className="mt-3 text-2xl font-semibold">A coordinated enterprise view that answers what happened, why, who was responsible and what action is recommended.</h2>
            </div>
            <Link href="/trust-replay" className="brand-secondary-action">Open replay chronology</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {coordinationLayers.map((layer) => (
              <article key={layer.title} className="rounded-xl border border-zinc-800 bg-black/70 p-4">
                <p className="text-sm font-semibold text-cyan-200">{layer.title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{layer.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Canonical services in use</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {canonicalServices.map((service) => (
                <div key={service} className="rounded-lg border border-zinc-800 bg-black/50 p-3 text-sm text-zinc-300">
                  {service}
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-zinc-400">Every capability in this page points back to an existing canonical surface so there is no duplicate trust engine or parallel dashboard state.</p>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Policy preview</p>
            <h3 className="mt-3 text-xl font-semibold">{previewPolicy.name}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{previewEvaluation.explanation}</p>
            <div className="mt-4 rounded-lg border border-cyan-950 bg-cyan-950/20 p-4 text-sm text-cyan-100">
              <p className="font-semibold">Route: {previewEvaluation.route.replaceAll("_", " ")}</p>
              <p className="mt-2">Reviewer: {previewEvaluation.governanceRouting.assignedReviewer}</p>
              <p className="mt-2">Evidence references: {previewEvaluation.replayContext.evidenceReferences.join(", ")}</p>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Executive Mode</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {executiveModeFacts.map((item) => (
              <article key={item.label} className="rounded-xl border border-zinc-800 bg-black/60 p-4">
                <p className="text-sm font-semibold text-zinc-100">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Design Partner Mode</p>
          <h2 className="mt-3 text-2xl font-semibold">One controlled experience from identity to executive summary.</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {designPartnerFlow.map((step) => (
              <span key={step} className="rounded-full border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-zinc-300">
                {step}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Investor Mode</p>
          <h2 className="mt-3 text-2xl font-semibold">Why this becomes infrastructure rather than another AI security product.</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {investorAnswer.map((answer) => (
              <article key={answer} className="rounded-xl border border-zinc-800 bg-black/60 p-4 text-sm leading-7 text-zinc-300">
                {answer}
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">AI boundary</p>
            <p className="mt-3 text-sm leading-7 text-zinc-400">Provider-neutral assistance is permitted, but it never changes trust, authority, evidence, policy or approval outcomes. Every AI response must either cite existing evidence or clearly state that evidence is unavailable.</p>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Future model readiness</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {futureModelReadiness.map((item) => (
                <div key={item} className="rounded-lg border border-zinc-800 bg-black/50 p-3 text-sm text-zinc-300">
                  {item}
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: "Enterprise Trust Platform | Cyber Sentinels",
  description: "Epic 36 coordination view for enterprise trust across people, agents, authority, evidence, replay and executive summary.",
  alternates: { canonical: "/enterprise/trust-platform" },
};
