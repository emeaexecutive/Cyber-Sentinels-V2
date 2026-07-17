import type { OriOperatingMode } from "./types.ts";

export const ORI_FEATURE_SCHEMA_VERSION = "1.0.0";
export const ORI_MODEL_VERSION = "1.0.0";
export const ORI_DATASET_VERSION = "ori-synthetic-v1";
export const ORI_THRESHOLD_VERSION = "ori-thresholds-v1";
export const ORI_NORMALIZATION_VERSION = "ori-normalization-v1";
export const ORI_MODEL_ID = "ori-operational-risk-logistic-v1";
export const ORI_MINIMUM_REVIEWED_SAMPLES = 30;
export const ORI_RETENTION_DAYS = 90;

export const ORI_THRESHOLDS_V1 = Object.freeze({
  lowUpperBound: 0.34,
  moderateUpperBound: 0.69,
  minimumFeatureCoverage: 0.7,
});

export function resolveOriOperatingMode(env: Record<string, string | undefined> = process.env): {
  enabled: boolean;
  mode: OriOperatingMode;
  configuredMode: string;
  limitation: string | null;
} {
  const enabled = env.ML_RISK_ENABLED?.trim().toLowerCase() === "true";
  const configuredMode = env.ML_RISK_MODE?.trim().toLowerCase() || "off";
  const allowed: OriOperatingMode[] = ["off", "shadow", "advisory"];
  if (!enabled) return { enabled: false, mode: "off", configuredMode, limitation: null };
  if (!allowed.includes(configuredMode as OriOperatingMode)) {
    return {
      enabled: false,
      mode: "off",
      configuredMode,
      limitation: "Unsupported ML_RISK_MODE was rejected; ORI failed closed to off.",
    };
  }
  return { enabled, mode: configuredMode as OriOperatingMode, configuredMode, limitation: null };
}
