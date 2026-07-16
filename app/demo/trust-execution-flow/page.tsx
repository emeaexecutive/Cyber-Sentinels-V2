import Link from "next/link";
import { buildRegulatedAiAgentDemo } from "@/lib/core/trust-lifecycle-orchestrator";
import { buildRc2LivingTrustDemo } from "@/lib/trust/living-trust-profile";

export const dynamic = "force-dynamic";

const decision = buildRegulatedAiAgentDemo("review");
const livingTrustProof = buildRc2LivingTrustDemo();

const journey = [
  {
    label: "Start",
    state: "Test",
    detail: "Establish Trust for one consequential regulated workflow and one attributable action.",
  },
  {
    label: "Identity",
    state: "Awaiting Credentials",
    detail: "Resolve Identity through the production-candidate Hopae path; this environment makes no live provider claim.",
  },
  {
    label: "Authority",
    state: "Test",
    detail: "Confirm Authority by evaluating owner, purpose, action scope, expiry, revocation and policy independently from identity.",
  },
  {
    label: "Evidence",
    state: "Test",
    detail: "Collect Evidence as normalized, provider-neutral references without exposing raw documents or biometric data.",
  },
  {
    label: "Decision",
    state: "Test",
    detail: "Evaluate Trust and Enforce Decision through deterministic policy; this path pauses for accountable governance review.",
  },
  {
    label: "Replay",
    state: "Test",
    detail: "Write Replay so the actor, authority, evidence, policy, decision and enforcement sequence can be reconstructed.",
  },
  {
    label: "Trust Memory™",
    state: "Test",
    detail: "Update Trust Memory™ with the previous posture, new posture, reason, evidence, actor, policy and Replay reference.",
  },
  {
    label: "Evidence Pack",
    state: "Test",
    detail: "Produce Evidence Pack output from the same decision record for technical and enterprise review.",
  },
  {
    label: "Enterprise Dashboard",
    state: "Test",
    detail: "Close on evidence-linked validation, provider, performance, security, documentation, demo and pilot readiness.",
  },
] as const;

export default function TrustExecutionFlowDemoPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Release 1.0 RC4 · Controlled Test</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Understand one critical trust decision from start to enterprise proof.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            This linear journey shows how identity, authority and evidence become an explainable decision, Replay, Trust Memory™ record and Evidence Pack. Test Mode proves product behavior only; no live provider, production accuracy or customer telemetry is claimed.
          </p>
        </section>

        <section aria-labelledby="journey-title" className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-7">
          <p className="operational-eyebrow">Operational trust journey</p>
          <h2 id="journey-title" className="mt-3 text-3xl font-semibold">One action. Nine attributable stages. No branches.</h2>
          <ol className="mt-6 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 md:grid-cols-3 xl:grid-cols-9">
            {journey.map((step, index) => (
              <li key={step.label} className="min-w-0 bg-black p-4">
                <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 text-sm font-semibold text-zinc-100">{step.label}</h3>
                <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-amber-200">{step.state}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 rounded-2xl border border-cyan-900/60 bg-cyan-950/10 p-6 md:p-8">
          <p className="operational-eyebrow">Decision proof</p>
          <h2 className="mt-3 text-2xl font-semibold">The workflow pauses because accountable review is required.</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Current posture", livingTrustProof.profile.currentPosture],
              ["Decision", decision.trust_decision],
              ["Enforcement", decision.enforcement_action],
              ["Confidence band", decision.confidence_band],
            ].map(([label, value]) => (
              <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{label}</p>
                <p className="mt-2 text-lg font-semibold capitalize text-zinc-100">{String(value).replaceAll("_", " ")}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <article className="rounded-lg border border-zinc-800 bg-black p-4">
              <h3 className="font-semibold text-zinc-100">Evidence continuity</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">Replay: {decision.replay_reference ?? "Awaiting retained execution"}. Trust Memory™: {decision.trust_memory_reference ?? "Awaiting retained execution"}. Evidence references: {decision.evidence_references.join(", ") || "Controlled demo evidence only"}.</p>
            </article>
            <article className="rounded-lg border border-zinc-800 bg-black p-4">
              <h3 className="font-semibold text-zinc-100">Operational boundary</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{decision.limitations.join(" ")} Provider evidence remains {livingTrustProof.sourceMode}; authenticated persistence and deployment health must be confirmed in operator surfaces.</p>
            </article>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-black p-6 md:p-8">
          <p className="operational-eyebrow">Continue with evidence</p>
          <h2 className="mt-3 text-2xl font-semibold">Inspect the recorded sequence, then review enterprise readiness.</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/verification-replay" className="brand-primary-action">View Replay</Link>
            <Link href="/enterprise/readiness" className="brand-secondary-action">Enterprise Dashboard</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
