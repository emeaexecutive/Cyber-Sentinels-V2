import type { OriComparisonCategory, OriOperatingMode } from "./types.ts";

export type OriTelemetryEvent = {
  event: "inference_start" | "inference_complete" | "inference_abstain" | "inference_failure" | "model_hash_failure" | "feature_validation_failure" | "reviewer_complete";
  correlationId: string;
  mode: OriOperatingMode;
  modelVersion: string;
  featureCoverage?: number;
  durationMs?: number;
  comparison?: OriComparisonCategory;
  recordedAt: string;
};

const retainedEvents: OriTelemetryEvent[] = [];
const maxRetainedEvents = 200;

export function recordOriTelemetry(event: OriTelemetryEvent) {
  retainedEvents.unshift({ ...event });
  if (retainedEvents.length > maxRetainedEvents) retainedEvents.length = maxRetainedEvents;
}

export function getOriTelemetrySnapshot(limit = 50) {
  return retainedEvents.slice(0, Math.max(0, Math.min(limit, maxRetainedEvents))).map((event) => ({ ...event }));
}

export function resetOriTelemetryForTests() {
  retainedEvents.length = 0;
}
