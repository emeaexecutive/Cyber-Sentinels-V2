import { NextResponse } from "next/server";
import { hashValue } from "@/lib/security";

type TurnstileVerifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
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
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const realIp = req.headers.get("x-real-ip") || "";
  const cfIp = req.headers.get("cf-connecting-ip") || "";

  return forwardedFor.split(",")[0]?.trim() || cfIp || realIp || "unknown";
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

export async function verifyTurnstileToken(token: string | null | undefined, ip?: string | null) {
  const secret = String(process.env.TURNSTILE_SECRET_KEY ?? "").trim();

  if (!secret) {
    return { ok: true, skipped: true, reason: "turnstile_not_configured" } as const;
  }

  if (!token) {
    return { ok: false, skipped: false, reason: "missing_token" } as const;
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
    });

    if (!response.ok) {
      return { ok: false, skipped: false, reason: "provider_unavailable" } as const;
    }

    const result = (await response.json().catch(() => ({}))) as TurnstileVerifyResponse;

    return result.success
      ? ({ ok: true, skipped: false, reason: "verified" } as const)
      : ({ ok: false, skipped: false, reason: "invalid_token" } as const);
  } catch {
    return { ok: false, skipped: false, reason: "provider_error" } as const;
  }
}

export function getTurnstileTokenFromForm(formData: FormData) {
  return String(formData.get("cf-turnstile-response") ?? formData.get("turnstile_token") ?? "").trim();
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
      { ok: false, error: "Too many requests. Please wait and try again." },
      { status: 429 }
    );
  }

  return null;
}

export function checkRequestRateLimit(req: Request, route: string, limit: number, windowMs: number) {
  const key = `${route}:${hashValue(getClientIp(req))}`;
  return checkRateLimit({ key, limit, windowMs });
}