import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cyber Sentinels Architecture",
  description:
    "The current architecture, maturity boundaries and long-term stack direction for Cyber Sentinels.",
};

const currentStack = [
  {
    label: "Frontend",
    value: "Next.js, React, TypeScript",
    detail: "Server-rendered product, trust and enterprise workflow surfaces.",
  },
  {
    label: "Styling / UI",
    value: "Tailwind CSS, enterprise UI components, Lucide-style icons",
    detail: "Responsive dark-mode interfaces designed for operational clarity.",
  },
  {
    label: "Backend",
    value: "Supabase, PostgreSQL, Auth, RLS, API routes",
    detail: "Application data, authenticated access and server-side workflow endpoints.",
  },
  {
    label: "Hosting",
    value: "Vercel",
    detail: "Managed deployment for the Next.js application and API routes.",
  },
  {
    label: "Verification Layer",
    value: "Provider-orchestrated integrations",
    detail: "External evidence can be normalized without making one provider the decision authority.",
  },
  {
    label: "Security",
    value: "RLS, protected routes, admin separation, audit events",
    detail: "Layered access controls and visible operational accountability.",
  },
];

const primitives = [
  "Trust Engine",
  "Replay Engine",
  "Governance Layer",
  "Evidence Chronology",
  "Authorization Lineage",
  "Workflow Trust Posture",
  "Receipts",
  "Trust Memory",
  "Provider Adapters",
  "ATS Integration Layer",
  "Webhook Receivers",
  "Trust APIs",
];

const providers = [
  "World ID",
  "Stripe Identity",
  "Persona",
  "Entrust",
  "Cloudflare Turnstile",
  "Device fingerprinting providers",
  "Liveness providers",
  "Biometric verification providers",
  "Future AI-agent identity systems",
  "Provenance systems",
];

const maturity = [
  {
    title: "Real Today",
    tone: "border-emerald-900/80",
    indicator: "bg-emerald-400",
    items: [
      "Next.js app",
      "Supabase backend",
      "Auth",
      "Dashboards",
      "Governance concepts",
      "Replay structure",
      "Receipts",
      "Provider orchestration",
      "Trust workflows",
    ],
  },
  {
    title: "Partially Real",
    tone: "border-amber-900/80",
    indicator: "bg-amber-300",
    items: [
      "Trust scoring",
      "Trust continuity",
      "Replayable operational trust",
      "Workflow orchestration",
      "ATS integration layer",
      "Trust memory",
    ],
  },
  {
    title: "Not Yet Fully Validated",
    tone: "border-zinc-700",
    indicator: "bg-zinc-400",
    items: [
      "Deepfake accuracy",
      "Biometric certainty",
      "Fraud precision metrics",
      "Adversarial robustness",
      "Enterprise-scale trust graph",
    ],
  },
];

const stackDirection = [
  ["Frontend", "Next.js / TypeScript"],
  ["Backend", "Supabase / Postgres initially"],
  ["Trust Engine", "Custom orchestration layer"],
  ["Replay Engine", "Canonical evidence chronology"],
  ["Providers", "Modular adapters"],
  ["APIs", "Platform trust APIs"],
  ["Integrations", "ATS, IAM, workflow systems"],
  ["Governance", "Human-review infrastructure"],
  ["Trust Memory", "Persistent operational trust graph"],
];

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-[#04070c] text-white">
      <section className="grid-bg border-b border-zinc-900 px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Cyber Sentinels Architecture
          </p>
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold md:text-6xl">
            Operational Trust Infrastructure for the AI Era
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-zinc-200 md:text-xl">
            Cyber Sentinels is evolving from a cybersecurity product into a trust
            infrastructure platform for humans, AI agents, candidates and
            regulated enterprise workflows.
          </p>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-zinc-300">
            This architecture separates what operates today from the capabilities
            still being developed or validated.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
          Current stack
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold">
          A practical application stack with governed access at its core.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentStack.map((item) => (
            <article
              key={item.label}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                {item.label}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-zinc-100">
                {item.value}
              </h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                {item.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950/80 px-6 py-16 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
              What Cyber Sentinels is becoming
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              From product surface to operational trust layer.
            </h2>
          </div>
          <p className="text-lg leading-8 text-zinc-200">
            Cyber Sentinels is becoming less a single cybersecurity tool and more
            an operational trust infrastructure platform. It orchestrates
            identity, verification, governance, evidence, replay and auditability
            across enterprise workflows.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
          Core architecture primitives
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold">
          Composable records and controls, not one opaque verdict.
        </h2>
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-4">
          {primitives.map((primitive, index) => (
            <div key={primitive} className="bg-black p-5">
              <p className="font-mono text-xs text-cyan-300">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-sm font-semibold text-zinc-100">
                {primitive}
              </h3>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950/80 px-6 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                Provider-orchestrated trust layer
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                Integrate specialist evidence. Preserve governance authority.
              </h2>
              <p className="mt-5 text-sm leading-7 text-zinc-300">
                Cyber Sentinels does not need to own every identity, liveness,
                biometric or deepfake model from day one. It can orchestrate
                trusted providers, normalize evidence, and add governance,
                scoring, replay and auditability on top.
              </p>
              <p className="mt-4 text-sm leading-7 text-zinc-400">
                Provider inclusion describes an integration direction, not a
                claim of current commercial partnership, certification or
                validated accuracy.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {providers.map((provider) => (
                <div
                  key={provider}
                  className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm font-semibold text-zinc-200"
                >
                  {provider}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
          Current maturity level
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold">
          A candid view of product maturity.
        </h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {maturity.map((column) => (
            <article
              key={column.title}
              className={`rounded-lg border bg-black p-5 ${column.tone}`}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${column.indicator}`}
                />
                <h3 className="text-lg font-semibold text-zinc-100">
                  {column.title}
                </h3>
              </div>
              <ul className="mt-5 grid gap-3 text-sm text-zinc-300">
                {column.items.map((item) => (
                  <li key={item} className="border-t border-zinc-800 pt-3">
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950/80 px-6 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Long-term stack direction
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold">
            An incremental path from application to platform.
          </h2>
          <div className="mt-8 overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[38rem] border-collapse text-left">
              <thead className="bg-black text-xs uppercase tracking-[0.12em] text-zinc-400">
                <tr>
                  <th className="px-5 py-4 font-semibold">Layer</th>
                  <th className="px-5 py-4 font-semibold">Direction</th>
                </tr>
              </thead>
              <tbody>
                {stackDirection.map(([layer, direction]) => (
                  <tr key={layer} className="border-t border-zinc-800 bg-[#070a0f]">
                    <th className="px-5 py-4 text-sm font-semibold text-zinc-100">
                      {layer}
                    </th>
                    <td className="px-5 py-4 text-sm text-zinc-300">
                      {direction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="border-l-2 border-cyan-400 bg-[linear-gradient(90deg,rgba(8,47,73,0.38),transparent)] px-6 py-8 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Platform position
          </p>
          <p className="mt-4 max-w-4xl text-xl font-semibold leading-9 text-zinc-100 md:text-2xl">
            Cyber Sentinels is not a single AI model and not just another
            dashboard. It is designed as a trust orchestration, governance and
            evidence layer for the AI era.
          </p>
        </div>
      </section>

      <section className="px-6 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-6xl rounded-xl border border-cyan-900 bg-[linear-gradient(135deg,rgba(8,47,73,0.5),rgba(0,0,0,0.96))] p-6 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Continue the review
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold">
            Review the build plan, governance model or architecture brief.
          </h2>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/funding"
              className="brand-primary-action brand-action-large text-sm"
            >
              View Funding Plan
            </Link>
            <Link
              href="/governance"
              className="brand-secondary-action brand-action-large text-sm"
            >
              Explore Governance
            </Link>
            <a
              href="mailto:emeaexecutive@icloud.com?subject=Cyber%20Sentinels%20Architecture%20Brief"
              className="brand-secondary-action brand-action-large text-sm"
            >
              Request Architecture Brief
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
