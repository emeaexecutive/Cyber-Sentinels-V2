import type { ProviderHealthSnapshot } from "./types.ts";

const retained = new Map<string, ProviderHealthSnapshot>();

export function retainProviderHealth(snapshot: ProviderHealthSnapshot) {
  retained.set(`${snapshot.provider}:${snapshot.environment}`, snapshot);
  return snapshot;
}

export function getRetainedProviderHealth() {
  return [...retained.values()];
}
