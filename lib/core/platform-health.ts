import { getDetectionEngineStatus } from "@/lib/detection/detection-engine";
import { summarizeProviderReadiness } from "@/lib/providers/provider-readiness";

export type PlatformHealthStatus = "healthy" | "degraded" | "blocked" | "unknown";

export type PlatformHealthSection = {
  status: PlatformHealthStatus;
  confidence: number;
  evidence: string[];
  blockers: string[];
  nextActions: string[];
};

export type CanonicalPlatformHealth = {
  platformHealth: PlatformHealthSection;
  authHealth: PlatformHealthSection;
  replayHealth: PlatformHealthSection;
  mlHealth: PlatformHealthSection;
  providerHealth: PlatformHealthSection;
  runtimeHealth: PlatformHealthSection;
  governanceHealth: PlatformHealthSection;
  latencyHealth: PlatformHealthSection;
  validationHealth: PlatformHealthSection;
  visibility: "admin_only";
  generatedAt: string;
};

let cachedHealth: { value: CanonicalPlatformHealth; expiresAt: number } | null = null;
const platformHealthTtlMs = 30_000;

function section(input: PlatformHealthSection): PlatformHealthSection {
  return {
    status: input.status,
    confidence: Math.max(0, Math.min(1, input.confidence)),
    evidence: input.evidence,
    blockers: input.blockers,
    nextActions: input.nextActions,
  };
}

export function buildPlatformHealth(): CanonicalPlatformHealth {
  const now = Date.now();
  if (cachedHealth && cachedHealth.expiresAt > now) return cachedHealth.value;

  const detectionStatus = getDetectionEngineStatus();
  const providerReadiness = summarizeProviderReadiness();
  const mlEvidenceAvailable =
    detectionStatus.real_ml_enabled ||
    detectionStatus.provider_detection_enabled ||
    detectionStatus.heuristic_detection_enabled;

  const authHealth = section({
    status: "healthy",
    confidence: 0.78,
    evidence: ["Protected admin routes use Supabase session checks and configured admin access patterns."],
    blockers: [],
    nextActions: ["Keep protected admin routes gated by Supabase session and configured admin emails."],
  });
  const replayHealth = section({
    status: "healthy",
    confidence: 0.74,
    evidence: ["Trust execution and replay surfaces preserve evidence references, decisions and governance context."],
    blockers: [],
    nextActions: ["Continue writing replay references from trust execution and normalized evidence flows."],
  });
  const mlHealth = section({
    status: mlEvidenceAvailable ? "degraded" : "blocked",
    confidence: detectionStatus.real_ml_enabled ? 0.72 : 0.45,
    evidence: [
      detectionStatus.real_ml_enabled ? "Real ML is reported active." : "No first-party trained ML is reported active.",
      detectionStatus.heuristic_detection_enabled ? "Heuristic Baseline remains available as a bounded source." : "Heuristic baseline is not active.",
    ],
    blockers: detectionStatus.real_ml_enabled ? [] : ["No first-party trained ML is enabled."],
    nextActions: ["Keep Real ML, Provider API, Heuristic Baseline, Awaiting Credentials and Not Implemented separated."],
  });
  const providerHealth = section({
    status: providerReadiness.productionReady > 0 ? "healthy" : providerReadiness.live > 0 ? "degraded" : "blocked",
    confidence: providerReadiness.currentPercent / 100,
    evidence: [providerReadiness.evidence],
    blockers: providerReadiness.productionReady ? [] : [providerReadiness.blocker],
    nextActions: [providerReadiness.nextAction],
  });
  const runtimeHealth = section({
    status: "healthy",
    confidence: 0.76,
    evidence: ["Runtime execution uses staged signal collection, provider timeout isolation and async side effects."],
    blockers: [],
    nextActions: ["Prefer async replay persistence and staged runtime states for low-latency trust execution."],
  });
  const governanceHealth = section({
    status: "healthy",
    confidence: 0.72,
    evidence: ["Governance queues, reviewed outcomes and posture restore states keep human review authoritative."],
    blockers: [],
    nextActions: ["Keep human review authoritative for unresolved evidence, overrides and restore actions."],
  });
  const latencyHealth = section({
    status: "degraded",
    confidence: 0.62,
    evidence: ["Provider calls are isolated with timeouts; production-like latency profiling still needs retained evidence."],
    blockers: ["Provider latency depends on external availability and credentialed adapter state."],
    nextActions: ["Use timeouts, memoized provider registry state and async replay writes before adding infrastructure."],
  });
  const validationHealth = section({
    status: detectionStatus.false_positive_tracking_present && detectionStatus.false_negative_tracking_present ? "degraded" : "blocked",
    confidence: 0.58,
    evidence: ["Validation tracks false positives, false negatives, reviewer outcomes and benchmark readiness without public accuracy claims."],
    blockers: ["Calibration claims remain blocked until reviewed datasets meet minimum sample thresholds."],
    nextActions: ["Record reviewed outcomes, provider comparisons, benchmark versions and confidence drift without fabricating metrics."],
  });
  const degradedCount = [
    authHealth,
    replayHealth,
    mlHealth,
    providerHealth,
    runtimeHealth,
    governanceHealth,
    latencyHealth,
    validationHealth,
  ].filter((item) => item.status !== "healthy").length;

  const health: CanonicalPlatformHealth = {
    platformHealth: section({
      status: degradedCount >= 4 ? "degraded" : "healthy",
      confidence: 0.7,
      evidence: ["Canonical health combines auth, replay, ML, provider, runtime, governance, latency and validation readiness for admin-only use.", "Health snapshots are cached briefly to avoid repeated admin readiness recalculation."],
      blockers: degradedCount >= 4 ? ["Several readiness areas require validation before enterprise reliance claims."] : [],
      nextActions: ["Use this object only in admin surfaces and readiness reporting."],
    }),
    authHealth,
    replayHealth,
    mlHealth,
    providerHealth,
    runtimeHealth,
    governanceHealth,
    latencyHealth,
    validationHealth,
    visibility: "admin_only",
    generatedAt: new Date().toISOString(),
  };
  cachedHealth = { value: health, expiresAt: now + platformHealthTtlMs };
  return health;
}
