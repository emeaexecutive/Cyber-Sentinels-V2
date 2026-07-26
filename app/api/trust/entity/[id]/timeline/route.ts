import { TrustGraphService } from "@/src/core/trust/graph";
import {
  trustGraphContext,
  trustGraphCorrelationId,
  trustGraphFailure,
  trustGraphLimit,
  trustGraphResponse,
  trustGraphUuid,
} from "@/src/core/trust/graph/http";
import { createTrustGraphRepository } from "@/src/core/trust/repositories/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = trustGraphCorrelationId(request);
  try {
    const auth = await trustGraphContext(request);
    const entityId = trustGraphUuid((await context.params).id, "entityId");
    const timeline = await new TrustGraphService(
      createTrustGraphRepository(auth.supabase),
    ).entityTimeline(auth.enterpriseId, entityId, trustGraphLimit(request, 200));
    return trustGraphResponse({ ok: true, timeline }, 200, correlationId);
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}
