import { consentCorrelationId, consentFailure, consentResponse, resolveConsentContext } from "@/src/lib/consent/http";
import { consentRepository } from "@/src/lib/consent/repository";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function GET(request: Request, route: { params: Promise<{ id: string }> }) {
  const correlationId = consentCorrelationId(request);
  try { const { id } = await route.params; if (!uuidPattern.test(id)) return consentResponse({ ok: false, code: "CONSENT_RECEIPT_ID_INVALID", error: "A valid receipt ID is required." }, 400, correlationId); const context = await resolveConsentContext(request); const receipt = await consentRepository().receipt(context.enterpriseId, context.relatedSubjectKeys, id); if (!receipt) return consentResponse({ ok: false, code: "CONSENT_RECEIPT_NOT_FOUND", error: "Consent Receipt was not found." }, 404, correlationId); return consentResponse({ ok: true, receipt }, 200, correlationId); }
  catch (error) { return consentFailure(error, correlationId); }
}
