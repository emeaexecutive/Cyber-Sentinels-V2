import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { sha256Hex } from "@/src/lib/trust-events/hash";
import { consentAnonymousCookieName, consentCookieName, parseConsentCookie } from "./cookie.ts";
import { consentErrorTelemetry } from "./observability";
import { isConsentRegionProfile, regionProfileFromCountry } from "./policy.ts";
import type { ConsentRegionProfile } from "./types.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class ConsentApiError extends Error { constructor(message: string, readonly status: number, readonly code: string) { super(message); } }

export function consentCorrelationId(request?: Request) {
  const value = request?.headers.get("x-correlation-id")?.trim();
  return value && uuidPattern.test(value) ? value : crypto.randomUUID();
}

export function consentResponse(body: Record<string, unknown>, status: number, correlationId: string) {
  return NextResponse.json({ schemaVersion: "consent-api-v1", generatedAt: new Date().toISOString(), correlationId, ...body }, { status, headers: { "cache-control": "private, no-store", "x-correlation-id": correlationId } });
}

export function consentFailure(error: unknown, correlationId: string) {
  const telemetry = consentErrorTelemetry(error, "consent.api");
  if (telemetry.status >= 500) {
    console.warn("Consent API failed safely.", {
      operation: telemetry.operation,
      errorName: telemetry.errorName,
      errorCode: telemetry.errorCode,
      supabaseCode: telemetry.supabaseCode,
      message: telemetry.message,
      details: telemetry.details,
      hint: telemetry.hint,
      correlationId,
    });
  }
  const candidate = error as Error;
  return consentResponse({ ok: false, code: telemetry.errorCode, error: telemetry.status < 500 ? candidate.message : "Consent receipt sync is temporarily unavailable." }, telemetry.status, correlationId);
}

function cookieValue(request: Request, name: string) {
  const item = (request.headers.get("cookie") ?? "").split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
}

export function consentCookieSecret(required = true) {
  const secret = process.env.CONSENT_COOKIE_SECRET?.trim() ?? "";
  if (required && secret.length < 32) throw new ConsentApiError("Consent persistence is not configured.", 503, "BLOCKED_BY_CREDENTIALS");
  return secret;
}

export function readVerifiedConsentCookie(request: Request) {
  return parseConsentCookie(cookieValue(request, consentCookieName), consentCookieSecret(false));
}

export function assertConsentMutationRequest(request: Request) {
  const type = (request.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
  if (type !== "application/json") throw new ConsentApiError("application/json is required.", 415, "UNSUPPORTED_CONTENT_TYPE");
  if (Number(request.headers.get("content-length") ?? 0) > 32_000) throw new ConsentApiError("Consent request is too large.", 413, "PAYLOAD_TOO_LARGE");
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new ConsentApiError("Cross-site consent mutation denied.", 403, "CSRF_ORIGIN_DENIED");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new ConsentApiError("Cross-site consent mutation denied.", 403, "CSRF_SITE_DENIED");
  if (process.env.NODE_ENV === "production" && !origin) throw new ConsentApiError("Consent mutation origin is required.", 403, "CSRF_ORIGIN_REQUIRED");
}

export type ConsentRequestContext = {
  enterpriseId: string; userId: string | null; anonymousToken: string; anonymousIdHash: string;
  subjectKey: string; relatedSubjectKeys: string[]; regionProfile: ConsentRegionProfile; coarseCountry: string | null;
  language: string; userAgentHash: string | null;
};

export async function resolveConsentContext(request: Request, preferredAnonymousToken?: string): Promise<ConsentRequestContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const headerEnterprise = request.headers.get("x-enterprise-id")?.trim();
  let enterpriseId: string;
  if (headerEnterprise) enterpriseId = (await resolveIdentityEnterprise(request)).enterpriseId;
  else enterpriseId = process.env.CONSENT_DEFAULT_ENTERPRISE_ID?.trim() ?? "";
  if (!uuidPattern.test(enterpriseId)) throw new ConsentApiError("Consent enterprise configuration is required.", 503, "BLOCKED_BY_EXTERNAL_CONFIGURATION");
  const priorAnonymous = cookieValue(request, consentAnonymousCookieName);
  const anonymousToken = priorAnonymous && /^[A-Za-z0-9_-]{20,128}$/.test(priorAnonymous)
    ? priorAnonymous
    : preferredAnonymousToken && uuidPattern.test(preferredAnonymousToken)
      ? preferredAnonymousToken
      : crypto.randomUUID();
  const anonymousIdHash = sha256Hex(`consent-anonymous-v1:${anonymousToken}`);
  const userSubject = user ? `user:${sha256Hex(`consent-user-v1:${user.id}`)}` : null;
  const anonymousSubject = `anonymous:${anonymousIdHash}`;
  const configuredRegion = process.env.CONSENT_REGION_PROFILE;
  const coarseCountryValue = request.headers.get("cf-ipcountry") ?? request.headers.get("x-vercel-ip-country");
  const coarseCountry = coarseCountryValue && /^[A-Za-z]{2}$/.test(coarseCountryValue) ? coarseCountryValue.toUpperCase() : null;
  const regionProfile = isConsentRegionProfile(configuredRegion) ? configuredRegion : regionProfileFromCountry(coarseCountry);
  const language = (request.headers.get("accept-language") ?? "en").split(",", 1)[0].trim().slice(0, 16) || "en";
  const userAgent = request.headers.get("user-agent");
  return { enterpriseId, userId: user?.id ?? null, anonymousToken, anonymousIdHash, subjectKey: userSubject ?? anonymousSubject, relatedSubjectKeys: userSubject ? [userSubject, anonymousSubject] : [anonymousSubject], regionProfile, coarseCountry, language, userAgentHash: userAgent ? sha256Hex(`consent-agent-v1:${userAgent}`) : null };
}
