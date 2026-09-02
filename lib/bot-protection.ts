import { NextResponse } from "next/server";
import { getTrustedClientIp, hashValue } from "@/lib/security";

type TurnstileVerifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
};

export type TurnstileVerificationResult = {
  ok: boolean;
  skipped: boolean;
  reason:
    | "verified"
    | "turnstile_not_configured"
    | "turnstile_configuration_invalid"
    | "missing_token"
    | "invalid_token"
    | "hostname_mismatch"
    | "provider_unavailable"
    | "provider_error";
  errorCodes?: string[];
  hostname?: string;
  challengeTimestamp?: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

const officialTestSiteKeyPattern = /^[123]x0{20}(?:AA|AB|BB|FF)$/;
const officialTestSecretKeyPattern = /^[123]x0{31}AA$/;
const officialTestHostnames = new Set(["localhost", "example.com"]);
const publicDummyTurnstileTokenPattern = /^XXXX\.DUMMY\.TOKEN\.XXXX$/i;

export type TurnstileConfigurationState = {
  ok: boolean;
  mode: "live" | "preview-test";
  usesOfficialTestCredentials: boolean;
  reason?: "missing_configuration" | "invalid_mode" | "test_credentials_forbidden" | "test_credentials_incomplete" | "test_hostname_invalid";
};

export function isOfficialTurnstileTestSiteKey(value: string | null | undefined) {
  return officialTestSiteKeyPattern.test(String(value ?? "").trim());
}

export function isOfficialTurnstileTestSecretKey(value: string | null | undefined) {
  return officialTestSecretKeyPattern.test(String(value ?? "").trim());
}

function getPreviewTurnstileExpectedHostname() {
  const configuredHostname = String(process.env.TURNSTILE_EXPECTED_HOSTNAME ?? "localhost").trim().toLowerCase();
  return configuredHostname || "localhost";
}

export function getTurnstileConfigurationState(): TurnstileConfigurationState {
  const siteKey = getTurnstileSiteKey();
  const secretKey = String(process.env.TURNSTILE_SECRET_KEY ?? "").trim();
  const configuredMode = String(process.env.TURNSTILE_MODE ?? "live").trim().toLowerCase();
  const usesTestSiteKey = isOfficialTurnstileTestSiteKey(siteKey);
  const usesTestSecretKey = isOfficialTurnstileTestSecretKey(secretKey);
  const usesOfficialTestCredentials = usesTestSiteKey || usesTestSecretKey;

  if (!siteKey || !secretKey) {
    return {
      ok: false,
      mode: configuredMode === "preview-test" ? "preview-test" : "live",
      usesOfficialTestCredentials,
      reason: "missing_configuration",
    };
  }

  if (!(["live", "preview-test"] as const).includes(configuredMode as "live" | "preview-test")) {
    return { ok: false, mode: "live", usesOfficialTestCredentials, reason: "invalid_mode" };
  }

  if (process.env.VERCEL_ENV === "production" && (configuredMode === "preview-test" || usesOfficialTestCredentials)) {
    return {
      ok: false,
      mode: configuredMode === "preview-test" ? "preview-test" : "live",
      usesOfficialTestCredentials,
      reason: "test_credentials_forbidden",
    };
  }

  if (configuredMode === "preview-test") {
    if (process.env.VERCEL_ENV !== "preview") {
      return { ok: false, mode: "preview-test", usesOfficialTestCredentials, reason: "test_credentials_forbidden" };
    }
    if (!usesTestSiteKey || !usesTestSecretKey) {
      return { ok: false, mode: "preview-test", usesOfficialTestCredentials, reason: "test_credentials_incomplete" };
    }
    const expectedHostname = getPreviewTurnstileExpectedHostname();
    if (!officialTestHostnames.has(expectedHostname)) {
      return { ok: false, mode: "preview-test", usesOfficialTestCredentials, reason: "test_hostname_invalid" };
    }
    return { ok: true, mode: "preview-test", usesOfficialTestCredentials: true };
  }

  if (usesOfficialTestCredentials) {
    return { ok: false, mode: "live", usesOfficialTestCredentials, reason: "test_credentials_forbidden" };
  }

  return { ok: true, mode: "live", usesOfficialTestCredentials: false };
}

export function getExpectedTurnstileHostname(requestHostname: string) {
  const configuration = getTurnstileConfigurationState();
  if (configuration.ok && configuration.mode === "preview-test") {
    return getPreviewTurnstileExpectedHostname();
  }
  return requestHostname.trim().toLowerCase();
}

export function getClientIp(req: Request) {
  return getTrustedClientIp(req);
}

export function isTurnstileConfigured() {
  const configuration = getTurnstileConfigurationState();
  return configuration.reason === "missing_configuration"
    ? Boolean(String(process.env.TURNSTILE_SECRET_KEY ?? "").trim())
    : configuration.ok;
}

export function isTurnstileSiteKeyConfigured() {
  const configuration = getTurnstileConfigurationState();
  return configuration.reason === "missing_configuration"
    ? Boolean(getTurnstileSiteKey())
    : configuration.ok;
}

export function getTurnstileSiteKey() {
  return String(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? process.env.TURNSTILE_SITE_KEY ?? "").trim();
}

export function canBypassBotProtection() {
  return process.env.NODE_ENV !== "production" && !process.env.VERCEL_ENV;
}

function safeTurnstileErrorCodes(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const codes = value
    .map(String)
    .filter((code) => /^[a-z0-9-]{1,64}$/i.test(code))
    .slice(0, 8);
  return codes.length > 0 ? codes : undefined;
}

function safeTurnstileHostname(value: unknown) {
  const hostname = String(value ?? "").trim().toLowerCase();
  return /^[a-z0-9.-]{1,253}$/.test(hostname) ? hostname : undefined;
}

function safeTurnstileTimestamp(value: unknown) {
  const timestamp = String(value ?? "").trim();
  return timestamp && !Number.isNaN(Date.parse(timestamp)) ? timestamp : undefined;
}

function failureReason(errorCodes: string[] | undefined): TurnstileVerificationResult["reason"] {
  if (errorCodes?.some((code) => ["invalid-input-secret", "missing-input-secret"].includes(code))) {
    return "turnstile_not_configured";
  }
  if (errorCodes?.some((code) => ["internal-error", "bad-request"].includes(code))) {
    return "provider_error";
  }
  return "invalid_token";
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  ip?: string | null,
  expectedHostname?: string | null,
): Promise<TurnstileVerificationResult> {
  const secret = String(process.env.TURNSTILE_SECRET_KEY ?? "").trim();

  const configuration = getTurnstileConfigurationState();
  if (!configuration.ok && configuration.reason !== "missing_configuration") {
    return { ok: false, skipped: false, reason: "turnstile_configuration_invalid" };
  }

  if (!secret) {
    return canBypassBotProtection()
      ? { ok: true, skipped: true, reason: "turnstile_not_configured" }
      : { ok: false, skipped: false, reason: "turnstile_not_configured" };
  }

  if (!configuration.ok) {
    return { ok: false, skipped: false, reason: "turnstile_not_configured" };
  }

  if (!token) {
    return { ok: false, skipped: false, reason: "missing_token" };
  }

  if (configuration.mode === "preview-test" && publicDummyTurnstileTokenPattern.test(token)) {
    const expected = safeTurnstileHostname(getPreviewTurnstileExpectedHostname());
    if (expected && (!expectedHostname || expectedHostname.trim().toLowerCase() === expected)) {
      return { ok: true, skipped: false, reason: "verified", hostname: expected };
    }
  }

  try {
    const formData = new FormData();
    formData.set("secret", secret);
    formData.set("response", token);
    if (ip && ip !== "unknown") formData.set("remoteip", ip);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { ok: false, skipped: false, reason: "provider_unavailable" };
    }

    const result = (await response.json().catch(() => ({}))) as TurnstileVerifyResponse;
    const errorCodes = safeTurnstileErrorCodes(result["error-codes"]);
    const hostname = safeTurnstileHostname(result.hostname);
    const challengeTimestamp = safeTurnstileTimestamp(result.challenge_ts);
    const diagnostics = {
      ...(errorCodes ? { errorCodes } : {}),
      ...(hostname ? { hostname } : {}),
      ...(challengeTimestamp ? { challengeTimestamp } : {}),
    };

    if (result.success === true) {
      const expected = safeTurnstileHostname(
        configuration.mode === "preview-test" ? getPreviewTurnstileExpectedHostname() : expectedHostname
      );
      if (!hostname || !expected) {
        return { ok: false, skipped: false, reason: "provider_error", ...diagnostics };
      }
      if (hostname !== expected) {
        return { ok: false, skipped: false, reason: "hostname_mismatch", ...diagnostics };
      }
      return { ok: true, skipped: false, reason: "verified", ...diagnostics };
    }
    if (result.success === false) {
      return {
        ok: false,
        skipped: false,
        reason: failureReason(errorCodes),
        ...diagnostics,
      };
    }
    return { ok: false, skipped: false, reason: "provider_error", ...diagnostics };
  } catch {
    return { ok: false, skipped: false, reason: "provider_error" };
  }
}

export function getTurnstileTokenFromForm(formData: FormData) {
  return String(formData.get("cf-turnstile-response") ?? "").trim();
}

export function getTurnstileTokenFromJson(body: Record<string, unknown>) {
  return String(body.turnstileToken ?? body.turnstile_token ?? body["cf-turnstile-response"] ?? "").trim();
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please wait and try again." },
      { status: 429 }
    );
  }

  return null;
}

export function checkRequestRateLimit(req: Request, route: string, limit: number, windowMs: number) {
  const key = `${route}:${hashValue(getClientIp(req))}`;
  return checkRateLimit({ key, limit, windowMs });
}
