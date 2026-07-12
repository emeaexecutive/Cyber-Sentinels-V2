export type RuntimeProfileStage =
  | "provider_latency"
  | "trust_latency"
  | "workflow_latency"
  | "replay_latency"
  | "queue_latency"
  | "authorization_latency"
  | "dashboard_latency"
  | "database_query_latency"
  | "cache_efficiency";

type LegacyRuntimeProfileStage = "provider" | "trust" | "workflow" | "replay" | "queue" | "cache";

export type RuntimeProfileSample = {
  stage: RuntimeProfileStage;
  latencyMs: number;
  ok: boolean;
  degraded: boolean;
  recordedAt: string;
  metadata: Record<string, unknown>;
};

const samples: RuntimeProfileSample[] = [];
const maxSamples = 200;

export function recordRuntimeProfile(sample: Omit<RuntimeProfileSample, "recordedAt">) {
  const recorded: RuntimeProfileSample = {
    ...sample,
    latencyMs: Math.max(0, Math.round(sample.latencyMs)),
    recordedAt: new Date().toISOString(),
  };
  samples.unshift(recorded);
  samples.splice(maxSamples);
  return recorded;
}

function normalizeLegacyStage(stage: RuntimeProfileStage | LegacyRuntimeProfileStage): RuntimeProfileStage {
  if (stage === "provider") return "provider_latency";
  if (stage === "trust") return "trust_latency";
  if (stage === "workflow") return "workflow_latency";
  if (stage === "replay") return "replay_latency";
  if (stage === "queue") return "queue_latency";
  if (stage === "cache") return "cache_efficiency";
  return stage;
}

export function recordRuntimeProfileSample(sample: {
  stage: RuntimeProfileStage | LegacyRuntimeProfileStage;
  label: string;
  latencyMs: number;
  outcome: "ok" | "failed" | "degraded";
  metadata?: Record<string, unknown>;
}) {
  return recordRuntimeProfile({
    stage: normalizeLegacyStage(sample.stage),
    latencyMs: sample.latencyMs,
    ok: sample.outcome === "ok",
    degraded: sample.outcome !== "ok",
    metadata: {
      label: sample.label,
      ...(sample.metadata ?? {}),
    },
  });
}

function percentile(values: number[], percentileRank: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileRank / 100) * sorted.length) - 1);
  return sorted[index];
}

export function summarizeRuntimeProfiles(stage?: RuntimeProfileStage) {
  const scoped = stage ? samples.filter((sample) => sample.stage === stage) : samples;
  const latencies = scoped.map((sample) => sample.latencyMs);
  return {
    sampleCount: scoped.length,
    stage: stage ?? "all",
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    degradedCount: scoped.filter((sample) => sample.degraded).length,
    failureCount: scoped.filter((sample) => !sample.ok).length,
    cacheEfficiency: scoped.length
      ? Number((scoped.filter((sample) => sample.stage === "cache_efficiency" && !sample.degraded).length / scoped.length).toFixed(2))
      : null,
    boundary: "In-process profiling is readiness telemetry, not production APM.",
  };
}

export function getRuntimeProfileSamples(limit = 30) {
  return samples.slice(0, limit);
}

export function getSlowestRuntimeOperations(limit = 10) {
  return [...samples]
    .sort((left, right) => right.latencyMs - left.latencyMs)
    .slice(0, limit)
    .map((sample, index) => ({
      rank: index + 1,
      stage: sample.stage,
      latencyMs: sample.latencyMs,
      degraded: sample.degraded,
      ok: sample.ok,
      recordedAt: sample.recordedAt,
      label: typeof sample.metadata.label === "string" ? sample.metadata.label : sample.stage,
      metadata: sample.metadata,
    }));
}

function average(stage: RuntimeProfileStage) {
  const scoped = samples.filter((sample) => sample.stage === stage);
  if (!scoped.length) return null;
  return Math.round(scoped.reduce((total, sample) => total + sample.latencyMs, 0) / scoped.length);
}

export function getRuntimeProfileSnapshot(
  providerSnapshot: Array<{ name?: string; providerName?: string; state?: string; status?: string; latency_ms?: number; latencyMs?: number }> = []
) {
  const slowestProviderInput = [...providerSnapshot].sort(
    (left, right) => (right.latencyMs ?? right.latency_ms ?? 0) - (left.latencyMs ?? left.latency_ms ?? 0)
  )[0];
  const slowestStage = [...samples].sort((left, right) => right.latencyMs - left.latencyMs)[0] ?? null;
  const decisionSamples = samples.filter((sample) => sample.stage === "trust_latency" || sample.stage === "workflow_latency");
  const averageDecisionTimeMs = decisionSamples.length
    ? Math.round(decisionSamples.reduce((total, sample) => total + sample.latencyMs, 0) / decisionSamples.length)
    : null;

  return {
    slowestProvider: slowestProviderInput
      ? {
          label: slowestProviderInput.providerName ?? slowestProviderInput.name ?? "Provider",
          latencyMs: slowestProviderInput.latencyMs ?? slowestProviderInput.latency_ms ?? 0,
        }
      : null,
    slowestWorkflowStage: slowestStage
      ? {
          stage: slowestStage.stage,
          latencyMs: slowestStage.latencyMs,
        }
      : null,
    timeoutCount: providerSnapshot.filter((provider) => provider.state === "Timeout" || provider.status === "Timeout").length,
    failedProviderCount: providerSnapshot.filter((provider) => provider.state === "Failed" || provider.status === "Failed").length,
    averageDecisionTimeMs,
    cache: {
      hits: samples.filter((sample) => sample.stage === "cache_efficiency" && sample.ok).length,
      misses: samples.filter((sample) => sample.stage === "cache_efficiency" && !sample.ok).length,
    },
    stageAverages: {
      providerLatency: average("provider_latency"),
      trustLatency: average("trust_latency"),
      workflowLatency: average("workflow_latency"),
      replayLatency: average("replay_latency"),
      queueLatency: average("queue_latency"),
      authorizationLatency: average("authorization_latency"),
      dashboardLatency: average("dashboard_latency"),
      databaseQueryLatency: average("database_query_latency"),
      cacheEfficiency: average("cache_efficiency"),
    } satisfies Record<string, number | null>,
    slowestOperations: getSlowestRuntimeOperations(10),
    boundary: "In-process profile samples support readiness review; they are not production APM.",
  };
}
