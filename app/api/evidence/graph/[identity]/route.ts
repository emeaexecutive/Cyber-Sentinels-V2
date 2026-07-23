import { createEvidenceRepository } from "@/src/core/trust/evidence/supabase-repository";
import { EvidenceGraphService } from "@/src/core/trust/graph";
import {
  trustIntelligenceContext,
  trustIntelligenceCorrelationId,
  trustIntelligenceFailure,
  trustIntelligenceLimit,
  trustIntelligenceReference,
  trustIntelligenceResponse,
} from "@/src/core/trust/intelligence/http";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ identity: string }> },
) {
  const correlationId = trustIntelligenceCorrelationId(request);
  try {
    const auth = await trustIntelligenceContext(request);
    const identityId = trustIntelligenceReference((await context.params).identity, "identity");
    const graph = await new EvidenceGraphService(
      createEvidenceRepository(auth.supabase),
    ).getGraph(auth.enterpriseId, identityId, trustIntelligenceLimit(request));
    return trustIntelligenceResponse({ ok: true, graph }, 200, correlationId);
  } catch (error) {
    return trustIntelligenceFailure(error, correlationId);
  }
}
