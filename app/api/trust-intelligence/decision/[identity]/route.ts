import { TrustDNAEngine } from "@/src/core/trust/dna";
import { createEvidenceRepository } from "@/src/core/trust/evidence/supabase-repository";
import { DecisionIntelligenceEngine } from "@/src/core/trust/intelligence";
import {
  trustIntelligenceContext,
  trustIntelligenceCorrelationId,
  trustIntelligenceFailure,
  trustIntelligenceLimit,
  trustIntelligenceReference,
  trustIntelligenceResponse,
} from "@/src/core/trust/intelligence/http";
import { deterministicUuid } from "@/src/lib/trust-core/hash";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ identity: string }> },
) {
  const correlationId = trustIntelligenceCorrelationId(request);
  try {
    const auth = await trustIntelligenceContext(request);
    const identityId = trustIntelligenceReference((await context.params).identity, "identity");
    const evidence = await createEvidenceRepository(auth.supabase).findNodesByIdentity(
      auth.enterpriseId,
      identityId,
      trustIntelligenceLimit(request),
    );
    const profile = new TrustDNAEngine().build({
      profileId: deterministicUuid({
        tenantId: auth.enterpriseId,
        identityId,
        evidenceIds: evidence.map((item) => item.id).sort(),
      }),
      tenantId: auth.enterpriseId,
      identityId,
      evidence,
    });
    const decision = new DecisionIntelligenceEngine().explain(profile, evidence);
    return trustIntelligenceResponse({ ok: true, decision, profile }, 200, correlationId);
  } catch (error) {
    return trustIntelligenceFailure(error, correlationId);
  }
}
