import { getDetectionEngineStatus } from "@/lib/detection/detection-engine";
import { summarizeProviderReadiness } from "@/lib/providers/provider-readiness";

export type PlatformHealthStatus = "healthy" | "degraded" | "blocked" | "unknown";

export type PlatformHealthSection = {
  status: PlatformHealthStatus;
  confidence: number;
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

function section(input: PlatformHealthSection): PlatformHealthSection {
  return {
    status: input.status,
    confidence: Math.max(0, Math.min(1, input.confidence)),
    blockers: input.blockers,
    nextActions: input.nextActions,
  };
}

export function buildPlatformHealth(): CanonicalPlatformHealth {
  const detectionStatus = getDetectionEngineStatus();
  const providerReadiness = summarizeProviderReadiness();
  const mlEvidenceAvailable =
    detectionStatus.real_ml_enabled ||
    detectionStatus.provider_detection_enabled ||
    detectionStatus.heuristic_detection_enabled;

  const authHealth = section({
    status: "healthy",
    confidence: 0.78,
    blockers: [],
    nextActions: ["Keep protected admin routes gated by Supabase session and configured admin emails."],
  });
  const replayHealth = section({
    status: "healthy",
    confidence: 0.74,
    blockers: [],
    nextActions: ["Continue writing replay references from trust execution and normalized evidence flows."],
  });
  const mlHealth = section({
    status: mlEvidenceAvailable ? "degraded" : "blocked",
    confidence: detectionStatus.real_ml_enabled ? 0.72 : 0.45,
    blockers: detectionStatus.real_ml_enabled ? [] : ["No first-party trained ML is enabled."],
    nextActions: ["Keep Real ML, Provider API, Heuristic Baseline, Awaiting Credentials and Not Implemented separated."],
  });
  const providerHealth = section({
    status: providerReadiness.productionReady > 0 ? "healthy" : providerReadiness.live > 0 ? "degraded" : "blocked",
    confidence: providerReadiness.currentPercent / 100,
    blockers: providerReadiness.productionReady ? [] : [providerReadiness.blocker],
    nextActions: [providerReadiness.nextAction],
  });
  const runtimeHealth = section({
    status: "healthy",
    confidence: 0.76,
    blockers: [],
    nextActions: ["Prefer async replay persistence and staged runtime states for low-latency trust execution."],
  });
  const governanceHealth = section({
    status: "healthy",
    confidence: 0.72,
    blockers: [],
    nextActions: ["Keep human review authoritative for unresolved evidence, overrides and restore actions."],
  });
  const latencyHealth = section({
    status: "degraded",
    confidence: 0.62,
    blockers: ["Provider latency depends on external availability and credentialed adapter state."],
    nextActions: ["Use timeouts, memoized provider registry state and async replay writes before adding infrastructure."],
  });
  const validationHealth = section({
    status: detectionStatus.false_positive_tracking_present && detectionStatus.false_negative_tracking_present ? "degraded" : "blocked",
    confidence: 0.58,
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

  return {
    platformHealth: section({
      status: degradedCount >= 4 ? "degraded" : "healthy",
      confidence: 0.7,
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
}
