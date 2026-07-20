import type { ProviderCapability, ProviderObservation } from "./types.ts";

export type IndependenceAssessment = { observationId: string; group: ProviderCapability["independenceGroup"] | null; multiplier: number; reasonCode: string | null };

export function assessIndependence(observations: ProviderObservation[], capabilities: ProviderCapability[], correlationPenalty: number): IndependenceAssessment[] {
  const capability = new Map(capabilities.map((entry) => [entry.providerKey, entry])); const seen = new Set<string>();
  return [...observations].sort((a,b)=>a.observationId.localeCompare(b.observationId)).map((observation) => {
    const group = capability.get(observation.providerKey)?.independenceGroup ?? null;
    if (!group) return { observationId: observation.observationId, group, multiplier: 0, reasonCode: "UNKNOWN_PROVIDER" };
    const correlation = `${group}:${observation.correlationKey ?? observation.providerKey}`;
    if (seen.has(correlation)) return { observationId: observation.observationId, group, multiplier: correlationPenalty, reasonCode: "CORRELATED_EVIDENCE_PENALTY" };
    seen.add(correlation); return { observationId: observation.observationId, group, multiplier: 1, reasonCode: null };
  });
}
