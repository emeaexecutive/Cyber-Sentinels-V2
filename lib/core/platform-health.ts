import { getDetectionEngineStatus } from "@/lib/detection/detection-engine";
import { getGovernanceQueueSnapshot } from "@/lib/governance/governance-queue";
import {
  getRuntimeProfileSnapshot,
  getSlowestRuntimeOperations,
  getTrustFabricObservabilitySnapshot,
  summarizeRuntimeProfiles,
} from "@/lib/performance/runtime-profiler";
import type { ProviderOrchestrationResult } from "@/lib/providers/provider-orchestrator";
import {
  buildProviderReadinessChecklist,
  type ProviderReadinessCheck,
} from "@/lib/providers/provider-readiness";
import { getReplayQueueDiagnostics } from "@/lib/replay/replay-writer";

export type PlatformHealthStatus = "healthy" | "degraded" | "blocked" | "unknown";
export type MeasurementStatus = "measured" | "awaiting_data";
export type ProviderOperationalHealth =
  | "configured"
  | "healthy"
  | "degraded"
  | "offline"
  | "awaiting_credentials";

export type PlatformHealthSection = {
  status: PlatformHealthStatus;
  confidence: number | null;
  evidence: string[];
  blockers: string[];
  nextActions: string[];
};

export type HealthMeasurement = {
  value: number | null;
  unit: "ms" | "count";
  status: MeasurementStatus;
  sampleCount: number;
  source: string;
  limitation: string;
};

export type ProviderHealthSnapshot = {
  id: string;
  name: string;
  state: ProviderOperationalHealth;
  configured: boolean;
  credentialsPresent: boolean;
  latency: HealthMeasurement;
  limitation: string;
  nextAction: string;
};

export type CanonicalPlatformHealth = {
  applicationStatus: PlatformHealthStatus;
  platformHealth: PlatformHealthSection;
  authHealth: PlatformHealthSection;
  trustEngineHealth: PlatformHealthSection;
  databaseHealth: PlatformHealthSection;
  replayHealth: PlatformHealthSection;
  evidenceGraphHealth: PlatformHealthSection;
  trustMemoryHealth: PlatformHealthSection;
  apiHealth: PlatformHealthSection;
  mlHealth: PlatformHealthSection;
  providerHealth: PlatformHealthSection;
  runtimeHealth: PlatformHealthSection;
  governanceHealth: PlatformHealthSection;
  latencyHealth: PlatformHealthSection;
  validationHealth: PlatformHealthSection;
  providers: ProviderHealthSnapshot[];
  queues: {
    status: PlatformHealthStatus;
    governancePending: number;
    replayPending: number;
    failedJobs: number;
    retryQueued: number;
    source: "in_process";
    limitation: string;
  };
  latency: {
    dashboardLoad: HealthMeasurement;
    provider: HealthMeasurement;
    replayWrite: HealthMeasurement;
    trustDecision: HealthMeasurement;
    authorization: HealthMeasurement;
    evidenceWrite: HealthMeasurement;
    trustMemoryWrite: HealthMeasurement;
    parallelOrchestration: HealthMeasurement;
    queuePerformance: HealthMeasurement;
    cacheUsage: HealthMeasurement;
    largestDatabaseQuery: HealthMeasurement & { label: string | null };
  };
  observability: ReturnType<typeof getTrustFabricObservabilitySnapshot>;
  build: {
    version: string | null;
    deploymentTimestamp: string | null;
    source: "environment" | "unavailable";
  };
  visibility: "admin_only";
  generatedAt: string;
};

export type TrustDecisionRow = {
  created_at?: string | null;
  event_type?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type TrustDecisionMetrics = {
  windowStart: string;
  windowEnd: string;
  total: number;
  allow: number;
  review: number;
  escalate: number;
  block: number;
  perHour: Array<{
    hour: string;
    total: number;
    allow: number;
    review: number;
    escalate: number;
    block: number;
  }>;
  source: "trust_timeline_events";
  limitation: string;
};

type PlatformHealthInput = {
  providerSnapshot?: ProviderOrchestrationResult[];
  authConfigured?: boolean;
  databaseAvailable?: boolean;
  apiAvailable?: boolean;
};

function section(input: Omit<PlatformHealthSection, "confidence"> & { confidence?: number | null }): PlatformHealthSection {
  return { ...input, confidence: input.confidence ?? null };
}

function measurement(stage: Parameters<typeof summarizeRuntimeProfiles>[0], source: string): HealthMeasurement {
  const summary = summarizeRuntimeProfiles(stage);
  return {
    value: summary.p95LatencyMs,
    unit: "ms",
    status: summary.p95LatencyMs === null ? "awaiting_data" : "measured",
    sampleCount: summary.sampleCount,
    source,
    limitation: summary.boundary,
  };
}

function providerState(check: ProviderReadinessCheck, snapshot?: ProviderOrchestrationResult): ProviderOperationalHealth {
  if (!check.credentialPresent && check.runtimeState === "Awaiting Credentials") return "awaiting_credentials";
  if (snapshot?.state === "Timeout" || snapshot?.state === "Failed") return "offline";
  if (snapshot?.state === "Live" && check.latency.measured && check.health === "healthy") return "healthy";
  if (check.credentialPresent && !check.productionModeAvailable) return "degraded";
  return "configured";
}

function buildMetadata() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.BUILD_VERSION ?? null;
  const deploymentTimestamp = process.env.DEPLOYMENT_TIMESTAMP ?? process.env.VERCEL_DEPLOYMENT_TIMESTAMP ?? null;
  return {
    version,
    deploymentTimestamp,
    source: version || deploymentTimestamp ? "environment" as const : "unavailable" as const,
  };
}

export function buildPlatformHealth(input: PlatformHealthInput = {}): CanonicalPlatformHealth {
  const detection = getDetectionEngineStatus();
  const checks = buildProviderReadinessChecklist();
  const snapshotByName = new Map((input.providerSnapshot ?? []).map((provider) => [provider.name, provider]));
  const providers = checks.map<ProviderHealthSnapshot>((check) => {
    const snapshot = snapshotByName.get(check.name);
    const state = providerState(check, snapshot);
    return {
      id: check.id,
      name: check.name,
      state,
      configured: check.credentialPresent && check.productionModeAvailable,
      credentialsPresent: check.credentialPresent,
      latency: snapshot
        ? {
            value: snapshot.latency_ms,
            unit: "ms",
            status: "measured",
            sampleCount: 1,
            source: "provider orchestration snapshot",
            limitation: "This measures the local orchestration path; it is not a retained provider SLA or production APM percentile.",
          }
        : {
            value: null,
            unit: "ms",
            status: "awaiting_data",
            sampleCount: 0,
            source: "provider orchestration snapshot",
            limitation: "No provider orchestration sample is retained in this process.",
          },
      limitation: check.limitations.join(" "),
      nextAction: check.nextAction,
    };
  });

  const replayDiagnostics = getReplayQueueDiagnostics();
  const governancePending = getGovernanceQueueSnapshot(100).length;
  const queueStatus: PlatformHealthStatus = replayDiagnostics.failed || replayDiagnostics.retryQueued ? "degraded" : "healthy";
  const providerOffline = providers.filter((provider) => provider.state === "offline").length;
  const providerAwaiting = providers.filter((provider) => provider.state === "awaiting_credentials").length;
  const providerConfigured = providers.filter((provider) => ["configured", "healthy"].includes(provider.state)).length;
  const providerHealthy = providers.filter((provider) => provider.state === "healthy").length;
  const authHealth = section({
    status: input.authConfigured === true ? "healthy" : input.authConfigured === false ? "blocked" : "unknown",
    evidence: input.authConfigured === true ? ["Authenticated admin access completed for this health snapshot."] : [],
    blockers: input.authConfigured === false ? ["Authentication configuration is unavailable."] : [],
    nextActions: input.authConfigured === undefined ? ["Run health collection inside an authenticated admin request."] : [],
  });
  const replayHealth = section({
    status: replayDiagnostics.failed ? "degraded" : "healthy",
    evidence: [`${replayDiagnostics.pending} pending replay write(s); ${replayDiagnostics.failed} failed write(s).`],
    blockers: replayDiagnostics.failed ? ["One or more replay writes failed in this process."] : [],
    nextActions: replayDiagnostics.retryQueued ? ["Review the retry queue before relying on replay completeness."] : [],
  });
  const mlHealth = section({
    status: detection.real_ml_enabled || detection.provider_detection_enabled ? "healthy" : "degraded",
    evidence: [detection.real_ml_enabled ? "Verified first-party ML is active." : "No first-party trained ML is active.", detection.heuristic_detection_enabled ? "Heuristic baseline is active and labelled." : "Heuristic baseline is disabled."],
    blockers: [],
    nextActions: ["Keep measured, provider supplied, heuristic and awaiting-validation states separate."],
  });
  const providerHealth = section({
    status: providerOffline ? "degraded" : providerHealthy ? "healthy" : "unknown",
    evidence: [`${providerConfigured} configured provider path(s); ${providerHealthy} with a successful real health sample; ${providerAwaiting} awaiting credentials; ${providerOffline} offline.`],
    blockers: providerOffline ? [`${providerOffline} provider path(s) are offline.`] : [],
    nextActions: providerAwaiting ? ["Configure only the providers approved for the deployment and validate their limitations."] : [],
  });
  const runtimeSnapshot = getRuntimeProfileSnapshot(input.providerSnapshot);
  const runtimeHealth = section({
    status: runtimeSnapshot.failedProviderCount || runtimeSnapshot.timeoutCount
      ? "degraded"
      : runtimeSnapshot.slowestOperations.length
        ? "healthy"
        : "unknown",
    evidence: [`${runtimeSnapshot.slowestOperations.length} retained in-process runtime sample(s) are available for slow-operation review.`],
    blockers: [],
    nextActions: runtimeSnapshot.slowestOperations.length ? ["Review the slowest measured operation before adding infrastructure."] : ["Generate a trust decision to populate runtime measurements."],
  });
  const governanceHealth = section({
    status: queueStatus,
    evidence: [`${governancePending} governance job(s) are visible in the in-process queue.`],
    blockers: [],
    nextActions: governancePending ? ["Assign review ownership and confirm queue age in the durable workflow record."] : [],
  });

  const slowestDatabaseQuery = getSlowestRuntimeOperations(200).find((sample) => sample.stage === "database_query_latency") ?? null;
  const latency = {
    dashboardLoad: measurement("dashboard_latency", "runtime profiler"),
    provider: measurement("provider_latency", "runtime profiler"),
    replayWrite: measurement("replay_latency", "replay writer runtime profiler"),
    trustDecision: measurement("trust_latency", "trust execution runtime profiler"),
    authorization: measurement("authorization_latency", "admin authorization runtime profiler"),
    evidenceWrite: measurement("evidence_graph_latency", "Evidence Graph runtime profiler"),
    trustMemoryWrite: measurement("trust_memory_latency", "Trust Memory runtime profiler"),
    parallelOrchestration: measurement("parallel_orchestration_latency", "parallel signal runtime profiler"),
    queuePerformance: measurement("queue_latency", "queue runtime profiler"),
    cacheUsage: measurement("cache_efficiency", "cache runtime profiler"),
    largestDatabaseQuery: {
      ...measurement("database_query_latency", "admin database query runtime profiler"),
      label: slowestDatabaseQuery?.label ?? null,
    },
  };
  const measuredLatencyCount = Object.values(latency).filter((item) => item.status === "measured").length;
  const trustEngineHealth = section({
    status: latency.trustDecision.status === "measured" ? "healthy" : "unknown",
    evidence: latency.trustDecision.status === "measured"
      ? [`${latency.trustDecision.sampleCount} in-process Trust Engine measurement(s) are available.`]
      : [],
    blockers: [],
    nextActions: latency.trustDecision.status === "measured" ? [] : ["Generate a governed trust decision before inferring Trust Engine health."],
  });
  const evidenceGraphHealth = section({
    status: latency.evidenceWrite.status === "measured" ? "healthy" : "unknown",
    evidence: latency.evidenceWrite.status === "measured"
      ? [`${latency.evidenceWrite.sampleCount} in-process Evidence Graph write measurement(s) are available.`]
      : [],
    blockers: [],
    nextActions: latency.evidenceWrite.status === "measured" ? [] : ["Exercise an evidence write before inferring Evidence Graph health."],
  });
  const trustMemoryHealth = section({
    status: latency.trustMemoryWrite.status === "measured" ? "healthy" : "unknown",
    evidence: latency.trustMemoryWrite.status === "measured"
      ? [`${latency.trustMemoryWrite.sampleCount} in-process Trust Memory write measurement(s) are available.`]
      : [],
    blockers: [],
    nextActions: latency.trustMemoryWrite.status === "measured" ? [] : ["Exercise a Trust Memory write before inferring Trust Memory health."],
  });
  const apiHealth = section({
    status: input.apiAvailable === true ? "healthy" : input.apiAvailable === false ? "degraded" : "unknown",
    evidence: input.apiAvailable === true ? ["The API health probe completed during this protected snapshot."] : [],
    blockers: input.apiAvailable === false ? ["The API health probe failed during this protected snapshot."] : [],
    nextActions: input.apiAvailable === undefined ? ["Run an authenticated deployment health probe before inferring API health."] : [],
  });
  const databaseHealth = section({
    status: input.databaseAvailable === true ? "healthy" : input.databaseAvailable === false ? "degraded" : "unknown",
    evidence: input.databaseAvailable === true ? ["The protected platform-health query completed successfully."] : [],
    blockers: input.databaseAvailable === false ? ["The protected platform-health query did not complete."] : [],
    nextActions: input.databaseAvailable === undefined ? ["Run the protected platform-health query before inferring database health."] : [],
  });
  const latencyHealth = section({
    status: measuredLatencyCount ? "healthy" : "unknown",
    evidence: [`${measuredLatencyCount} of ${Object.keys(latency).length} latency categories have in-process measurements.`],
    blockers: [],
    nextActions: measuredLatencyCount < Object.keys(latency).length ? ["Exercise the missing runtime paths; do not substitute zero for absent measurements."] : [],
  });
  const validationHealth = section({
    status: detection.false_positive_tracking_present && detection.false_negative_tracking_present ? "degraded" : "blocked",
    evidence: ["False-positive and false-negative tracking paths exist; production cohorts still require reviewed data."],
    blockers: ["Published accuracy and calibration remain blocked until reviewed sample thresholds are met."],
    nextActions: ["Collect reviewed outcomes and dataset-scoped benchmark evidence."],
  });
  const applicationStatus: PlatformHealthStatus = authHealth.status === "blocked"
    ? "blocked"
    : providerOffline || replayDiagnostics.failed || databaseHealth.status === "degraded"
      ? "degraded"
      : [authHealth.status, trustEngineHealth.status, runtimeHealth.status, databaseHealth.status].includes("unknown")
        ? "unknown"
        : "healthy";
  const platformHealth = section({
    status: applicationStatus,
    evidence: ["Application status is derived from authenticated access, Trust Engine measurements, provider runtime state, replay writes, queue diagnostics and the protected database check."],
    blockers: applicationStatus === "blocked" ? ["A required application dependency is blocked."] : [],
    nextActions: applicationStatus === "degraded" ? ["Resolve failed database, Replay or provider diagnostics before enterprise reliance."] : [],
  });

  return {
    applicationStatus,
    platformHealth,
    authHealth,
    trustEngineHealth,
    databaseHealth,
    replayHealth,
    evidenceGraphHealth,
    trustMemoryHealth,
    apiHealth,
    mlHealth,
    providerHealth,
    runtimeHealth,
    governanceHealth,
    latencyHealth,
    validationHealth,
    providers,
    queues: {
      status: queueStatus,
      governancePending,
      replayPending: replayDiagnostics.pending,
      failedJobs: replayDiagnostics.failed,
      retryQueued: replayDiagnostics.retryQueued,
      source: "in_process",
      limitation: `${replayDiagnostics.boundary} Governance queue counts are also process-local.`,
    },
    latency,
    observability: getTrustFabricObservabilitySnapshot({
      governancePending,
      replayPending: replayDiagnostics.pending,
    }),
    build: buildMetadata(),
    visibility: "admin_only",
    generatedAt: new Date().toISOString(),
  };
}

function normalizeDecision(row: TrustDecisionRow): "allow" | "review" | "escalate" | "block" | null {
  const value = String(row.metadata?.decision ?? row.event_type ?? "").toLowerCase();
  if (value.includes("allow")) return "allow";
  if (value.includes("block")) return "block";
  if (value.includes("escalat")) return "escalate";
  if (value.includes("review") || value.includes("step_up") || value.includes("stepup")) return "review";
  return null;
}

export function buildTrustDecisionMetrics(rows: TrustDecisionRow[], now = new Date()): TrustDecisionMetrics {
  const windowEnd = new Date(now);
  const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);
  const buckets = new Map<string, TrustDecisionMetrics["perHour"][number]>();
  for (let index = 23; index >= 0; index -= 1) {
    const hour = new Date(windowEnd.getTime() - index * 60 * 60 * 1000);
    hour.setMinutes(0, 0, 0);
    const key = hour.toISOString();
    buckets.set(key, { hour: key, total: 0, allow: 0, review: 0, escalate: 0, block: 0 });
  }

  rows.forEach((row) => {
    const createdAt = row.created_at ? new Date(row.created_at) : null;
    const decision = normalizeDecision(row);
    if (!createdAt || Number.isNaN(createdAt.getTime()) || createdAt < windowStart || createdAt > windowEnd || !decision) return;
    createdAt.setMinutes(0, 0, 0);
    const bucket = buckets.get(createdAt.toISOString());
    if (!bucket) return;
    bucket.total += 1;
    bucket[decision] += 1;
  });
  const perHour = [...buckets.values()];
  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    total: perHour.reduce((total, bucket) => total + bucket.total, 0),
    allow: perHour.reduce((total, bucket) => total + bucket.allow, 0),
    review: perHour.reduce((total, bucket) => total + bucket.review, 0),
    escalate: perHour.reduce((total, bucket) => total + bucket.escalate, 0),
    block: perHour.reduce((total, bucket) => total + bucket.block, 0),
    perHour,
    source: "trust_timeline_events",
    limitation: "Counts include retained trust workflow decisions in the last 24 hours. Missing or unclassified events are not inferred.",
  };
}
