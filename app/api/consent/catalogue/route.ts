import { consentCorrelationId, consentFailure, consentResponse } from "@/src/lib/consent/http";
import { currentConsentPolicy } from "@/src/lib/consent/policy";
import { consentRepository } from "@/src/lib/consent/repository";
import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";

export async function GET(request: Request) {
  const correlationId = consentCorrelationId(request);
  try { const requestedEnterprise = request.headers.get("x-enterprise-id"); const enterpriseId = requestedEnterprise ? (await resolveIdentityEnterprise(request)).enterpriseId : undefined; const catalogue = await consentRepository().catalogue(enterpriseId); return consentResponse({ ok: true, categories: currentConsentPolicy.categories, ...catalogue, unknownTrackersDefaultToEssential: false }, 200, correlationId); }
  catch (error) { return consentFailure(error, correlationId); }
}
