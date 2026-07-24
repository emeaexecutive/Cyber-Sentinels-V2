import {
  continuousTrustCorrelationId,
  continuousTrustFailure,
  continuousTrustReference,
  continuousTrustResponse,
  mutationContext,
} from "@/src/lib/continuous-trust/http";
import { recalculateContinuousTrust } from "@/src/lib/continuous-trust/service";

export async function POST(request: Request, context: { params: Promise<{ entityId: string }> }) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const auth = await mutationContext(request, ["owner", "admin", "reviewer"]);
    const entityId = continuousTrustReference((await context.params).entityId, "entityId");
    const body = await request.json() as Record<string, unknown>;
    const result = await recalculateContinuousTrust({
      enterpriseId: auth.enterpriseId,
      subjectId: entityId,
      domainKey: body.domainKey ? continuousTrustReference(body.domainKey, "domainKey") : undefined,
      subjectType: body.entityType ? continuousTrustReference(body.entityType, "entityType") : undefined,
      correlationId,
    });
    return continuousTrustResponse({ ok: true, entityId, result }, result.status === "DUPLICATE" ? 200 : 201, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
