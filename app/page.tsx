import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const platformCapabilities = [
  [
    "Create Trust Passports",
    "Establish a structured trust record for people, organisations and high-risk workflows.",
  ],
  [
    "Evidence-Backed Review",
    "Attach supporting records so verification decisions are grounded in reviewable evidence.",
  ],
  [
    "Governed Verification",
    "Support human oversight, review states and decision history for sensitive outcomes.",
  ],
  [
    "Audit Visibility",
    "Maintain traceable records of evidence uploads, decisions, signals and workflow changes.",
  ],
  [
    "Trust Relationships",
    "Visualise how passports, evidence, reviews and operational signals connect.",
  ],
  [
    "Operational Risk Governance",
    "Help teams understand what needs review, what is blocked and what requires escalation.",
  ],
];

const useCases = [
  [
    "Workforce Verification",
    "Verify workforce identity, evidence and status across onboarding or ongoing review.",
    "Reduce review ambiguity and support consistent workforce trust decisions.",
  ],
  [
    "Contractor & Vendor Trust",
    "Track evidence and review status for external parties involved in sensitive operations.",
    "Improve third-party visibility without relying on informal approvals.",
  ],
  [
    "Executive Verification",
    "Create evidence-backed review records for high-profile identity and authority checks.",
    "Support confidence in sensitive leadership, access or representation workflows.",
  ],
  [
    "AI Agent Governance",
    "Map what agents or workflows are allowed to observe, advise, approve or execute.",
    "Keep autonomy tied to approval, evidence and audit visibility.",
  ],
  [
    "Operational Auditability",
    "Record what happened, when it happened and which review workflow produced it.",
    "Make operational trust decisions explainable for internal and external review.",
  ],
  [
    "High-Risk Workflow Review",
    "Require evidence, approval and audit history before important actions proceed.",
    "Reduce uncontrolled execution in sensitive business processes.",
  ],
  [
    "Digital Trust Operations",
    "Centralise trust passports, evidence, decisions, signals and notifications.",
    "Give teams one governed view of verification and trust operations.",
  ],
];

const industries = [
  "Financial Services",
  "Cybersecurity",
  "AI Platforms",
  "Enterprise SaaS",
  "Regulated Operations",
  "Recruitment & Workforce",
  "Compliance Teams",
  "Government & Public Sector",
];

const architectureLayers = [
  "Identity Layer",
  "Evidence Layer",
  "Verification Layer",
  "Audit Layer",
  "Governance Layer",
  "Intelligence Layer",
];

const principles = [
  "Human Oversight",
  "Evidence-First Verification",
  "Explainability",
  "Auditability",
  "Privacy-Aware Architecture",
  "Responsible AI Assistance",
];

const trustProblems = [
  "Identity ambiguity",
  "Synthetic actors",
  "Fragmented accountability",
  "Opaque workflows",
  "Audit gaps",
  "Governance risks",
];

const designedFor = [
  [
    "AI Platforms",
    "Teams building AI-native systems that need identity, intent and review accountability.",
  ],
  [
    "Enterprise Operations",
    "Operational teams that need clearer verification workflows and decision traceability.",
  ],
  [
    "Workforce Verification",
    "Organizations reviewing employees, contractors or sensitive workforce access.",
  ],
  [
    "High-Risk Workflows",
    "Processes where approval, evidence and audit history should be visible before action.",
  ],
  [
    "Governance Teams",
    "Leaders responsible for oversight, review processes and accountable decisions.",
  ],
  [
    "Trust & Safety Operations",
    "Teams managing identity, evidence, escalation and review outcomes.",
  ],
  [
    "Regulated Environments",
    "Organizations that need careful records, human oversight and audit-ready workflows.",
  ],
];

const futureDirections = [
  "AI agent identity",
  "Trust events",
  "Explainable trust systems",
  "Governance workflows",
];

const metrics = [
  ["passports", "Passports"],
  ["evidence_files", "Evidence Files"],
  ["audit_logs", "Audit Events"],
  ["verification_cases", "Verification Cases"],
];

async function liveCount(table: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  return { count: count ?? 0, available: !error };
}

export default async function HomePage() {
  const liveMetrics = await Promise.all(
    metrics.map(async ([table, label]) => ({
      table,
      label,
      ...(await liveCount(table)),
    }))
  );

  return (
    <main className="min-h-screen bg-[#04070c] text-white">
      <section className="border-b border-zinc-900 px-6 py-20 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-[0.28em] text-cyan-200">
            Enterprise Trust Platform
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight md:text-7xl">
            Cyber Sentinels™
          </h1>
          <p className="mt-6 max-w-4xl text-xl leading-8 text-zinc-200">
            Governed trust infrastructure for identity, workforce, AI and
            operational verification.
          </p>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels helps organisations manage evidence-backed review,
            auditability, operational transparency and responsible AI assistance
            through a calm Trust OS environment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/enterprise-access"
              className="rounded-lg bg-white px-5 py-3 font-semibold text-black hover:bg-cyan-100"
            >
              Request Enterprise Access
            </Link>
            <Link
              href="/demo"
              className="rounded-lg border border-cyan-800 px-5 py-3 font-semibold text-cyan-100 hover:border-cyan-400"
            >
              Explore Trust OS
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
              Why Cyber Sentinels Exists
            </p>
            <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
              AI-native systems create new trust problems.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              As organizations adopt AI-assisted workflows, identity, evidence,
              approval and accountability can become harder to verify. Cyber
              Sentinels exists to make trust review more evidence-backed,
              governed and understandable.
            </p>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              The platform is built around operational transparency, auditability
              and human oversight for decisions that should not disappear inside
              opaque systems.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {trustProblems.map((problem) => (
              <div
                key={problem}
                className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
              >
                {problem}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-12 md:grid-cols-4 md:px-8">
        {[
          ["Enterprise trust", "Evidence-backed verification for sensitive business workflows."],
          ["Operational transparency", "Clear status, decisions, audit history and next actions."],
          ["Governed workflows", "Human oversight for high-risk trust and AI-assisted review."],
          ["Auditability", "Traceable records for accountability, review and governance."],
        ].map(([title, copy]) => (
          <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
          </article>
        ))}
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Platform Capabilities
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {platformCapabilities.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:px-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Designed For
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {designedFor.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:px-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Who Cyber Sentinels Is For
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {useCases.map(([title, useCase, value]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{useCase}</p>
              <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-500">
                {value}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Industries
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {industries.map((industry) => (
              <span
                key={industry}
                className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300"
              >
                {industry}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:px-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          The Cyber Sentinels Trust OS™
        </p>
        <div className="mt-6 grid gap-3 lg:grid-cols-6">
          {architectureLayers.map((layer, index) => (
            <div key={layer} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
                Layer {index + 1}
              </p>
              <h2 className="mt-3 text-lg font-semibold text-zinc-100">{layer}</h2>
              {index < architectureLayers.length - 1 ? (
                <p className="mt-3 text-sm text-zinc-600">Feeds governed trust visibility</p>
              ) : (
                <p className="mt-3 text-sm text-zinc-600">Supports operational intelligence</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Core Principles
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {principles.map((principle) => (
              <article key={principle} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h2 className="text-lg font-semibold text-zinc-100">{principle}</h2>
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {[
              ["/trust-principles", "Trust Principles"],
              ["/ai-governance", "AI Governance"],
              ["/transparency", "Transparency"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:px-8">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Future Platform Direction
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Roadmap concepts, not V1 claims.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels is exploring future infrastructure for AI identity,
            trust event pipelines, explainable trust systems and governed
            workflow oversight. These are future platform direction items and
            should not be treated as fully operational V1 modules.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {futureDirections.map((item) => (
              <span
                key={item}
                className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:px-8">
        <div className="grid gap-6 rounded-lg border border-zinc-800 bg-black p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
              Founder Contact
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Interested in collaboration or early access?
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              Cyber Sentinels is currently onboarding early partners and design
              collaborators for founder-led discovery, demos and validation.
              Contact founder@cybersentinels.ai or request access to start the
              conversation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/enterprise-access"
              className="rounded-lg bg-white px-5 py-3 font-semibold text-black hover:bg-cyan-100"
            >
              Request Enterprise Access
            </Link>
            <Link
              href="/demo"
              className="rounded-lg border border-cyan-800 px-5 py-3 font-semibold text-cyan-100 hover:border-cyan-400"
            >
              Explore Trust OS
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14 md:px-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          System Metrics
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {liveMetrics.map((metric) => (
            <div key={metric.table} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                {metric.label}
              </p>
              <p className="mt-4 text-4xl font-semibold">
                {metric.available ? metric.count : "n/a"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
