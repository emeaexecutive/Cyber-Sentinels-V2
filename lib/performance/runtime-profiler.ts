import { isProductionBuildPhase } from "../env.ts";

export type RuntimeProfileStage =
  | "lifecycle_orchestration_latency"
  | "provider_latency"
  | "provider_callback_latency"
  | "provider_normalization_latency"
  | "consensus_latency"
  | "trust_latency"
  | "workflow_latency"
  | "replay_latency"
  | "queue_latency"
  | "authorization_latency"
  | "enforcement_latency"
  | "evidence_graph_latency"
  | "trust_memory_latency"
  | "trust_profile_latency"
  | "evidence_pack_latency"
  | "parallel_orchestration_latency"
  | "governance_queue_latency"
  | "dashboard_latency"
  | "database_query_latency"
  | "queue_throughput"
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

export type TrustFabricObservabilityMetric = {
  id:
    | "trust_decision_latency"
    | "replay_latency"
    | "provider_latency"
    | "queue_depth"
    | "error_rate"
    | "decision_throughput"
    | "authority_validation_time"
    | "evidence_write_time";
  label: string;
  value: number | null;
  unit: "ms" | "count" | "percent" | "per_hour";
  status: "measured" | "awaiting_data";
  sampleCount: number;
  source: string;
  limitation: string;
};

export type OperationalPerformanceProfile = {
  id: "replay" | "evidence_graph" | "trust_decision" | "provider_calls" | "provider_normalization" | "trust_profile_generation" | "database" | "queues" | "queue_throughput";
  label: string;
  stages: RuntimeProfileStage[];
  sampleCount: number;
  averageLatencyMs: number | null;
  p95LatencyMs: number | null;
  timeoutCount: number | null;
  slowOperationCount: number | null;
  slowThresholdMs: number;
  status: "measured" | "awaiting_data";
  limitation: string;
};

const samples: RuntimeProfileSample[] = [];
const maxSamples = 200;

export function recordRuntimeProfile(sample: Omit<RuntimeProfileSample, "recordedAt">) {
  const recorded: RuntimeProfileSample = {
    ...sample,
    latencyMs: Math.max(0, Number(sample.latencyMs.toFixed(3))),
    recordedAt: new Date().toISOString(),
  };
  samples.unshift(recorded);
  samples.splice(maxSamples);
  if (
    !isProductionBuildPhase() &&
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    sample.metadata?.correlationId
  ) {
    void import("./durable-telemetry")
      .then(({ retainRuntimeProfileSample }) => retainRuntimeProfileSample(recorded))
      .catch((error) => console.error("Durable operational measurement write failed.", {
        stage: recorded.stage,
        error_name: error instanceof Error ? error.name : "unknown",
      }));
  }
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

export function recordQueueThroughput(input: { itemsProcessed: number; durationMs: number; queue: string; ok?: boolean }) {
  const itemsProcessed = Math.max(0, Math.floor(input.itemsProcessed));
  const durationMs = Math.max(0, input.durationMs);
  return recordRuntimeProfile({
    stage: "queue_throughput",
    latencyMs: durationMs,
    ok: input.ok ?? true,
    degraded: !(input.ok ?? true),
    metadata: {
      label: `${input.queue} queue batch`,
      queue: input.queue,
      itemsProcessed,
      itemsPerSecond: durationMs > 0 ? Number(((itemsProcessed / durationMs) * 1000).toFixed(3)) : null,
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

const operationalProfileDefinitions: Array<{
  id: OperationalPerformanceProfile["id"];
  label: string;
  stages: RuntimeProfileStage[];
  slowThresholdMs: number;
}> = [
  { id: "replay", label: "Replay", stages: ["replay_latency"], slowThresholdMs: 200 },
  { id: "evidence_graph", label: "Evidence Graph", stages: ["evidence_graph_latency"], slowThresholdMs: 200 },
  { id: "trust_decision", label: "Trust Decision", stages: ["trust_latency"], slowThresholdMs: 300 },
  { id: "provider_calls", label: "Provider calls", stages: ["provider_latency"], slowThresholdMs: 8_000 },
  { id: "provider_normalization", label: "Provider normalization", stages: ["provider_normalization_latency"], slowThresholdMs: 50 },
  { id: "trust_profile_generation", label: "Trust profile generation", stages: ["trust_profile_latency"], slowThresholdMs: 200 },
  { id: "database", label: "Database", stages: ["database_query_latency"], slowThresholdMs: 250 },
  { id: "queues", label: "Queues", stages: ["queue_latency", "governance_queue_latency"], slowThresholdMs: 500 },
  { id: "queue_throughput", label: "Queue throughput", stages: ["queue_throughput"], slowThresholdMs: 1_000 },
];

export function getOperationalPerformanceProfile(): OperationalPerformanceProfile[] {
  return operationalProfileDefinitions.map((definition) => {
    const scoped = samples.filter((sample) => definition.stages.includes(sample.stage));
    const latencies = scoped.map((sample) => sample.latencyMs);
    const averageLatencyMs = latencies.length
      ? Number((latencies.reduce((total, latency) => total + latency, 0) / latencies.length).toFixed(3))
      : null;
    return {
      ...definition,
      sampleCount: scoped.length,
      averageLatencyMs,
      p95LatencyMs: percentile(latencies, 95),
      timeoutCount: scoped.length
        ? scoped.filter((sample) => sample.metadata.timeout === true).length
        : null,
      slowOperationCount: scoped.length
        ? scoped.filter((sample) => sample.latencyMs >= definition.slowThresholdMs).length
        : null,
      status: scoped.length ? "measured" : "awaiting_data",
      limitation: "Process-local retained samples only; thresholds identify investigation candidates and do not define an SLA.",
    };
  });
}

function average(stage: RuntimeProfileStage) {
  const scoped = samples.filter((sample) => sample.stage === stage);
  if (!scoped.length) return null;
  return Math.round(scoped.reduce((total, sample) => total + sample.latencyMs, 0) / scoped.length);
}

function latencyMetric(
  id: TrustFabricObservabilityMetric["id"],
  label: string,
  stage: RuntimeProfileStage,
  source: string
): TrustFabricObservabilityMetric {
  const summary = summarizeRuntimeProfiles(stage);
  return {
    id,
    label,
    value: summary.p95LatencyMs,
    unit: "ms",
    status: summary.p95LatencyMs === null ? "awaiting_data" : "measured",
    sampleCount: summary.sampleCount,
    source,
    limitation: summary.boundary,
  };
}

export function getTrustFabricObservabilitySnapshot(input: {
  governancePending?: number;
  replayPending?: number;
} = {}) {
  const all = summarizeRuntimeProfiles();
  const decisionsInWindow = samples.filter((sample) => {
    if (sample.stage !== "trust_latency") return false;
    return Date.now() - Date.parse(sample.recordedAt) <= 60 * 60 * 1000;
  });
  const queueDepthAvailable = Number.isFinite(input.governancePending)
    && Number.isFinite(input.replayPending);
  const queueDepth = queueDepthAvailable
    ? Number(input.governancePending) + Number(input.replayPending)
    : null;
  const metrics: TrustFabricObservabilityMetric[] = [
    latencyMetric("trust_decision_latency", "Trust Decision latency", "trust_latency", "Trust Engine runtime profiler"),
    latencyMetric("replay_latency", "Replay latency", "replay_latency", "Replay writer runtime profiler"),
    latencyMetric("provider_latency", "Provider latency", "provider_latency", "Provider orchestration runtime profiler"),
    {
      id: "queue_depth",
      label: "Queue depth",
      value: queueDepth,
      unit: "count",
      status: queueDepth === null ? "awaiting_data" : "measured",
      sampleCount: queueDepth === null ? 0 : 1,
      source: "Replay and governance in-process queues",
      limitation: "Queue depth is process-local and is not a durable, fleet-wide queue measurement.",
    },
    {
      id: "error_rate",
      label: "Error rate",
      value: all.sampleCount
        ? Number(((all.failureCount / all.sampleCount) * 100).toFixed(2))
        : null,
      unit: "percent",
      status: all.sampleCount ? "measured" : "awaiting_data",
      sampleCount: all.sampleCount,
      source: "In-process runtime profiler outcomes",
      limitation: "The rate covers retained profiler samples only; it is not a production error budget or fleet rate.",
    },
    {
      id: "decision_throughput",
      label: "Decision throughput",
      value: decisionsInWindow.length || null,
      unit: "per_hour",
      status: decisionsInWindow.length ? "measured" : "awaiting_data",
      sampleCount: decisionsInWindow.length,
      source: "Trust Decision samples retained during the last hour",
      limitation: "Throughput is process-local and counts retained Trust Engine samples, not durable production traffic.",
    },
    latencyMetric("authority_validation_time", "Authority validation time", "authorization_latency", "Authorization runtime profiler"),
    latencyMetric("evidence_write_time", "Evidence write time", "evidence_graph_latency", "Evidence Graph runtime profiler"),
  ];

  return {
    metrics,
    generatedAt: new Date().toISOString(),
    visibility: "admin_only" as const,
    boundary: "Metrics are process-local operational readiness signals. Missing samples remain Awaiting data and are never coerced to zero.",
  };
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
      trustOrchestratorLatency: average("lifecycle_orchestration_latency"),
      providerLatency: average("provider_latency"),
      consensusLatency: average("consensus_latency"),
      trustLatency: average("trust_latency"),
      workflowLatency: average("workflow_latency"),
      replayLatency: average("replay_latency"),
      queueLatency: average("queue_latency"),
      authorizationLatency: average("authorization_latency"),
      enforcementLatency: average("enforcement_latency"),
      evidenceGraphLatency: average("evidence_graph_latency"),
      trustMemoryLatency: average("trust_memory_latency"),
      evidencePackLatency: average("evidence_pack_latency"),
      parallelOrchestrationLatency: average("parallel_orchestration_latency"),
      governanceQueueLatency: average("governance_queue_latency"),
      dashboardLatency: average("dashboard_latency"),
      databaseQueryLatency: average("database_query_latency"),
      cacheEfficiency: average("cache_efficiency"),
    } satisfies Record<string, number | null>,
    slowestOperations: getSlowestRuntimeOperations(10),
    boundary: "In-process profile samples support readiness review; they are not production APM.",
  };
}
