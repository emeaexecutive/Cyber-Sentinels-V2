import Link from "next/link";
import { LivingTrustProfileView } from "@/components/living-trust-profile";
import { buildRegulatedAiAgentDemo } from "@/lib/core/trust-lifecycle-orchestrator";
import { buildRc2LivingTrustDemo } from "@/lib/trust/living-trust-profile";

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
  ["Establish Trust", "Test Mode", "The user initiates one canonical Trust Assessment."],
  ["Resolve Identity", "Awaiting Credentials", "Hopae Connect is selected, but no live call is implied without deployment credentials."],
  ["Confirm Authority", "Test Mode", "Owner, purpose, scope, expiry, revocation and workflow policy are evaluated separately from identity."],
  ["Collect Evidence", "Simulated", "Approved fixtures produce provider-neutral evidence without raw documents or biometric data."],
  ["Evaluate Trust", "Test Mode", "Evidence quality, authority, policy and runtime context produce an explainable outcome."],
  ["Enforce Decision", "Test Mode", "Allow, step-up, review, escalation or block is enforced by deterministic policy."],
  ["Write Replay", "Simulated", "The public demo previews chronology; authenticated recorded flows persist Replay atomically."],
  ["Update Trust Memory™", "Simulated", "Append-only trust change records link reason, evidence, actor, authority, policy and Replay."],
  ["Produce Evidence Pack", "Simulated", "Recorded flows export structured JSON and enterprise-readable PDF from the existing audit route."],
];

const rc2Demo = buildRc2LivingTrustDemo();
const livingTrustFlow = [
  "Human delegates constrained authority to an AI agent",
  "Agent requests a regulated action",
  "Current Living Trust Profile is resolved",
  "Provider evidence and credentials are checked",
  "Runtime context changes",
  "Authorization is re-evaluated",
  "Action requires approval and is paused",
  "Execution receipt is required",
  "Replay records the sequence",
  "Trust Memory™ records how trust changed",
  "Trust DNA™ view updates",
  "Governance can revoke or restore authority",
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
            Providers and models are treated as signals. This approved Test Mode flow coordinates the existing authority, policy, decision, enforcement, Replay, Evidence Graph, Trust Memory™ and Evidence Pack seams without claiming a live provider call.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/verification-replay" className="brand-primary-action brand-action-large text-sm">View Replay</Link>
            <Link href="/admin/trust-execution" className="brand-secondary-action brand-action-large text-sm">Open Execution Monitor</Link>
          </div>
        </section>

        <section className="mt-8 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 md:grid-cols-3 xl:grid-cols-9">
          {flow.map(([title, status, label], index) => (
            <article key={title} className="min-w-0 bg-black p-4">
              <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
              <h2 className="mt-2 text-sm font-semibold text-zinc-100">{title}</h2>
              <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-amber-200">{status}</p>
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

        <section className="mt-8 rounded-2xl border border-cyan-900/60 bg-cyan-950/10 p-6 md:p-8">
          <p className="operational-eyebrow">Release 1.0 RC2 · Approved Test Mode</p>
          <h2 className="mt-3 text-3xl font-semibold">Living trust and runtime reauthorization</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            A finance owner delegates constrained authority to an AI agent. When the requested action, workflow stage, runtime risk and transaction threshold change, the existing authorization and enforcement path evaluates the action again.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {livingTrustFlow.map((step, index) => (
              <div key={step} className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              ["Reauthorization", rc2Demo.authorization.outcome],
              ["Triggers", rc2Demo.authorization.triggers.join(", ").replaceAll("_", " ")],
              ["Governed control", `${rc2Demo.control.action.replaceAll("_", " ")} · ${rc2Demo.control.executionState}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                <p className="mt-2 text-sm font-semibold capitalize text-zinc-100">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-amber-100/80">
            {rc2Demo.control.limitation} Provider evidence is {rc2Demo.sourceMode}; no live provider or external runtime interruption is claimed.
          </p>
        </section>

        <LivingTrustProfileView profile={rc2Demo.profile} />

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
        <section className="mt-8 rounded-2xl border border-zinc-800 bg-black p-6 md:p-8">
          <p className="operational-eyebrow">Continue the buyer journey</p>
          <h2 className="mt-3 text-2xl font-semibold">Inspect assurance, security and the enterprise next step.</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/trust" className="brand-secondary-action">Trust Center</Link>
            <Link href="/security" className="brand-secondary-action">Security</Link>
            <Link href="/enterprise-access?intent=demo" className="brand-primary-action">Request Enterprise Demo</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
