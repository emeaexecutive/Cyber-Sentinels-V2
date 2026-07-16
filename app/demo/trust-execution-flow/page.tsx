import Link from "next/link";
import { buildRegulatedAiAgentDemo } from "@/lib/core/trust-lifecycle-orchestrator";
import { buildRc2LivingTrustDemo } from "@/lib/trust/living-trust-profile";

export const dynamic = "force-dynamic";

const decision = buildRegulatedAiAgentDemo("review");
const livingTrustProof = buildRc2LivingTrustDemo();

const journey = [
  ["Identity verified", "Test", "The actor is resolved through the production-candidate identity path without claiming a Live provider result."],
  ["Authority resolved", "Test", "Owner, purpose, action scope, expiry, revocation and policy are evaluated independently from identity."],
  ["Provider evidence collected", "Awaiting Credentials", "Provider-neutral references are normalized while raw documents, secrets and biometric payloads stay excluded."],
  ["Trust evaluated", "Test", "Contextual trust is evaluated from authority, policy, runtime evidence, provider state and known limitations."],
  ["Decision made", "Test", "Deterministic policy pauses the action for accountable review and retains the decision rationale."],
  ["Replay generated", "Test", "Actor, authority, evidence, policy, decision and enforcement chronology become reconstructable."],
  ["Trust Memory™ updated", "Test", "Previous and new posture, evidence, authority, policy, reviewer, confidence change and reassessment remain linked."],
  ["Evidence Graph refreshed", "Test", "Coverage, provenance, freshness, relationship strength, contradictions and missing evidence are recalculated."],
  ["Executive trust report produced", "Test", "The executive outcome summarizes posture, decision, evidence continuity, limitations and accountable next action."],
] as const;

export default function TrustExecutionFlowDemoPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Release 1.0 RC5 · Controlled Test</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">Follow one enterprise trust decision from identity to executive proof.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">This linear journey produces an executive-readable operational trust result without a manual narrative. Controlled Test proves product behavior only; no live provider, production accuracy or customer telemetry is claimed.</p>
        </section>

        <section aria-labelledby="journey-title" className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-7">
          <p className="operational-eyebrow">Operational trust journey</p>
          <h2 id="journey-title" className="mt-3 text-3xl font-semibold">One action. Nine attributable stages. No manual explanation.</h2>
          <ol className="mt-6 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 md:grid-cols-3 xl:grid-cols-9">
            {journey.map(([label, state, detail], index) => (
              <li key={label} className="min-w-0 bg-black p-4">
                <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 text-sm font-semibold text-zinc-100">{label}</h3>
                <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-amber-200">{state}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 rounded-2xl border border-cyan-900/60 bg-cyan-950/10 p-6 md:p-8">
          <p className="operational-eyebrow">Executive trust report</p>
          <h2 className="mt-3 text-2xl font-semibold">The action pauses because accountable review is required.</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Current posture", livingTrustProof.profile.currentPosture],
              ["Decision", decision.trust_decision],
              ["Enforcement", decision.enforcement_action],
              ["Confidence band", decision.confidence_band],
            ].map(([label, value]) => <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4"><p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{label}</p><p className="mt-2 text-lg font-semibold capitalize text-zinc-100">{String(value).replaceAll("_", " ")}</p></article>)}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <article className="rounded-lg border border-zinc-800 bg-black p-4"><h3 className="font-semibold text-zinc-100">Evidence continuity</h3><p className="mt-2 text-sm leading-6 text-zinc-500">Replay: {decision.replay_reference ?? "Awaiting retained execution"}. Trust Memory™: {decision.trust_memory_reference ?? "Awaiting retained execution"}. Evidence: {decision.evidence_references.join(", ") || "Controlled demo evidence only"}.</p></article>
            <article className="rounded-lg border border-zinc-800 bg-black p-4"><h3 className="font-semibold text-zinc-100">Known limitations</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{decision.limitations.join(" ")} Provider evidence remains {livingTrustProof.sourceMode}; authenticated persistence and deployment health must be confirmed in operator surfaces.</p></article>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-black p-6 md:p-8">
          <p className="operational-eyebrow">Continue with evidence</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/verification-replay" className="brand-primary-action">View Replay</Link>
            <Link href="/enterprise/readiness" className="brand-secondary-action">Enterprise Dashboard</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
