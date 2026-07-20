import { consentCorrelationId, consentResponse } from "@/src/lib/consent/http";
import { currentConsentPolicy } from "@/src/lib/consent/policy";

export async function GET(request: Request) { return consentResponse({ ok: true, policy: currentConsentPolicy, legalCertification: false, complianceGuarantee: false }, 200, consentCorrelationId(request)); }
