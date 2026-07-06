import { createProviderAdapter } from "./factory.ts";
export const sensityProvider = createProviderAdapter({ providerName: "Sensity", env: ["SENSITY_API_KEY"], supportedSignals: ["deepfake_video", "synthetic_face"] });
