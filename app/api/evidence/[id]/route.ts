import { createEvidenceRepository } from "@/src/core/trust/evidence/supabase-repository";
import { EvidenceGraphService } from "@/src/core/trust/graph";
import {
  trustIntelligenceContext,
  trustIntelligenceCorrelationId,
  trustIntelligenceFailure,
  trustIntelligenceReference,
  trustIntelligenceResponse,
} from "@/src/core/trust/intelligence/http";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = trustIntelligenceCorrelationId(request);
  try {
    const auth = await trustIntelligenceContext(request);
    const evidenceId = trustIntelligenceReference((await context.params).id, "evidenceId");
    const service = new EvidenceGraphService(createEvidenceRepository(auth.supabase));
    const evidence = await service.getEvidence(auth.enterpriseId, evidenceId);
    if (!evidence) {
      return trustIntelligenceResponse(
        { ok: false, code: "EVIDENCE_NOT_FOUND", error: "Evidence was not found." },
        404,
        correlationId,
      );
    }
    return trustIntelligenceResponse({ ok: true, evidence }, 200, correlationId);
  } catch (error) {
    return trustIntelligenceFailure(error, correlationId);
  }
}
