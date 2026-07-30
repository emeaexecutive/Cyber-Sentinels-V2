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

export function getClientIp(req: Request) {
  return getTrustedClientIp(req);
}

export function isTurnstileConfigured() {
  return Boolean(String(process.env.TURNSTILE_SECRET_KEY ?? "").trim());
}

export function isTurnstileSiteKeyConfigured() {
  return Boolean(String(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? process.env.TURNSTILE_SITE_KEY ?? "").trim());
}

export function getTurnstileSiteKey() {
  return String(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? process.env.TURNSTILE_SITE_KEY ?? "").trim();
}

export function canBypassBotProtection() {
  return process.env.NODE_ENV !== "production";
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

  if (!secret) {
    return canBypassBotProtection()
      ? { ok: true, skipped: true, reason: "turnstile_not_configured" }
      : { ok: false, skipped: false, reason: "turnstile_not_configured" };
  }

  if (!token) {
    return { ok: false, skipped: false, reason: "missing_token" };
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
      const expected = safeTurnstileHostname(expectedHostname);
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
