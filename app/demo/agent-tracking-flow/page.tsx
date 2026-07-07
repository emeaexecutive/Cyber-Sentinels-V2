import Link from "next/link";
import { buildAgentTrackingFlow } from "@/lib/agents/agent-tracking-flow";

export const dynamic = "force-dynamic";

const scenarios = [
  buildAgentTrackingFlow({
    agentId: "agent-demo-allow",
    agentName: "Claims Intake Agent",
    humanOwner: "Maya Ortiz",
    action: "summarize_claim_evidence",
    declaredIntent: "Prepare evidence summary for adjuster review",
    permissionScope: "matched",
    sessionIntegrity: 0.86,
    runtimeAnomalies: 0.12,
    providerSignals: null,
  }),
  buildAgentTrackingFlow({
    agentId: "agent-demo-escalate",
    agentName: "Payment Exception Agent",
    humanOwner: "Jordan Lee",
    action: "request_payment_exception",
    declaredIntent: "Route exception for high-value payment approval",
    permissionScope: "overbroad",
    sessionIntegrity: 0.68,
    runtimeAnomalies: 0.58,
    providerSignals: null,
  }),
  buildAgentTrackingFlow({
    agentId: "agent-demo-block",
    agentName: "Unknown Automation",
    humanOwner: null,
    action: "export_restricted_records",
    declaredIntent: "Export records outside declared workflow",
    permissionScope: "mismatch",
    sessionIntegrity: 0.42,
    runtimeAnomalies: 0.82,
    providerSignals: null,
  }),
];

const decisionClass: Record<string, string> = {
  allow: "border-emerald-800 text-emerald-200",
  review: "border-cyan-800 text-cyan-100",
  escalate: "border-amber-800 text-amber-200",
  block: "border-red-800 text-red-200",
  "insufficient evidence": "border-zinc-700 text-zinc-300",
};

export default function AgentTrackingFlowDemoPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Agent tracking demo</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Follow an AI-agent action from entry to replay.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            This demo uses deterministic Demo Data, Heuristic Baseline and Runtime Intelligence labels.
            It does not claim live ML detection, benchmark accuracy or production-grade inference.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/trust-replay" className="brand-primary-action brand-action-large text-sm">View Replay</Link>
            <Link href="/verification-receipts" className="brand-secondary-action brand-action-large text-sm">View Evidence Receipt</Link>
            <Link href="/dashboard/governance" className="brand-secondary-action brand-action-large text-sm">Review Governance Decision</Link>
          </div>
        </section>

        <section className="mt-8 grid gap-5">
          {scenarios.map((scenario) => (
            <article key={scenario.agent.id} className="operational-panel overflow-hidden p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{scenario.agent.id}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-zinc-100">{scenario.agent.name}</h2>
                  <p className="mt-2 text-sm text-zinc-500">
                    Owner: {scenario.agent.humanOwner ?? "not identified"} / Intent risk: {scenario.intent.riskScore}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-sm ${decisionClass[scenario.decision]}`}>
                  {scenario.decision}
                </span>
              </div>
              <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 lg:grid-cols-7">
                {scenario.steps.map((step, index) => (
                  <div key={step.id} className="min-w-0 bg-black p-4">
                    <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                    <h3 className="mt-2 text-sm font-semibold text-zinc-100">{step.label}</h3>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">{step.summary}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Source labels</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{scenario.source_labels.join(", ")}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Decision reason</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{scenario.reason}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Replay proof</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    Agent, owner, intent, permission scope, signals, decision and final outcome remain linked.
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
