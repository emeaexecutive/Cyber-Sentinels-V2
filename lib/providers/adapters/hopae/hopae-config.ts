import { ProviderError } from "../../errors.ts";
import type { ProviderEnvironment } from "../../types.ts";

export type HopaeProviderConfig = {
  enabled: boolean;
  environment: ProviderEnvironment;
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
  providerId: string;
  callbackToleranceSeconds: number;
  requestTimeoutMs: number;
  maxRetries: number;
};

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

export function inspectHopaeProviderConfig(env: NodeJS.ProcessEnv = process.env) {
  const environmentValue = (env.HOPAE_ENVIRONMENT ?? env.HOPAE_ENV ?? "sandbox").trim().toLowerCase();
  const environment = environmentValue === "production" ? "production" : "sandbox";
  const apiBaseUrl = (env.HOPAE_API_BASE_URL?.trim() || (environment === "production" ? "https://api.hopae.com" : "https://sandbox.api.hopae.com")).replace(/\/$/, "");
  const config: HopaeProviderConfig = {
    enabled: env.HOPAE_ENABLED?.trim().toLowerCase() === "true",
    environment,
    apiBaseUrl,
    clientId: env.HOPAE_CLIENT_ID?.trim() ?? "",
    clientSecret: env.HOPAE_CLIENT_SECRET?.trim() ?? "",
    webhookSecret: env.HOPAE_WEBHOOK_SECRET?.trim() ?? "",
    providerId: env.HOPAE_PROVIDER_ID?.trim() ?? "",
    callbackToleranceSeconds: boundedInteger(env.HOPAE_CALLBACK_TOLERANCE_SECONDS, 300, 30, 900),
    requestTimeoutMs: boundedInteger(env.HOPAE_REQUEST_TIMEOUT_MS, 8_000, 1_000, 30_000),
    maxRetries: boundedInteger(env.HOPAE_MAX_RETRIES, 2, 0, 3),
  };
  const missing = [
    ["HOPAE_CLIENT_ID", config.clientId],
    ["HOPAE_CLIENT_SECRET", config.clientSecret],
    ["HOPAE_WEBHOOK_SECRET", config.webhookSecret],
    ["HOPAE_PROVIDER_ID", config.providerId],
  ].filter(([, value]) => !value).map(([name]) => name);
  const invalid: string[] = [];
  if (!["sandbox", "production"].includes(environmentValue)) invalid.push("HOPAE_ENVIRONMENT");
  let hostname = "";
  try { hostname = new URL(apiBaseUrl).hostname.toLowerCase(); } catch { invalid.push("HOPAE_API_BASE_URL"); }
  if (environment === "production" && hostname !== "api.hopae.com") invalid.push("HOPAE_API_BASE_URL_PRODUCTION_MISMATCH");
  if (environment === "sandbox" && hostname !== "sandbox.api.hopae.com") invalid.push("HOPAE_API_BASE_URL_SANDBOX_MISMATCH");
  return { config, missing, invalid, configured: config.enabled && missing.length === 0 && invalid.length === 0 };
}

export function requireHopaeProviderConfig(correlationId: string, env: NodeJS.ProcessEnv = process.env) {
  const result = inspectHopaeProviderConfig(env);
  if (!result.config.enabled) {
    throw new ProviderError("PROVIDER_DISABLED", "Hopae Connect is disabled.", "HOPAE_ENABLED is not true.", false, "hopae_connect", correlationId);
  }
  if (!result.configured) {
    throw new ProviderError("PROVIDER_NOT_CONFIGURED", "Hopae Connect is not configured.", `Missing: ${result.missing.join(",") || "none"}; invalid: ${result.invalid.join(",") || "none"}.`, false, "hopae_connect", correlationId);
  }
  return result.config;
}
