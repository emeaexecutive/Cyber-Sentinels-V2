import { createProviderAdapter } from "./factory.ts";
export const realityDefenderProvider = createProviderAdapter({ providerName: "Reality Defender", env: ["REALITY_DEFENDER_API_KEY"], supportedSignals: ["deepfake_video", "synthetic_face"] });
