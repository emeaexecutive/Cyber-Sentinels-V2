import { TrustDNAService } from "@/src/core/trust/dna";
import { createTrustDNARepository } from "@/src/core/trust/dna/supabase-repository";
import {
  trustGraphBody,
  trustGraphContext,
  trustGraphCorrelationId,
  trustGraphFailure,
  trustGraphResponse,
  trustGraphUuid,
} from "@/src/core/trust/graph/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const correlationId = trustGraphCorrelationId(request);
  try {
    const auth = await trustGraphContext(request, true, ["owner", "admin", "reviewer"]);
    const body = await trustGraphBody(request);
    const entityId = trustGraphUuid(body.entityId, "entityId");
    const profile = await new TrustDNAService(
      createTrustDNARepository(auth.supabase),
    ).recalculate(auth.enterpriseId, entityId);
    return trustGraphResponse({ ok: true, profile }, 201, correlationId);
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}
