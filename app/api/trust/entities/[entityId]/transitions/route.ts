import {
  boundedLimit,
  continuousTrustContext,
  continuousTrustCorrelationId,
  continuousTrustFailure,
  continuousTrustReference,
  continuousTrustResponse,
} from "@/src/lib/continuous-trust/http";
import { continuousTrustSignalRepository } from "@/src/lib/continuous-trust/signal-repository";

export async function GET(request: Request, context: { params: Promise<{ entityId: string }> }) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const auth = await continuousTrustContext(request);
    const entityId = continuousTrustReference((await context.params).entityId, "entityId");
    const transitions = await continuousTrustSignalRepository().transitions(
      auth.enterpriseId,
      entityId,
      boundedLimit(request, 100, 500),
    );
    return continuousTrustResponse({ ok: true, entityId, transitions }, 200, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
