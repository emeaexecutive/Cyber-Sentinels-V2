import { deterministicUuid } from "@/src/lib/trust-core/hash";
import { TrustDNAEngine } from "@/src/core/trust/dna";
import { createEvidenceRepository } from "@/src/core/trust/evidence/supabase-repository";
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
    const evidence = await createEvidenceRepository(auth.supabase).findNodesByIdentity(
      auth.enterpriseId,
      identityId,
      trustIntelligenceLimit(request),
    );
    const profileId = deterministicUuid({
      tenantId: auth.enterpriseId,
      identityId,
      evidenceIds: evidence.map((item) => item.id).sort(),
    });
    const profile = new TrustDNAEngine().build({
      profileId,
      tenantId: auth.enterpriseId,
      identityId,
      evidence,
    });
    return trustIntelligenceResponse({ ok: true, profile }, 200, correlationId);
  } catch (error) {
    return trustIntelligenceFailure(error, correlationId);
  }
}
