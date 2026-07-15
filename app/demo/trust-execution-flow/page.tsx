import Link from "next/link";
import { buildRegulatedAiAgentDemo } from "@/lib/core/trust-lifecycle-orchestrator";

export const dynamic = "force-dynamic";

const paths = [
  {
    label: "Allowed",
    actor: "Regulated finance agent within scope",
    result: buildRegulatedAiAgentDemo("allow"),
  },
  {
    label: "Governance review",
    actor: "Regulated finance agent requiring accountable review",
    result: buildRegulatedAiAgentDemo("review"),
  },
  {
    label: "Blocked",
    actor: "Agent outside delegated financial authority",
    result: buildRegulatedAiAgentDemo("block"),
  },
];

const flow = [
  ["Human", "The accountable owner and delegated authority remain visible."],
  ["AI Agent", "Agent identity, purpose and action scope are resolved."],
  ["Machine Identity", "Credential lineage is checked without exposing secrets."],
  ["Trust Decision", "Evidence, authority and policy produce an explainable outcome."],
  ["Replay", "The decision chronology and evidence references remain reconstructable."],
  ["Evidence Graph", "Decision, evidence, authority and governance references remain linked."],
  ["Trust Memory™", "The recorded trust transition supports future review without implying autonomous learning."],
  ["Governance", "A named reviewer owns escalation and resolution."],
  ["Dashboard", "Posture, providers, reviews and next actions remain operationally visible."],
  ["Operational Readiness", "Release, provider, ML, security, documentation and pilot evidence remain inspectable."],
];

const decisionClass: Record<string, string> = {
  allow: "border-emerald-800 text-emerald-200",
  step_up: "border-cyan-800 text-cyan-100",
  review: "border-amber-800 text-amber-200",
  escalate: "border-orange-800 text-orange-200",
  block: "border-red-800 text-red-200",
  insufficient_evidence: "border-zinc-700 text-zinc-300",
  "insufficient evidence": "border-zinc-700 text-zinc-300",
};

export default function TrustExecutionFlowDemoPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Trust execution demo</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Detection signals become governed workflow action.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            ML and providers are treated as signals. Cyber Sentinels combines
            Detection Signals, Trust Algorithm, Decision Engine, Workflow
            Automation, Governance and Replay without claiming autonomous certainty.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/trust-replay" className="brand-primary-action brand-action-large text-sm">View Replay</Link>
            <Link href="/admin/trust-execution" className="brand-secondary-action brand-action-large text-sm">Open Execution Monitor</Link>
          </div>
        </section>

        <section className="mt-8 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 md:grid-cols-2 xl:grid-cols-5">
          {flow.map(([title, label], index) => (
            <article key={title} className="min-w-0 bg-black p-4">
              <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
              <h2 className="mt-2 text-sm font-semibold text-zinc-100">{title}</h2>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{label}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-amber-900 bg-amber-950/10 p-5">
          <h2 className="text-lg font-semibold text-amber-100">Operational demo boundary</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Decision cards below use deterministic demo inputs. Health, replay persistence, Trust Memory and Evidence Graph completion must be confirmed in authenticated operator surfaces; this public page does not fabricate production telemetry or write customer records.
          </p>
        </section>

        <section className="mt-8 grid gap-5">
          {paths.map((path) => (
            <article key={path.label} className="operational-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{path.actor}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{path.label}</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-sm ${decisionClass[path.result.trust_decision]}`}>
                  {path.result.trust_decision}
                </span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {[
                  ["Current posture", path.result.trust_posture],
                  ["Enforcement", path.result.enforcement_action],
                  ["Confidence band", path.result.confidence_band],
                  ["Next action", path.result.next_required_action],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-100">{String(value)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-zinc-500">
                Provider reality: {path.result.provider_reality.map((provider) => `${provider.provider} (${provider.state})`).join(", ")}.
                Evidence: {path.result.evidence_references.join(", ") || "demo evidence only"}.
                Replay: {path.result.replay_reference ?? "write unavailable"}. Trust Memory™: {path.result.trust_memory_reference ?? "write unavailable"}.
              </p>
              <p className="mt-3 text-sm leading-7 text-amber-200">
                Limitations: {path.result.limitations.join(" ")}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/trust-replay" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">View Replay</Link>
                <Link href="/admin/trust-execution" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">View Runtime Events</Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
