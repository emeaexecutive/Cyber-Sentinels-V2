import { normalizeProviderSignal, toNormalizedVerificationResponse } from "@/lib/providers/signals";
import type {
  NormalizedVerificationResponse,
  ProviderSignalInput,
  VerificationProviderId,
  VerificationProviderSignal,
} from "@/lib/providers/types";

export type ProviderAdapter = {
  id: VerificationProviderId;
  normalize: (input: Omit<ProviderSignalInput, "providerId">) => VerificationProviderSignal;
  normalizeResponse: (input: Omit<ProviderSignalInput, "providerId">) => NormalizedVerificationResponse;
};

function adapter(id: VerificationProviderId): ProviderAdapter {
  return {
    id,
    normalize: (input) => normalizeProviderSignal({ ...input, providerId: id }),
    normalizeResponse: (input) =>
      toNormalizedVerificationResponse(normalizeProviderSignal({ ...input, providerId: id })),
  };
}

export const providerAdapters: Record<VerificationProviderId, ProviderAdapter> = {
  external_unattributed: adapter("external_unattributed"),
  world_id: adapter("world_id"),
  stripe_identity: adapter("stripe_identity"),
  persona: adapter("persona"),
  entrust: adapter("entrust"),
  onfido: adapter("onfido"),
  hopae_connect: adapter("hopae_connect"),
  cloudflare_turnstile: adapter("cloudflare_turnstile"),
  fingerprint_device_risk: adapter("fingerprint_device_risk"),
};

export function getProviderAdapter(id: VerificationProviderId) {
  return providerAdapters[id];
}
