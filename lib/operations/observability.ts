export type ObservabilityTrace = {
  name: string;
  correlationId: string;
  operationType: string;
  resultState: string;
  durationMs?: number;
  providerState?: string;
  reasonCode?: string;
  environment: string;
  applicationSha: string;
};

const observabilityProviderStatus = "OBSERVABILITY PROVIDER NOT CONFIGURED";

export function redactTracePayload<T extends Record<string, unknown>>(payload: T): T & {
  accessToken: string;
  email: string;
  providerState: string;
  resultState: string;
  reasonCode: string;
} {
  return {
    ...payload,
    accessToken: "[REDACTED]",
    email: "[REDACTED]",
    providerState: payload.providerState ?? "unknown",
    resultState: payload.resultState ?? "unknown",
    reasonCode: payload.reasonCode ?? "unknown",
  } as T & {
    accessToken: string;
    email: string;
    providerState: string;
    resultState: string;
    reasonCode: string;
  };
}

export function emitTraceSpan(name: string, input: Omit<ObservabilityTrace, "name">): ObservabilityTrace {
  return {
    name,
    correlationId: input.correlationId,
    operationType: input.operationType,
    resultState: input.resultState,
    durationMs: input.durationMs,
    providerState: input.providerState,
    reasonCode: input.reasonCode,
    environment: input.environment,
    applicationSha: input.applicationSha,
  };
}

export function getObservabilityProviderStatus() {
  return observabilityProviderStatus;
}
