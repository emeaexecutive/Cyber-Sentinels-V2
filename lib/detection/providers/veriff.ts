import { createProviderAdapter } from "./factory.ts";
export const veriffProvider = createProviderAdapter({ providerName: "Veriff", env: ["VERIFF_API_KEY"], supportedSignals: ["identity", "document"] });
