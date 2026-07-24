import { TrustDNAService } from "@/src/core/trust/dna";
import { createTrustDNARepository } from "@/src/core/trust/dna/supabase-repository";
import {
  trustGraphContext,
  trustGraphCorrelationId,
  trustGraphFailure,
  trustGraphLimit,
  trustGraphResponse,
  trustGraphUuid,
} from "@/src/core/trust/graph/http";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ identity: string }> },
) {
  const correlationId = trustGraphCorrelationId(request);
  try {
    const auth = await trustGraphContext(request);
    const entityId = trustGraphUuid((await context.params).identity, "entityId");
    const history = await new TrustDNAService(
      createTrustDNARepository(auth.supabase),
    ).history(auth.enterpriseId, entityId, trustGraphLimit(request, 100));
    return trustGraphResponse({ ok: true, entityId, history }, 200, correlationId);
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}
