import {
  boundedLimit,
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
    const drift = await continuousTrustRepository().drift(
      auth.enterpriseId,
      entityId,
      boundedLimit(request, 100, 500),
    );
    return continuousTrustResponse({ ok: true, entityId, drift }, 200, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
