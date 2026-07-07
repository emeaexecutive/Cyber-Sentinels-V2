import Link from "next/link";
import { runTrustAlgorithm } from "@/lib/trust/trust-algorithm";

export const dynamic = "force-dynamic";

const paths = [
  {
    label: "Allowed",
    actor: "Verified analyst",
    algorithm: runTrustAlgorithm({
      identityConfidence: 0.92,
      proofOfHuman: "verified",
      sessionIntegrity: 0.9,
      deviceChannelIntegrity: 0.88,
      provenanceConfidence: 0.76,
      intentRisk: 18,
      runtimeBehavior: 0.08,
      heuristicBaseline: 0.82,
      evidenceRefs: ["receipt-demo-allow", "session-integrity-clear"],
      sourceLabels: ["Heuristic Baseline", "Runtime Intelligence", "Governance Review"],
    }),
  },
  {
    label: "Step-up required",
    actor: "Known agent with changed session",
    algorithm: runTrustAlgorithm({
      identityConfidence: 0.74,
      proofOfHuman: "unknown",
      agentIdentity: "verified",
      nhiOwnership: "known",
      sessionIntegrity: 0.55,
      injectionRisk: 0.38,
      deviceChannelIntegrity: 0.52,
      provenanceConfidence: 0.5,
      intentRisk: 42,
      runtimeBehavior: 0.42,
      heuristicBaseline: 0.66,
      evidenceRefs: ["runtime-change", "device-channel-review"],
    }),
  },
  {
    label: "Governance review",
    actor: "Agent requesting overbroad scope",
    algorithm: runTrustAlgorithm({
      identityConfidence: 0.68,
      proofOfHuman: "verified",
      agentIdentity: "verified",
      nhiOwnership: "known",
      sessionIntegrity: 0.62,
      injectionRisk: 0.28,
      deviceChannelIntegrity: 0.62,
      provenanceConfidence: 0.45,
      intentRisk: 64,
      runtimeBehavior: 0.52,
      heuristicBaseline: 0.6,
      evidenceRefs: ["permission-overbroad", "intent-review"],
    }),
  },
  {
    label: "Blocked",
    actor: "Orphaned automation",
    algorithm: runTrustAlgorithm({
      identityConfidence: 0.38,
      proofOfHuman: "failed",
      agentIdentity: "unknown",
      nhiOwnership: "orphaned",
      sessionIntegrity: 0.36,
      injectionRisk: 0.82,
      deviceChannelIntegrity: 0.3,
      provenanceConfidence: 0.2,
      documentRisk: 0.7,
      intentRisk: 92,
      runtimeBehavior: 0.88,
      heuristicBaseline: 0.42,
      governanceHistory: ["blocked"],
      evidenceRefs: ["orphaned-nhi", "restricted-export-attempt"],
    }),
  },
];

const flow = [
  ["Actor enters workflow", "Actor Identity"],
  ["Detection signals collected", "ML Signal / Provider Signal / Heuristic Signal"],
  ["Trust algorithm calculates posture", "Trust Algorithm"],
  ["Decision engine selects action", "Governance Decision"],
  ["Workflow executor acts", "Workflow Automation"],
  ["Governance and replay record outcome", "Replay Event"],
];

const decisionClass: Record<string, string> = {
  allow: "border-emerald-800 text-emerald-200",
  step_up: "border-cyan-800 text-cyan-100",
  review: "border-amber-800 text-amber-200",
  escalate: "border-orange-800 text-orange-200",
  block: "border-red-800 text-red-200",
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

        <section className="mt-8 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 lg:grid-cols-6">
          {flow.map(([title, label], index) => (
            <article key={title} className="min-w-0 bg-black p-4">
              <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
              <h2 className="mt-2 text-sm font-semibold text-zinc-100">{title}</h2>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{label}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-5">
          {paths.map((path) => (
            <article key={path.label} className="operational-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{path.actor}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{path.label}</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-sm ${decisionClass[path.algorithm.decision]}`}>
                  {path.algorithm.decision}
                </span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {[
                  ["Trust score", path.algorithm.trust_score],
                  ["Trust level", path.algorithm.trust_level],
                  ["Confidence band", path.algorithm.confidence_band],
                  ["Next action", path.algorithm.next_action],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-100">{String(value)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-zinc-500">
                Sources: {path.algorithm.source_labels.join(", ")}. Evidence: {path.algorithm.evidence_refs.join(", ") || "demo evidence only"}.
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
