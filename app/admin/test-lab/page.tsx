import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import {
  getVerificationProviderRegistry,
  providerRuntimeState,
} from "@/lib/providers";
import { createClient } from "@/lib/supabase/server";
import { runValidationScenarios } from "@/lib/validation/signal-testing";
import {
  evidenceIntelligenceSimulations,
  runEvidenceIntelligenceSimulation,
} from "@/lib/trust-intelligence";
import { benchmarkSimulationObservations } from "@/lib/benchmarking/records";

export const dynamic = "force-dynamic";

function toneClass(level: string) {
  if (level === "blocked") return "border-red-800 text-red-200";
  if (level === "low") return "border-amber-800 text-amber-200";
  if (level === "moderate") return "border-cyan-800 text-cyan-200";
  return "border-emerald-800 text-emerald-200";
}

export default async function TestLabPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/test-lab");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/test-lab" });

  const results = runValidationScenarios();
  const intelligenceSimulation = runEvidenceIntelligenceSimulation();
  const providers = getVerificationProviderRegistry();
  const providerWarnings = providers.filter((provider) =>
    ["safely_disabled", "placeholder", "future"].includes(provider.status)
  );
  const pilotCoverage = [
    ["Trust degradation", "Repeated changes show how posture moves over time.", "vpn_anomaly"],
    ["Provider failure", "Failed provider evidence opens a review path.", "failed_provider_verification"],
    ["Injected session", "Channel and injection flags remain replayable.", "injected_session"],
    ["Proxy interview", "Candidate and live-session context remain separate.", "proxy_candidate_risk"],
    ["Governance intervention", "Named reviewer action affects the final posture.", "governance_escalation"],
  ].map(([label, description, scenarioType]) => ({
    label,
    description,
    ready: results.some((result) => result.scenario.scenarioType === scenarioType),
  }));

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">
                Validation Test Lab
              </p>
              <h1 className="mt-3 text-4xl font-semibold">
                Controlled trust-signal scenarios.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Run deterministic scenarios for identity confidence, provider-backed verification signals, session integrity, behavioral consistency, evidence completeness and governance review state. These are rule-based validation cases, not benchmark results or live provider success claims.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                Validation continuity checks whether provider evidence flows into replay, governance affects trust state, workflow outcomes update chronology and trust journeys evolve visibly.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/test-results" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white">
                Test results
              </Link>
              <Link href="/admin/verification-testbench" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
                Verification testbench
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-cyan-950 bg-zinc-950 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Enterprise pilot simulation matrix
          </p>
          <h2 className="mt-2 text-xl font-semibold">Operational scenarios ready for walkthrough</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Each simulation shows the input signal, provider state, trust transition, governance response,
            replay chronology and final workflow outcome. Results are deterministic product checks, not detection benchmarks.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {pilotCoverage.map((item) => (
              <div key={item.label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-100">{item.label}</h3>
                  <span className={`rounded-full border px-2 py-1 text-xs ${item.ready ? "border-emerald-800 text-emerald-200" : "border-amber-800 text-amber-200"}`}>
                    {item.ready ? "Ready" : "Missing"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Test coverage labels</h2>
            <div className="mt-4 grid gap-3 text-sm text-zinc-400">
              <p className="rounded-lg border border-zinc-800 bg-black p-3">
                Real provider-backed tests: available only when a configured provider result is attached to workflow evidence. This lab does not call providers during rendering.
              </p>
              <p className="rounded-lg border border-zinc-800 bg-black p-3">
                Simulated tests: controlled scenario inputs exercise rule-based scoring, replay chronology and governance escalation.
              </p>
              <p className="rounded-lg border border-zinc-800 bg-black p-3">
                Failed provider tests: scenarios model failed or pending provider states so review paths can be inspected safely.
              </p>
              <p className="rounded-lg border border-zinc-800 bg-black p-3">
                Unvalidated capabilities: provider placeholders and configured-but-unverified adapters are not counted as live evidence or accuracy benchmarks.
              </p>
              <p className="rounded-lg border border-zinc-800 bg-black p-3">
                Assurance levels: deterministic evidence gates describe workflow assurance, not biometric certainty or a universal identity score.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Missing provider warnings</h2>
            <div className="mt-4 grid gap-2">
              {providerWarnings.map((provider) => (
                <p key={provider.id} className="rounded-lg border border-zinc-800 bg-black p-3 text-sm leading-6 text-zinc-400">
                  {provider.name}: {providerRuntimeState(provider)}. {provider.notes}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-cyan-950 bg-zinc-950 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Proprietary AI boundary
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            Rule-based results are workflow evidence, not model accuracy.
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            This lab separates simulated tests, attached provider-backed evidence, deterministic rule results and unvalidated capabilities. A future proprietary model may be evaluated here only after representative data and benchmark criteria exist; it would remain one signal inside governance and replay.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Evidence intelligence simulations
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            Continuity patterns across a controlled workflow
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            These deterministic fixtures exercise repeated anomalies, replay inconsistency, trust degradation, governance intervention chains and provider instability. They validate explanation and chronology behavior, not detection accuracy.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              ["Repeated anomalies", intelligenceSimulation.repeatedAnomalyCount],
              ["Replay divergences", intelligenceSimulation.replayDivergenceCount],
              ["Provider instability", intelligenceSimulation.providerInstabilityCount],
              ["Session failures", intelligenceSimulation.sessionContinuityFailureCount],
              ["Governance actions", intelligenceSimulation.governanceInterventionCount],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-zinc-100">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {evidenceIntelligenceSimulations.map((event) => (
              <article key={event.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold capitalize text-zinc-100">
                    {event.category.replaceAll("_", " ")}
                  </h3>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs capitalize text-zinc-300">
                    {event.direction}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{event.explanation}</p>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Evidence: {event.evidenceReferences.join(", ")}
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Governance: {event.governanceAction ?? "No governance action at this event"}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                Benchmark simulation coverage
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                Operational validation fixtures
              </h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
                Controlled simulations cover synthetic candidate attempts, replay divergence, provider instability, governance escalation chains, injected sessions and session integrity failures. Fixtures validate routing and metrics, never accuracy.
              </p>
            </div>
            <Link href="/admin/benchmarking" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white">
              Open benchmarking
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {benchmarkSimulationObservations.map((observation) => (
              <article key={observation.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold capitalize text-zinc-100">
                    {observation.kind.replaceAll("_", " ")}
                  </h3>
                  <span className="rounded-full border border-amber-800 px-2.5 py-1 text-xs text-amber-200">
                    simulated
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{observation.explanation}</p>
                <p className="mt-3 text-xs text-zinc-500">
                  Evidence: {observation.evidenceReferences.join(", ")}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Governance: {observation.governanceAction}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5">
          {results.map((result) => (
            <article key={result.scenario.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                    {result.scenario.scenarioType.replaceAll("_", " ")}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{result.scenario.label}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                    {result.scenario.summary}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${toneClass(result.level)}`}>
                  {result.level} / {result.score}
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-lg border border-zinc-800 bg-black p-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Test signal categories</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {result.scoreContributions.map((item) => (
                      <div key={item.category} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm text-zinc-300">Raw: {item.rawValue}</p>
                        <p className="mt-1 text-sm text-cyan-200">Contribution: {item.contribution}</p>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">{item.notes}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-800 bg-black p-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Workflow outcome</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{result.workflowOutcome}</p>
                  <h3 className="mt-5 text-sm font-semibold text-zinc-100">Rule-based trust score result</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {result.scoreBefore} to {result.scoreAfter} ({result.scoreDelta >= 0 ? "+" : ""}{result.scoreDelta})
                  </p>
                  <h3 className="mt-5 text-sm font-semibold text-zinc-100">Escalation reasons</h3>
                  <div className="mt-3 grid gap-2">
                    {result.escalationReasons.map((reason) => (
                      <p key={reason} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-400">
                        {reason}
                      </p>
                    ))}
                  </div>
                </section>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-zinc-800 bg-black p-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Triggered flags</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.triggeredFlags.length ? (
                      result.triggeredFlags.map((flag) => (
                        <span key={flag} className="rounded-full border border-amber-800 px-2.5 py-1 text-xs text-amber-200">
                          {flag}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-emerald-800 px-2.5 py-1 text-xs text-emerald-200">
                        No rule-based flags
                      </span>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-800 bg-black p-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Provider-backed verification signal</h3>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-400">
                    <p>Provider: {result.providerValidation.provider}</p>
                    <p>Status: {result.providerValidation.status}</p>
                    <p>Latency: {result.providerValidation.latencyMs ?? "not measured"} ms</p>
                    <p>Provider confidence: {result.providerValidation.confidence ?? "not available"}</p>
                    <p>Missing evidence: {result.providerValidation.missingEvidence.length ? result.providerValidation.missingEvidence.join(", ") : "none"}</p>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {result.providerEvidence.map((evidence) => (
                      <div key={`${result.scenario.id}-${evidence.provider_name}`} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-400">
                        <p className="font-medium text-zinc-200">{evidence.provider_name}: {evidence.verification_state}</p>
                        <p>{evidence.evidence_summary}</p>
                        <p className="text-zinc-500">Reference: {evidence.provider_reference}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="mt-4 rounded-lg border border-zinc-800 bg-black p-4">
                <h3 className="text-sm font-semibold text-zinc-100">Replayable workflow trust chronology</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Every deterministic state change retains its score delta, reason, evidence, governance action,
                  workflow transition and authorization continuity.
                </p>
                <div className="mt-4 grid gap-3">
                  {result.trustChronology.map((transition) => (
                    <div key={transition.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-200">
                          {transition.previousScore} to {transition.score} ({transition.scoreDelta >= 0 ? "+" : ""}{transition.scoreDelta})
                        </p>
                        <span className="text-xs uppercase tracking-[0.12em] text-cyan-300">{transition.workflowTransition}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">
                        Why: {transition.whyChanged.join(" ")}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        Evidence: {transition.evidenceContributed.join(", ") || "No evidence reference supplied"}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        Governance: {transition.governanceAction
                          ? `${transition.governanceAction.action} by ${transition.governanceAction.reviewer}`
                          : "No governance action at this transition"} · Authorization: {transition.authorizationContinuity}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-4 rounded-lg border border-cyan-950 bg-black p-4">
                <h3 className="text-sm font-semibold text-cyan-100">Operational trust memory validation</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Repeated anomalies, provider degradation, replay continuity and authorization stability are
                  compared across retained transitions. No hidden behavioral tracking is used.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Memory entries", String(result.trustMemoryValidation.entryCount)],
                    ["Evidence continuity", `${result.trustMemoryValidation.evidenceContinuity.length} reference(s)`],
                    ["Delegated authority", `${result.trustMemoryValidation.authorizationGrantCount} grant(s)`],
                    ["Governed execution", result.trustMemoryValidation.governedExecutionOutcome],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{label}</p>
                      <p className="mt-2 text-sm text-zinc-200">{value}</p>
                    </div>
                  ))}
                </div>
                {result.trustMemoryValidation.historicalComparison ? (
                  <p className="mt-4 text-sm leading-6 text-zinc-400">
                    Historical posture: {result.trustMemoryValidation.historicalComparison.from.posture} at{" "}
                    {result.trustMemoryValidation.historicalComparison.from.score} to{" "}
                    {result.trustMemoryValidation.historicalComparison.to.posture} at{" "}
                    {result.trustMemoryValidation.historicalComparison.to.score}. Governance interventions:{" "}
                    {result.trustMemoryValidation.historicalComparison.governanceInterventions}. Authorization changed:{" "}
                    {result.trustMemoryValidation.historicalComparison.authorizationChanged ? "yes" : "no"}.
                  </p>
                ) : null}
              </section>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
