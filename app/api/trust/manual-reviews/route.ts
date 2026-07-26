import {
  boundedLimit,
  continuousTrustContext,
  continuousTrustCorrelationId,
  continuousTrustFailure,
  continuousTrustResponse,
} from "@/src/lib/continuous-trust/http";
import { continuousTrustSignalRepository } from "@/src/lib/continuous-trust/signal-repository";

export async function GET(request: Request) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const auth = await continuousTrustContext(request);
    const reviews = await continuousTrustSignalRepository().reviews(
      auth.enterpriseId,
      null,
      boundedLimit(request, 50, 200),
    );
    return continuousTrustResponse({ ok: true, reviews }, 200, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
