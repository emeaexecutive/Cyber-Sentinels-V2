import {
  continuousTrustCorrelationId,
  continuousTrustFailure,
  continuousTrustReference,
  continuousTrustResponse,
  mutationContext,
} from "@/src/lib/continuous-trust/http";
import { applyContinuousTrustOverride } from "@/src/lib/continuous-trust/override-service";

export async function POST(request: Request, context: { params: Promise<{ entityId: string }> }) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const auth = await mutationContext(request, ["owner", "admin"]);
    const entityId = continuousTrustReference((await context.params).entityId, "entityId");
    const body = await request.json() as Record<string, unknown>;
    const result = await applyContinuousTrustOverride({
      tenantId: auth.enterpriseId,
      entityId,
      actorId: auth.user.id,
      targetState: body.targetState,
      reason: body.reason,
      expiresAt: body.expiresAt,
      signalIds: body.signalIds,
      correlationId,
    });
    return continuousTrustResponse({ ok: true, entityId, result }, 201, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
