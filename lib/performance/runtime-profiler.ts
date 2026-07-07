import { getRecentTrustEvents } from "../events/event-bus.ts";
import { getGovernanceQueueSnapshot } from "../governance/governance-queue.ts";
import { pendingReplayJobs } from "../replay/replay-writer.ts";

export type RuntimeProfileStage =
  | "provider"
  | "signal_fusion"
  | "trust_algorithm"
  | "replay_write"
  | "governance_queue"
  | "api_response"
  | "cache";

export type RuntimeProfileSample = {
  id: string;
  stage: RuntimeProfileStage;
  label: string;
  latencyMs: number;
  outcome: "ok" | "timeout" | "failed" | "cache_hit" | "cache_miss";
  createdAt: string;
};

const samples: RuntimeProfileSample[] = [];

export function recordRuntimeProfileSample(input: Omit<RuntimeProfileSample, "id" | "createdAt">) {
  const sample: RuntimeProfileSample = {
    ...input,
    id: crypto.randomUUID(),
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    createdAt: new Date().toISOString(),
  };
  samples.unshift(sample);
  samples.splice(200);
  return sample;
}

export function getRuntimeProfileSnapshot(providerSamples: Array<{ name: string; latency_ms: number; state: string }> = []) {
  const syntheticSamples: RuntimeProfileSample[] = [
    ...providerSamples.map((provider) => ({
      id: `provider:${provider.name}`,
      stage: "provider" as const,
      label: provider.name,
      latencyMs: provider.latency_ms,
      outcome: provider.state === "Timeout" ? "timeout" as const : provider.state === "Failed" ? "failed" as const : "ok" as const,
      createdAt: new Date().toISOString(),
    })),
    {
      id: "governance:queue",
      stage: "governance_queue",
      label: "Governance queue",
      latencyMs: getGovernanceQueueSnapshot(100).length,
      outcome: "ok",
      createdAt: new Date().toISOString(),
    },
    {
      id: "replay:pending",
      stage: "replay_write",
      label: "Replay write queue",
      latencyMs: pendingReplayJobs(),
      outcome: "ok",
      createdAt: new Date().toISOString(),
    },
  ];
  const allSamples = [...samples, ...syntheticSamples];
  const byStage = (stage: RuntimeProfileStage) => allSamples.filter((sample) => sample.stage === stage);
  const average = (items: RuntimeProfileSample[]) =>
    items.length ? Math.round(items.reduce((total, item) => total + item.latencyMs, 0) / items.length) : 0;
  const slowest = [...allSamples].sort((a, b) => b.latencyMs - a.latencyMs)[0] ?? null;
  const providerItems = byStage("provider");
  const events = getRecentTrustEvents(100);
  return {
    sampleCount: allSamples.length,
    slowestProvider: [...providerItems].sort((a, b) => b.latencyMs - a.latencyMs)[0] ?? null,
    slowestWorkflowStage: slowest,
    timeoutCount: allSamples.filter((sample) => sample.outcome === "timeout").length + events.filter((event) => event.name === "provider.timeout").length,
    failedProviderCount: providerItems.filter((sample) => sample.outcome === "failed").length + events.filter((event) => event.name === "provider.failed").length,
    averageDecisionTimeMs: average(allSamples.filter((sample) => sample.stage !== "cache")),
    cache: {
      hits: allSamples.filter((sample) => sample.outcome === "cache_hit").length,
      misses: allSamples.filter((sample) => sample.outcome === "cache_miss").length,
    },
    stageAverages: {
      providerLatencyMs: average(byStage("provider")),
      signalFusionLatencyMs: average(byStage("signal_fusion")),
      trustAlgorithmLatencyMs: average(byStage("trust_algorithm")),
      replayWriteLatencyMs: average(byStage("replay_write")),
      governanceQueueLatencyMs: average(byStage("governance_queue")),
      apiResponseTimeMs: average(byStage("api_response")),
    },
    samples: allSamples.slice(0, 20),
    boundary: "Runtime profiling is in-process telemetry. It does not replace production APM or paid-provider load testing.",
  };
}
