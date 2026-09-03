import type { Metadata } from "next";
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
  ["POST", "/api/v1/agents"],
  ["POST", "/api/v1/agents/{agentId}/challenge"],
  ["POST", "/api/v1/agents/{agentId}/proof"],
  ["POST", "/api/v1/trust/decisions"],
  ["POST", "/api/v1/evidence"],
  ["GET", "/api/v1/trust/transactions/{transactionId}/replay"],
  ["GET", "/api/v1/trust/transactions/{transactionId}/receipt"],
];

const connectors = [
  { title: "CONNECT AN AGENT", preset: "AGENT_RUNTIME", scopes: "agents:write, agents:verify, authority:read, trust:request, trust:read, outcomes:write", request: "await cs.agents.register({ display_name, entity_type: 'AI_AGENT', owner_reference, runtime, model })", test: "await cs.agents.verify(agentId, proof)" },
  { title: "CONNECT AN APPLICATION", preset: "APPLICATION", scopes: "trust:request, trust:read, outcomes:write", request: "await cs.decisions.create({ operational_entity_id, action, idempotency_key })", test: "await cs.transactions.get(result.transaction_id)" },
  { title: "SUBMIT APPLICATION EVIDENCE", preset: "EVIDENCE_PROVIDER", scopes: "evidence:write, trust:read", request: "await cs.evidence.submit({ provider: { key: 'self', class: 'APPLICATION_SIGNAL', ... }, type, subject, evidence })", test: "await cs.transactions.receipt(transactionId)" },
  { title: "CONNECT A ROBOT / EDGE RUNTIME", preset: "ROBOTICS_RUNTIME", scopes: "authority:read, trust:request, trust:read, evidence:write, outcomes:write", request: "await cs.decisions.create({ operational_entity_id, action, idempotency_key })", test: "await cs.transactions.replay(result.transaction_id)" },
] as const;

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
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Connector onboarding</p><h2 className="mt-2 text-2xl font-semibold">Four paths, one canonical Trust API</h2></div><Link href="/developers/api-keys" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100">Create scoped key</Link></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">{connectors.map((connector) => <article key={connector.title} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"><p className="text-xs font-semibold tracking-[0.16em] text-cyan-200">{connector.title}</p><p className="mt-3 text-sm text-zinc-300">API key preset: <code>{connector.preset}</code></p><p className="mt-2 text-xs leading-5 text-zinc-500">Required scopes: {connector.scopes}</p><pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded bg-black p-3 text-xs leading-5 text-zinc-300">npm --prefix examples/agent-gamma install{"\n\n"}{connector.request}{"\n"}{connector.test}</pre><p className="mt-3 text-xs text-zinc-500">The TypeScript SDK is repository-local and unpublished. Provider/application findings remain AGENT_ASSERTED evidence, never provider-owned decisions.</p><div className="mt-3 flex gap-4 text-xs"><Link href="/developers/quickstart" className="text-cyan-200 underline">Run test call</Link><a href="/api/v1/openapi.json" className="text-cyan-200 underline">OpenAPI result</a></div></article>)}</div>
        </section>

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
            <h2 className="text-xl font-semibold">Exact action request</h2>
            <pre className="mt-5 overflow-x-auto rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-7 text-zinc-300">
{`{
  "operational_entity_id": "agent:…",
  "action": {
    "type": "read_repository",
    "target": "repository:a",
    "purpose": "deployment_evidence_review",
    "environment": "staging"
  },
  "idempotency_key": "gamma-action-001"
}`}
            </pre>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">TypeScript SDK v0.1.0</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Register and cryptographically verify external agents, request
              ALLOW / REVIEW / DENY, and retrieve transaction, Replay and
              receipt evidence. Signed outbound decision and trust-change
              webhook events are supported when a tenant endpoint is configured.
            </p>
            <div className="mt-4 flex gap-4 text-sm"><Link className="text-cyan-200 underline" href="/developers/quickstart">Agent Gamma quickstart</Link><a className="text-cyan-200 underline" href="/api/v1/openapi.json">OpenAPI 3.1</a></div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Security & Governance</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                ["/security", "Security"],
                ["/trust-principles", "Trust Principles"],
                ["/ai-governance", "AI Governance"],
                ["/transparency", "Transparency"],
                ["/documents", "Documents"],
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
export const metadata: Metadata = {
  title: "Developers | Cyber Sentinels",
  description: "APIs, authentication, webhooks and integration paths for operational trust.",
  alternates: { canonical: "/developers" },
};
