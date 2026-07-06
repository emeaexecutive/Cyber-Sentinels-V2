import { createProviderAdapter } from "./factory.ts";

export const synthIdProvider = createProviderAdapter({
  providerName: "SynthID",
  env: ["SYNTHID_API_KEY"],
  supportedSignals: ["watermark_detection", "media_provenance"],
});
