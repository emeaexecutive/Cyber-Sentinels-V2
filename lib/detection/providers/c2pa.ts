import { createProviderAdapter } from "./factory.ts";

export const c2paProvider = createProviderAdapter({
  providerName: "C2PA",
  env: ["C2PA_VERIFIER_ENDPOINT"],
  supportedSignals: ["content_credentials", "media_provenance"],
});
