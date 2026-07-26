import {
  continuousTrustContext,
  continuousTrustCorrelationId,
  continuousTrustFailure,
  continuousTrustReference,
  continuousTrustResponse,
} from "@/src/lib/continuous-trust/http";
import { continuousTrustRepository } from "@/src/lib/continuous-trust/repository";

export async function GET(request: Request, context: { params: Promise<{ entityId: string }> }) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const auth = await continuousTrustContext(request);
    const entityId = continuousTrustReference((await context.params).entityId, "entityId");
    const state = await continuousTrustRepository().runtimeSubject(auth.enterpriseId, entityId);
    if (!state) {
      return continuousTrustResponse({ ok: false, code: "TRUST_ENTITY_STATE_NOT_FOUND", error: "Trust state was not found." }, 404, correlationId);
    }
    return continuousTrustResponse({ ok: true, entityId, state }, 200, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
