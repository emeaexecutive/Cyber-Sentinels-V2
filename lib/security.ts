import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getPublicSupabaseEnv } from "@/lib/env";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  route: string;
  req: Request;
  limit: number;
  windowMs: number;
};

export const allowedEvidenceMediaTypes = [
  "image",
  "video",
  "audio",
  "document",
] as const;

export const allowedSubjectTypes = [
  "human",
  "agent",
  "candidate",
  "content",
] as const;

export const allowedOriginStatuses = [
  "unknown",
  "unverified",
  "verified",
  "missing",
  "tampered",
  "intact",
  "stripped",
  "found",
  "not_found",
  "broken",
] as const;

const rateLimitBuckets = new Map<string, RateLimitBucket>();
const processHashSecret = randomBytes(32).toString("hex");

export function assertServerEnv() {
  getPublicSupabaseEnv("Supabase server client");
}

export function configurationError() {
  return NextResponse.json(
    { ok: false, error: "Service temporarily unavailable" },
    { status: 503 }
  );
}

export async function requireAuthenticatedUser(
  supabase: SupabaseServerClient
): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export function getRequiredText(
  formData: FormData,
  field: string,
  maxLength = 160
) {
  const value = String(formData.get(field) || "").trim();

  if (!value || value.length > maxLength) {
    throw new Error("Invalid input");
  }

  return value;
}

export function getOptionalText(
  formData: FormData,
  field: string,
  fallback: string,
  maxLength = 160
) {
  const value = String(formData.get(field) || fallback).trim();

  if (!value || value.length > maxLength) {
    throw new Error("Invalid input");
  }

  return value;
}

export function getEmail(formData: FormData, field: string) {
  const email = String(formData.get(field) || "").toLowerCase().trim();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!validEmail || email.length > 254) {
    throw new Error("Invalid input");
  }

  return email;
}

export function getScore(formData: FormData, field: string, fallback: number) {
  const rawValue = formData.get(field);
  const value =
    rawValue === null || rawValue === "" ? fallback : Number(rawValue);

  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Invalid input");
  }

  return Math.round(value);
}

export function getAllowedValue<T extends readonly string[]>(
  formData: FormData,
  field: string,
  allowedValues: T,
  fallback: T[number]
): T[number] {
  const value = String(formData.get(field) || fallback);

  if (!allowedValues.includes(value)) {
    throw new Error("Invalid input");
  }

  return value;
}

export function getRequestRiskFields(req: Request) {
  const userAgent = req.headers.get("user-agent") || "unknown";
  const sourceIp = getTrustedClientIp(req);

  return {
    abuse_risk: "low",
    suspicious_activity: false,
    source_ip_hash: hashValue(sourceIp),
    user_agent_hash: hashValue(userAgent),
    scan_status: "pending",
    allowed_file_type: "unverified",
    rate_limit_status: "allowed",
  };
}

export function checkRequestRateLimit({
  route,
  req,
  limit,
  windowMs,
}: RateLimitOptions) {
  const { source_ip_hash: sourceIpHash } = getRequestRiskFields(req);
  const key = `${route}:${sourceIpHash}`;
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429 }
    );
  }

  return null;
}

function validIp(value: string | null) {
  const candidate = String(value ?? "").trim();
  return isIP(candidate) ? candidate : "";
}

function firstForwardedIp(value: string | null) {
  return validIp(value?.split(",", 1)[0] ?? null);
}

function isVercelRuntime() {
  return process.env.VERCEL === "1"
    || ["production", "preview", "development"].includes(process.env.VERCEL_ENV ?? "");
}

export function getTrustedClientIp(req: Request) {
  // Vercel overwrites these headers at its ingress. Cloudflare-looking headers
  // remain informational because this repository has no authenticated origin
  // boundary that proves a request traversed Cloudflare before reaching Vercel.
  if (!isVercelRuntime()) return "unknown";

  return firstForwardedIp(req.headers.get("x-vercel-forwarded-for"))
    || firstForwardedIp(req.headers.get("x-forwarded-for"))
    || "unknown";
}

export function getSafeSameOriginUrl(
  request: Request,
  candidate: string | null | undefined,
  fallbackPath: string,
) {
  const requestOrigin = new URL(request.url).origin;
  const fallback = new URL(fallbackPath, requestOrigin);
  try {
    const target = new URL(candidate || fallbackPath, requestOrigin);
    return target.origin === requestOrigin ? target : fallback;
  } catch {
    return fallback;
  }
}

// Compatibility alias for existing routes. The limiter is functional but process-local.
export const checkRateLimitPlaceholder = checkRequestRateLimit;

export function hashValue(value: string) {
  const hashSecret = process.env.SECURITY_HASH_SECRET || processHashSecret;

  return createHash("sha256")
    .update(`${hashSecret}:${value}`)
    .digest("hex");
}
