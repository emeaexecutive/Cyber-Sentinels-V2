import { checkRequestRateLimit } from "@/lib/security";
import { consentAnonymousCookieName, consentCookieName, serializeConsentCookie } from "@/src/lib/consent/cookie";
import { canonicalCookieChoices, cookieConsentAction, validateCookieConsentRequest } from "@/src/lib/consent/cookie-contract";
import { assertConsentMutationRequest, consentCookieSecret, consentCorrelationId, consentResponse, resolveConsentContext } from "@/src/lib/consent/http";
import { currentConsentPolicy } from "@/src/lib/consent/policy";
import { persistConsentChoice } from "@/src/lib/consent/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const correlationId = consentCorrelationId(request);
  const limited = checkRequestRateLimit({ route: "cookie-consent-choice", req: request, limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  try {
    assertConsentMutationRequest(request);
    const body = validateCookieConsentRequest(await request.json());
    if (body.consentVersion !== currentConsentPolicy.version) {
      return consentResponse({ success: false, status: "rejected", reasonCode: "CONSENT_POLICY_VERSION_MISMATCH" }, 409, correlationId);
    }

    const context = await resolveConsentContext(request, body.anonymousId);
    const choices = canonicalCookieChoices(body);
    const result = await persistConsentChoice({
      context,
      action: cookieConsentAction(body),
      choices,
      policyVersion: body.consentVersion,
      idempotencyKey: body.idempotencyKey,
      correlationId,
      source: body.source,
    });

    const response = consentResponse({
      success: true,
      status: "persisted",
      receiptId: result.receiptReference,
    }, result.replayed ? 200 : 201, correlationId);
    const secure = process.env.NODE_ENV === "production";
    const secret = consentCookieSecret(false);
    if (secret.length >= 32) {
      response.cookies.set(consentCookieName, serializeConsentCookie({
        version: 1,
        policyVersion: currentConsentPolicy.version,
        categories: result.choices,
        receiptId: result.receiptReference,
        expiresAt: result.expiresAt,
      }, secret), { path: "/", sameSite: "lax", secure, httpOnly: false, expires: new Date(result.expiresAt) });
    }
    response.cookies.set(consentAnonymousCookieName, context.anonymousToken, { path: "/", sameSite: "lax", secure, httpOnly: true, expires: new Date(result.expiresAt) });
    return response;
  } catch (error) {
    const candidate = error as Error & { status?: number; code?: string };
    const status = candidate.status ?? 500;
    if (status < 500) {
      return consentResponse({ success: false, status: "rejected", reasonCode: candidate.code ?? "CONSENT_REQUEST_REJECTED" }, status, correlationId);
    }
    console.error("Cookie consent receipt sync unavailable.", {
      correlationId,
      operation: "consent.receipt.sync",
      internalCode: candidate.code ?? "CONSENT_RECEIPT_PERSISTENCE_UNAVAILABLE",
      status: 503,
      errorName: candidate.name || "ConsentPersistenceError",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    });
    return consentResponse({
      success: false,
      status: "retryable",
      reasonCode: "CONSENT_RECEIPT_PERSISTENCE_UNAVAILABLE",
    }, 503, correlationId);
  }
}
