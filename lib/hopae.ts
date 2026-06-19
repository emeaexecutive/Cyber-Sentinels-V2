import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

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
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
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

function parseSignatureHeader(signatureHeader: string) {
  const compactMatch = signatureHeader.trim().match(/^(\d+)\.([a-fA-F0-9]{64})$/);
  if (compactMatch) {
    return { timestamp: compactMatch[1], signature: compactMatch[2] };
  }
  const parts = Object.fromEntries(
    signatureHeader.split(/[,;]/).map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    })
  );
  return {
    timestamp: parts.t || parts.timestamp || "",
    signature: parts.v1 || parts.signature || parts.sig || "",
  };
}

export function verifyHopaeWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
) {
  if (!rawBody || !signatureHeader || !secret) return false;
  const { timestamp, signature } = parseSignatureHeader(signatureHeader);
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const supplied = signature.replace(/^sha256=/i, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;

  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(supplied, "hex"));
}

export function getHopaeWebhookTimestamp(signatureHeader: string) {
  const { timestamp } = parseSignatureHeader(signatureHeader);
  const parsed = Number(timestamp);
  return Number.isFinite(parsed) ? parsed : null;
}
