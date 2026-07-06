import { createProviderAdapter } from "./factory.ts";
export const onfidoProvider = createProviderAdapter({ providerName: "Onfido / Entrust", env: ["ONFIDO_API_KEY"], supportedSignals: ["identity", "document"] });
