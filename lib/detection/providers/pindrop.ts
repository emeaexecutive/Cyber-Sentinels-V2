import { createProviderAdapter } from "./factory.ts";
export const pindropProvider = createProviderAdapter({ providerName: "Pindrop", env: ["PINDROP_API_KEY"], supportedSignals: ["synthetic_voice"] });
