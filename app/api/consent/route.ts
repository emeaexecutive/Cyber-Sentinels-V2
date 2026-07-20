import { checkRequestRateLimit } from "@/lib/security";
import { consentAnonymousCookieName, consentCookieName, serializeConsentCookie } from "@/src/lib/consent/cookie";
import { assertConsentMutationRequest, consentCookieSecret, consentCorrelationId, consentFailure, consentResponse, readVerifiedConsentCookie, resolveConsentContext } from "@/src/lib/consent/http";
import { consentDefaults, currentConsentPolicy, isConsentRegionProfile, privacyLevel, regionProfileFromCountry } from "@/src/lib/consent/policy";
import { persistConsentChoice } from "@/src/lib/consent/service";

export const dynamic = "force-dynamic";

function publicRegion(request: Request) {
  if (isConsentRegionProfile(process.env.CONSENT_REGION_PROFILE)) return process.env.CONSENT_REGION_PROFILE;
  const country = request.headers.get("cf-ipcountry") ?? request.headers.get("x-vercel-ip-country");
  return regionProfileFromCountry(country);
}

export async function GET(request: Request) {
  const correlationId = consentCorrelationId(request);
  const regionProfile = publicRegion(request);
  const stored = readVerifiedConsentCookie(request);
  const valid = stored?.policyVersion === currentConsentPolicy.version;
  const choices = valid ? stored.categories : consentDefaults(regionProfile);
  return consentResponse({ ok: true, policy: currentConsentPolicy, regionProfile, choices, privacyLevel: privacyLevel(choices), receiptId: valid ? stored.receiptId : null, needsConsent: !valid }, 200, correlationId);
}

async function mutate(request: Request) {
  const correlationId = consentCorrelationId(request);
  const limited = checkRequestRateLimit({ route: "consent-choice", req: request, limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  try {
    assertConsentMutationRequest(request);
    const body = await request.json() as Record<string, unknown>;
    const context = await resolveConsentContext(request);
    const result = await persistConsentChoice({ context, action: body.action, choices: body.categories, policyVersion: body.policyVersion, idempotencyKey: request.headers.get("idempotency-key")?.trim() ?? "", correlationId, source: String(body.source ?? "CONSENT_BANNER") });
    const response = consentResponse({ ok: true, action: body.action, choices: result.choices, privacyLevel: privacyLevel(result.choices), receiptId: result.receiptReference, receiptHash: result.receiptHash, expiresAt: result.expiresAt, replayed: result.replayed }, result.replayed ? 200 : 201, correlationId);
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(consentCookieName, serializeConsentCookie({ version: 1, policyVersion: currentConsentPolicy.version, categories: result.choices, receiptId: result.receiptReference, expiresAt: result.expiresAt }, consentCookieSecret()), { path: "/", sameSite: "lax", secure, httpOnly: false, expires: new Date(result.expiresAt) });
    response.cookies.set(consentAnonymousCookieName, context.anonymousToken, { path: "/", sameSite: "lax", secure, httpOnly: true, expires: new Date(result.expiresAt) });
    return response;
  } catch (error) { return consentFailure(error, correlationId); }
}

export async function POST(request: Request) { return mutate(request); }
export async function PATCH(request: Request) { return mutate(request); }
