import type { ProviderConsensusHealthSnapshot, ProviderHealthState } from "./types.ts";

export function deriveProviderHealth(input: Omit<ProviderConsensusHealthSnapshot, "state" | "reasonCodes"> & { credentialsConfigured: boolean; enabled: boolean; incidentOpen?: boolean }): ProviderConsensusHealthSnapshot {
  const reasons: string[] = [];
  let state: ProviderHealthState = "HEALTHY";
  if (!input.enabled) { state = "DISABLED"; reasons.push("PROVIDER_DISABLED"); }
  else if (!input.credentialsConfigured) { state = "BLOCKED"; reasons.push("PROVIDER_CREDENTIALS_INCOMPLETE"); }
  else if (input.circuitOpen || input.incidentOpen) { state = "UNAVAILABLE"; reasons.push("PROVIDER_CIRCUIT_OR_INCIDENT_OPEN"); }
  else if ((input.errorRate ?? 0) >= 0.05 || (input.timeoutRate ?? 0) >= 0.05 || input.signatureFailures > 0 || input.schemaFailures > 0) { state = "DEGRADED"; reasons.push("PROVIDER_HEALTH_DEGRADED"); }
  return { providerKey: input.providerKey, state, observedAt: input.observedAt, latencyMs: input.latencyMs, errorRate: input.errorRate, timeoutRate: input.timeoutRate, signatureFailures: input.signatureFailures, schemaFailures: input.schemaFailures, circuitOpen: input.circuitOpen, reasonCodes: reasons };
}

export const healthMultiplier = (state: ProviderHealthState) => ({ HEALTHY: 1, DEGRADED: 0.5, UNKNOWN: 0.25, UNAVAILABLE: 0, DISABLED: 0, BLOCKED: 0 }[state]);
