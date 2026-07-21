import { providerCapabilities } from "./provider-capabilities.ts";
import type { ProviderCapability } from "./types.ts";

export const CONSENSUS_CAPABILITY_REGISTRY_VERSION = "consensus-capability-v2";

export type ProviderRegistrySnapshot = { version: string; generatedAt: string; providers: ProviderCapability[] };

export function consensusProviderRegistry(env?: Record<string, string | undefined>, now = new Date()): ProviderRegistrySnapshot {
  return { version: CONSENSUS_CAPABILITY_REGISTRY_VERSION, generatedAt: now.toISOString(), providers: providerCapabilities(env) };
}

export function registryChangeAudit(previous: ProviderRegistrySnapshot, next: ProviderRegistrySnapshot) {
  const before = new Map(previous.providers.map((provider) => [provider.providerKey, provider]));
  return next.providers.flatMap((provider) => {
    const old = before.get(provider.providerKey);
    if (old && JSON.stringify(old) === JSON.stringify(provider)) return [];
    return [{ providerKey: provider.providerKey, previousState: old?.state ?? null, state: provider.state, version: next.version, reasonCodes: provider.reasonCodes }];
  });
}
