import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";

const buildCards = [
  ["AI Agent Verification", "Register agents, owners, model context and permission scope before operational use."],
  ["Trust Event Pipelines", "Send structured events into Cyber Sentinels for audit-aware trust visibility."],
  ["Audit-Aware Workflows", "Connect sensitive actions to review, traceability and governance history."],
  ["Evidence Verification", "Build evidence-backed workflows for identity, workforce and operational review."],
  ["Human Review Systems", "Route high-risk verification outcomes into governed review and appeal processes."],
  ["Explainable Trust Layers", "Expose trust state, related events and audit context to decision-makers."],
];

const flow = [
  "Identity",
  "Evidence",
  "Verification",
  "Trust Events",
  "Audit Trails",
  "Governance",
  "Intelligence",
];

const endpoints = [
  ["POST", "/api/trust-events"],
  ["GET", "/api/agents"],
  ["POST", "/api/passports"],
  ["GET", "/api/passports/[id]"],
  ["GET", "/api/signals"],
];

export default function DevelopersPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <ExecutiveSummary
          eyebrow="Developers"
          title="Embed accountable trust decisions into existing enterprise workflows."
          bullets={["Submit structured identity, authority and runtime context.", "Receive explainable decisions with evidence references.", "Route sensitive outcomes into human governance.", "Keep keys scoped, server-side and revocable."]}
          primary={{ href: "/developers/docs", label: "Read API Docs" }}
          secondary={{ href: "/developers/authentication", label: "View Authentication" }}
        />

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            What Developers Can Build
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {buildCards.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Core Architecture
          </p>
          <div className="mt-5 grid gap-3 lg:grid-cols-7">
            {flow.map((item, index) => (
              <div key={item} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs text-cyan-200">Layer {index + 1}</p>
                <h2 className="mt-2 font-semibold text-zinc-100">{item}</h2>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">API Overview</h2>
            <div className="mt-5 grid gap-3">
              {endpoints.map(([method, path]) => (
                <div key={path} className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-black p-4">
                  <span className="rounded-full border border-emerald-800 px-2.5 py-1 text-xs text-emerald-200">
                    {method}
                  </span>
                  <code className="text-sm text-zinc-300">{path}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust Event Example</h2>
            <pre className="mt-5 overflow-x-auto rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-7 text-zinc-300">
{`{
  "actor_type": "agent",
  "event_type": "permission_change",
  "risk_level": "medium"
}`}
            </pre>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">SDK Placeholder</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              SDKs and webhook support planned for future releases.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Security & Governance</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                ["/security", "Security"],
                ["/trust-principles", "Trust Principles"],
                ["/ai-governance", "AI Governance"],
                ["/transparency", "Transparency"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="rounded-lg border border-cyan-800 px-3 py-2 text-sm text-cyan-100 hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
