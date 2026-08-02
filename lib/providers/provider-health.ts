import type { ProviderOperationalHealthSnapshot } from "./types.ts";

const retained = new Map<string, ProviderOperationalHealthSnapshot>();

export function retainProviderHealth(snapshot: ProviderOperationalHealthSnapshot) {
  retained.set(`${snapshot.provider}:${snapshot.environment}`, snapshot);
  return snapshot;
}

export function getRetainedProviderHealth() {
  return [...retained.values()];
}
