export type ProviderTelemetryEvent =
  | "session_creation_started"
  | "session_creation_completed"
  | "session_creation_failed"
  | "session_retrieved"
  | "callback_received"
  | "callback_verified"
  | "callback_rejected"
  | "callback_duplicate"
  | "evidence_normalized"
  | "evidence_persisted"
  | "pipeline_completed"
  | "pipeline_failed"
  | "health_changed";

export type SanitizedProviderTelemetry = {
  event: ProviderTelemetryEvent;
  provider: string;
  correlationId: string;
  tenantId?: string;
  providerSessionId?: string;
  durationMs?: number;
  outcome?: string;
  recordedAt: string;
};

const retained: SanitizedProviderTelemetry[] = [];

export function recordProviderTelemetry(input: Omit<SanitizedProviderTelemetry, "recordedAt">) {
  retained.push({ ...input, recordedAt: new Date().toISOString() });
  if (retained.length > 200) retained.splice(0, retained.length - 200);
}

export function getProviderTelemetry(limit = 50) {
  return retained.slice(-Math.max(1, Math.min(200, limit)));
}
