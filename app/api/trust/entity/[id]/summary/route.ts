import { TrustGraphService } from "@/src/core/trust/graph";
import {
  trustGraphContext,
  trustGraphCorrelationId,
  trustGraphFailure,
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
    const summary = await new TrustGraphService(
      createTrustGraphRepository(auth.supabase),
    ).entitySummary(auth.enterpriseId, entityId);
    if (!summary) return trustGraphResponse({ ok: false, code: "ENTITY_NOT_FOUND", error: "Trust Entity was not found." }, 404, correlationId);
    return trustGraphResponse({ ok: true, summary }, 200, correlationId);
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}
