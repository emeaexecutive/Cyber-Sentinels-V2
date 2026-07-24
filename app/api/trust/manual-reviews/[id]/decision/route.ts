import {
  continuousTrustCorrelationId,
  continuousTrustFailure,
  continuousTrustResponse,
  continuousTrustUuid,
  mutationContext,
} from "@/src/lib/continuous-trust/http";
import { transitionContinuousTrustReview } from "@/src/lib/continuous-trust/review-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const auth = await mutationContext(request, ["owner", "admin", "reviewer"]);
    const reviewId = continuousTrustUuid((await context.params).id, "reviewId");
    const body = await request.json() as Record<string, unknown>;
    const result = await transitionContinuousTrustReview({
      tenantId: auth.enterpriseId,
      reviewId,
      actorId: auth.user.id,
      status: body.status,
      reason: body.reason,
      decision: body.decision,
      correlationId,
    });
    return continuousTrustResponse({ ok: true, review: result }, 200, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
