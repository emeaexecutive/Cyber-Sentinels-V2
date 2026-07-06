export { providerStatusLabel, type DetectionProvider, type ProviderStatus } from "./types";
export { realityDefenderProvider } from "./reality-defender";
export { sensityProvider } from "./sensity";
export { pindropProvider } from "./pindrop";
export { documentForensicsProvider } from "./document-forensics";
export { onfidoProvider } from "./onfido";
export { veriffProvider } from "./veriff";
export { worldIdProvider } from "./world-id";
export { stripeIdentityProvider } from "./stripe-identity";
export { c2paProvider } from "./c2pa";
export { synthIdProvider } from "./synthid";
export { mockProvider } from "./mock-provider";

import { realityDefenderProvider } from "./reality-defender";
import { sensityProvider } from "./sensity";
import { pindropProvider } from "./pindrop";
import { documentForensicsProvider } from "./document-forensics";
import { onfidoProvider } from "./onfido";
import { veriffProvider } from "./veriff";
import { worldIdProvider } from "./world-id";
import { stripeIdentityProvider } from "./stripe-identity";
import { c2paProvider } from "./c2pa";
import { synthIdProvider } from "./synthid";

export const detectionProviders = [
  realityDefenderProvider,
  sensityProvider,
  pindropProvider,
  documentForensicsProvider,
  onfidoProvider,
  veriffProvider,
  worldIdProvider,
  stripeIdentityProvider,
  c2paProvider,
  synthIdProvider,
] as const;
