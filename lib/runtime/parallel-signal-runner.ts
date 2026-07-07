import { runHeuristicDetection } from "@/lib/detection/detection-engine";
import type { FusionSignal } from "@/lib/detection/signal-fusion";
import { publishTrustEvent } from "@/lib/events/event-bus";
import { orchestrateProviders } from "@/lib/providers/provider-orchestrator";

export type ParallelSignalRunnerInput = {
  timeoutMs?: number;
  identityConfidence?: number | null;
  sessionIntegrity?: number | null;
  provenanceConfidence?: number | null;
  intentRisk?: number | null;
  runtimeBehavior?: number | null;
  heuristicBaseline?: number | null;
};

async function timed<TValue>(label: string, timeoutMs: number, work: () => Promise<TValue>) {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const value = await Promise.race([
      work(),
      new Promise<TValue>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_timeout`)), timeoutMs);
      }),
    ]);
    return { ok: true as const, label, latency_ms: Date.now() - started, value };
  } catch (error) {
    return {
      ok: false as const,
      label,
      latency_ms: Date.now() - started,
      error: error instanceof Error ? error.message : "signal_failed",
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function runParallelSignalChecks(input: ParallelSignalRunnerInput) {
  const timeoutMs = input.timeoutMs ?? 300;
  const [providers, heuristic, provenance, runtime, session, intent] = await Promise.all([
    timed("provider_checks", timeoutMs, () => orchestrateProviders({ timeoutMs })),
    timed("heuristic_baseline", timeoutMs, async () =>
      runHeuristicDetection({
        impossibleSessionVelocity: (input.runtimeBehavior ?? 0) > 0.7,
        missingProvenance: (input.provenanceConfidence ?? 1) < 0.45,
        repeatedFailedVerification: (input.identityConfidence ?? 1) < 0.45,
        suspiciousAgentRuntimeBehavior: (input.runtimeBehavior ?? 0) > 0.6,
      })
    ),
    timed("provenance_checks", timeoutMs, async () => ({
      confidence: input.provenanceConfidence ?? null,
      risk: input.provenanceConfidence == null ? null : 1 - input.provenanceConfidence,
    })),
    timed("runtime_anomaly_checks", timeoutMs, async () => ({
      risk: input.runtimeBehavior ?? null,
      confidence: input.runtimeBehavior == null ? 0 : 0.7,
    })),
    timed("session_integrity_checks", timeoutMs, async () => ({
      confidence: input.sessionIntegrity ?? null,
      risk: input.sessionIntegrity == null ? null : 1 - input.sessionIntegrity,
    })),
    timed("intent_risk_checks", timeoutMs, async () => ({
      riskScore: input.intentRisk ?? null,
      recommendation: input.intentRisk == null ? "review" : input.intentRisk >= 85 ? "block" : input.intentRisk >= 65 ? "escalate" : input.intentRisk >= 35 ? "review" : "allow",
    })),
  ]);

  const providerSignals: FusionSignal[] = providers.ok
    ? providers.value.map((provider) => {
        if (provider.state === "Timeout") publishTrustEvent("provider.timeout", { provider_id: provider.id, latency_ms: provider.latency_ms });
        if (provider.state === "Failed") publishTrustEvent("provider.failed", { provider_id: provider.id, latency_ms: provider.latency_ms });
        return {
          id: provider.id,
          source: provider.state === "Live" ? "Provider API" : provider.state === "Awaiting Credentials" ? "Awaiting Credentials" : "Not Implemented",
          risk: 1 - provider.confidence,
          confidence: provider.confidence * provider.weight,
          evidence: provider.evidence,
          limitations: provider.limitations,
          providerStatus: provider.state,
        };
      })
    : [{
        id: "provider_checks",
        source: "Awaiting Credentials",
        risk: 0.5,
        confidence: 0,
        evidence: [],
        limitations: [providers.error],
        providerStatus: "Failed",
      }];

  const heuristicSignal: FusionSignal = {
    id: "heuristic_baseline",
    source: "Heuristic Baseline",
    risk: heuristic.ok ? Math.min(1, heuristic.value.length * 0.18) : 0.5,
    confidence: input.heuristicBaseline ?? 0.65,
    evidence: heuristic.ok ? heuristic.value.map((signal) => signal.label) : [],
    limitations: heuristic.ok
      ? ["Heuristic baseline uses deterministic review signals, not trained ML."]
      : [heuristic.error],
  };

  return {
    signals: [...providerSignals, heuristicSignal],
    checks: [providers, heuristic, provenance, runtime, session, intent],
    providerResults: providers.ok ? providers.value : [],
    intentRisk: intent.ok && intent.value.riskScore != null
      ? {
          riskScore: intent.value.riskScore,
          recommendation: intent.value.recommendation as "allow" | "review" | "escalate" | "block",
          evidence: ["Declared intent risk evaluated in parallel."],
        }
      : null,
    sessionIntegrityRisk: session.ok ? session.value.risk : null,
    provenanceConfidence: provenance.ok ? provenance.value.confidence : null,
    runtimeAnomalyRisk: runtime.ok ? runtime.value.risk : null,
    partialConfidence: Number(
      ([providers, heuristic, provenance, runtime, session, intent].filter((check) => check.ok).length / 6).toFixed(2)
    ),
  };
}
