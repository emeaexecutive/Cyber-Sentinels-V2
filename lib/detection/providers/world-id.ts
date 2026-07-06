import { createProviderAdapter } from "./factory.ts";
export const worldIdProvider = createProviderAdapter({ providerName: "World ID", env: ["WORLD_ID_APP_ID", "WORLD_ID_ACTION"], supportedSignals: ["proof_of_personhood"] });
