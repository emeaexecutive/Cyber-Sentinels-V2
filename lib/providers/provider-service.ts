import "server-only";

import { HopaeAdapter } from "./adapters/hopae/hopae-adapter.ts";
import { ProviderError } from "./errors.ts";
import type { IdentityProviderAdapter, IdentityProviderId } from "./types.ts";

const serverSelectedProvider: IdentityProviderId = "hopae_connect";

export function getServerSelectedIdentityProvider() {
  return serverSelectedProvider;
}

export function getProviderAdapter(provider: IdentityProviderId, correlationId: string): IdentityProviderAdapter {
  if (provider === "hopae_connect") return new HopaeAdapter({ correlationId });
  throw new ProviderError("PROVIDER_DISABLED", "Identity provider is not enabled for this workflow.", `No active adapter is registered for ${provider}.`, false, provider, correlationId);
}

export function getSelectedProviderAdapter(correlationId: string) {
  return getProviderAdapter(serverSelectedProvider, correlationId);
}
