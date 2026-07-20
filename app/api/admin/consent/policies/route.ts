import { canonicalizeJson } from "@/src/lib/trust-events/canonicalize";
import { sha256Hex } from "@/src/lib/trust-events/hash";
import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { assertConsentMutationRequest, consentCorrelationId, consentFailure, consentResponse } from "@/src/lib/consent/http";
import { consentRepository } from "@/src/lib/consent/repository";
import { createConsentPolicy } from "@/src/lib/consent/service";

export async function GET(request: Request) { const correlationId = consentCorrelationId(request); try { const context = await resolveIdentityEnterprise(request, ["owner", "admin"]); const data = await consentRepository().adminSummary(context.enterpriseId); return consentResponse({ ok: true, policies: data.policies }, 200, correlationId); } catch (error) { return consentFailure(error, correlationId); } }
export async function POST(request: Request) {
  const correlationId = consentCorrelationId(request);
  try { assertConsentMutationRequest(request); const context = await resolveIdentityEnterprise(request, ["owner", "admin"]); const body = await request.json() as Record<string, unknown>; const version = String(body.version ?? "").trim(); const locale = String(body.locale ?? "en").trim(); const status = String(body.status ?? "DRAFT"); const effectiveAt = new Date(String(body.effectiveAt ?? "")); if (!/^[0-9A-Za-z._-]{3,64}$/.test(version) || !["DRAFT","ACTIVE"].includes(status) || Number.isNaN(effectiveAt.getTime())) throw Object.assign(new Error("Policy version, status or effective date is invalid."), { status: 400, code: "CONSENT_POLICY_INVALID" }); const contentHash = sha256Hex(canonicalizeJson({ version, locale, content: body.content ?? {}, requiresReconsent: body.requiresReconsent === true })); const policy = await createConsentPolicy({enterpriseId:context.enterpriseId,actorId:context.user.id,version,status,effectiveAt:effectiveAt.toISOString(),supersedesVersion:typeof body.supersedesVersion==="string"?body.supersedesVersion:null,locale,contentHash,requiresReconsent:body.requiresReconsent===true,correlationId}); return consentResponse({ ok: true, policy }, 201, correlationId); }
  catch (error) { return consentFailure(error, correlationId); }
}
