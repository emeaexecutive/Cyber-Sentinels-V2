import "server-only";

export {
  getHopaeWebhookTimestamp,
  verifyHopaeWebhookSignature,
} from "@/lib/providers/hopae-rc1";

export type HopaeConfig = {
  enabled: boolean;
  environment: string;
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
  apiBaseUrl: string;
  connectIssuer: string;
};

export type HopaeJson = Record<string, unknown>;

export type CreateHopaeVerificationInput = {
  providerId: string;
  redirectUri: string;
  matchData?: HopaeJson;
  metadata?: HopaeJson;
};

export const HOPAE_REQUEST_TIMEOUT_MS = 8_000;

export class HopaeDisabledError extends Error {
  constructor(message = "Hopae Connect is disabled.") {
    super(message);
    this.name = "HopaeDisabledError";
  }
}

export function getHopaeConfig(): HopaeConfig {
  return {
    enabled: process.env.HOPAE_ENABLED?.trim().toLowerCase() === "true",
    environment: process.env.HOPAE_ENV?.trim() || "sandbox",
    clientId: process.env.HOPAE_CLIENT_ID?.trim() || "",
    clientSecret: process.env.HOPAE_CLIENT_SECRET?.trim() || "",
    webhookSecret: process.env.HOPAE_WEBHOOK_SECRET?.trim() || "",
    apiBaseUrl:
      process.env.HOPAE_API_BASE_URL?.trim().replace(/\/$/, "") ||
      "https://sandbox.api.hopae.com",
    connectIssuer:
      process.env.HOPAE_CONNECT_ISSUER?.trim().replace(/\/$/, "") ||
      "https://sandbox.connect.hopae.com",
  };
}

function requireHopaeApiConfig() {
  const config = getHopaeConfig();
  if (!config.enabled) throw new HopaeDisabledError();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Hopae Connect credentials are not configured.");
  }
  return config;
}

export function hopaeBasicAuthHeader() {
  const { clientId, clientSecret } = requireHopaeApiConfig();
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`;
}

async function hopaeRequest(path: string, init: RequestInit = {}) {
  const config = requireHopaeApiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HOPAE_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: hopaeBasicAuthHeader(),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as HopaeJson;
    if (!response.ok) {
      console.error("Hopae API request failed.", { path, status: response.status });
      throw new Error(`Hopae API request failed with status ${response.status}.`);
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Hopae API request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function createHopaeVerification({
  providerId,
  redirectUri,
  matchData = {},
  metadata = {},
}: CreateHopaeVerificationInput) {
  return hopaeRequest("/connect/v1/verifications", {
    method: "POST",
    body: JSON.stringify({
      providerId,
      redirectUri,
      matchData,
      metadata,
    }),
  });
}

export function getHopaeVerificationStatus(verificationId: string) {
  return hopaeRequest(`/connect/v1/verifications/${encodeURIComponent(verificationId)}`);
}

export function getHopaeVerificationUserInfo(verificationId: string) {
  return hopaeRequest(
    `/connect/v1/verifications/${encodeURIComponent(verificationId)}/userinfo`
  );
}
