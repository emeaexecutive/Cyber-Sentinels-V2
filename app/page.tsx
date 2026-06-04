import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const problemPoints = [
  "Identity ambiguity",
  "Synthetic actors",
  "Fragmented accountability",
  "Opaque workflows",
  "Audit gaps",
  "Governance risks",
];

const trustIndicators = [
  "Governed workflows",
  "Auditability",
  "Evidence-backed review",
  "Human oversight",
  "Explainable trust systems",
  "Privacy-aware architecture",
];

const aiNativeExamples = [
  "AI copilots",
  "Autonomous workflows",
  "Machine-driven operations",
  "AI agents with permissions",
  "Synthetic media systems",
];

const howItWorksFlow = [
  "Identity",
  "Evidence",
  "Verification",
  "Trust Events",
  "Human Review",
  "Audit Trail",
  "Governance Visibility",
];

const infrastructureLayers = [
  [
    "Identity",
    "Who or what is being reviewed, represented or authorized.",
  ],
  [
    "Permissions",
    "What a person, workflow or future agent is allowed to observe, approve or execute.",
  ],
  [
    "Auditability",
    "What happened, when it happened and which review path produced the outcome.",
  ],
  [
    "Provenance",
    "Which evidence, records and signals support the verification state.",
  ],
  [
    "Human Oversight",
    "Where human review, escalation and accountable decision-making remain required.",
  ],
  [
    "Explainability",
    "Why a verification state is strong, weak, incomplete or under review.",
  ],
];

const workflowSteps = [
  [
    "Create Passport",
    "Start with a structured Trust Passport for the person, organization or workflow being reviewed.",
  ],
  [
    "Attach Evidence",
    "Add supporting records so verification is grounded in reviewable material.",
  ],
  [
    "Review",
    "Route sensitive outcomes through governed review instead of opaque automation.",
  ],
  [
    "Record Decision",
    "Capture approval, rejection or request for more evidence with human accountability.",
  ],
  [
    "Preserve Audit Trail",
    "Maintain operational transparency across evidence, decisions, signals and review history.",
  ],
];

const audiences = [
  "AI Platforms",
  "Enterprise Operations",
  "Workforce Verification",
  "High-Risk Workflows",
  "Governance Teams",
  "Trust & Safety Operations",
  "Regulated Environments",
];

const futureDirections = [
  "AI Identity",
  "Trust Events",
  "Agent Verification",
  "Explainable Trust Systems",
  "Governance Workflows",
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
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.28em] text-cyan-200">
            Governed Trust Infrastructure
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight md:text-7xl">
            Cyber Sentinels&trade;
          </h1>
          <p className="mt-6 max-w-4xl text-xl leading-8 text-zinc-200">
            Evidence-backed trust infrastructure for governed verification and
            operational transparency.
          </p>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels helps organizations introduce auditability, human
            oversight and explainable trust workflows into increasingly
            AI-native operations.
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
              View Demo
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            The Problem
          </p>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
            AI-native systems are creating new operational trust gaps.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            As software systems become more autonomous, organizations need a
            clear way to understand who or what is being verified, what evidence
            supports a decision, and how accountability is preserved.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {problemPoints.map((point) => (
            <div
              key={point}
              className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
            >
              {point}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 md:px-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Trust Signals
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trustIndicators.map((indicator) => (
            <div
              key={indicator}
              className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
            >
              {indicator}
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Why Now
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-semibold md:text-4xl">
                The shift to AI-native operations is already underway.
              </h2>
              <p className="mt-4 text-sm leading-7 text-zinc-400">
                AI systems are moving from passive tools to operational actors:
                copilots, autonomous workflows, machine-driven operations,
                permissioned agents and synthetic media systems. That shift
                creates trust gaps, audit gaps, accountability problems and
                governance challenges.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {aiNativeExamples.map((example) => (
                <span
                  key={example}
                  className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300"
                >
                  {example}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          How Cyber Sentinels Works
        </p>
        <h2 className="mt-4 max-w-3xl text-3xl font-semibold md:text-4xl">
          A calm operating flow for governed trust.
        </h2>
        <div className="mt-8 grid gap-3 lg:grid-cols-7">
          {howItWorksFlow.map((step, index) => (
            <div
              key={step}
              className="rounded-lg border border-zinc-800 bg-black p-4"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
                {index + 1}
              </p>
              <p className="mt-3 text-sm font-semibold text-zinc-100">{step}</p>
              {index < howItWorksFlow.length - 1 ? (
                <p className="mt-3 text-xs text-zinc-600">Connects forward</p>
              ) : (
                <p className="mt-3 text-xs text-zinc-600">Makes trust visible</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Why This Matters
        </p>
        <h2 className="mt-4 max-w-3xl text-3xl font-semibold md:text-4xl">
          Trust infrastructure becomes foundational when operations become more
          autonomous.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {infrastructureLayers.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Operational Workflow
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold md:text-4xl">
            Governed verification, from evidence to decision.
          </h2>
          <div className="mt-8 grid gap-3 lg:grid-cols-5">
            {workflowSteps.map(([title, copy], index) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
                  Step {index + 1}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-zinc-100">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:px-8 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-black p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Built for AI-Native Operations
          </p>
          <h2 className="mt-4 text-3xl font-semibold">
            Operational actors need operational trust.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            AI systems are beginning to participate in work as copilots,
            workflow engines and permissioned agents. That creates new
            requirements around provenance, accountability, review paths and
            governance visibility.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Why Human Oversight Matters
          </p>
          <h2 className="mt-4 text-3xl font-semibold">
            High-risk trust outcomes should remain governed.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            Cyber Sentinels does not position autonomous AI decisions as the
            only path for sensitive outcomes. Escalation, review,
            accountability and operational governance remain central to the
            platform direction.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Founder Perspective
          </p>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
            Why Cyber Sentinels exists.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            The rise of AI-native systems introduces a new operational trust
            challenge. Cyber Sentinels is being built to help organizations
            introduce governed trust, auditability and explainable verification
            into increasingly autonomous environments.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/trust-principles"
              className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
            >
              Trust Principles
            </Link>
            <Link
              href="/ai-governance"
              className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
            >
              AI Governance
            </Link>
            <Link
              href="/transparency"
              className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
            >
              Transparency
            </Link>
            <Link
              href="/operational-principles"
              className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
            >
              Operational Principles
            </Link>
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Designed For
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {audiences.map((audience) => (
              <div
                key={audience}
                className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300"
              >
                {audience}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Future Inevitability
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold md:text-4xl">
            Autonomous environments will need explainable trust systems.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Future platform direction includes AI identity, trust events, agent
            verification, explainable trust systems and governance workflows.
            These are early platform direction items, not complete V1 claims.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
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

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="grid gap-6 rounded-lg border border-zinc-800 bg-black p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
              Early Access
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Built for founder-led validation with enterprise teams.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              Cyber Sentinels is onboarding early partners and design
              collaborators for real user testing, strategic conversations and
              governed trust workflow validation. The platform is evolving
              through early operational deployment, feedback and design
              collaboration.
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
              href="mailto:founder@cybersentinels.ai"
              className="rounded-lg border border-zinc-700 px-5 py-3 font-semibold text-zinc-200 hover:border-cyan-500"
            >
              Founder Contact
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 md:px-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Operating Signals
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
