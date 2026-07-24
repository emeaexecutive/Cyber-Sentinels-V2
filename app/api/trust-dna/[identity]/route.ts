import { deterministicUuid } from "@/src/lib/trust-core/hash";
import { TrustDNAEngine, TrustDNAService } from "@/src/core/trust/dna";
import { createTrustDNARepository } from "@/src/core/trust/dna/supabase-repository";
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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ identity: string }> },
) {
  const correlationId = trustIntelligenceCorrelationId(request);
  try {
    const auth = await trustIntelligenceContext(request);
    const identityId = trustIntelligenceReference((await context.params).identity, "identity");
    if (uuidPattern.test(identityId)) {
      const result = await new TrustDNAService(
        createTrustDNARepository(auth.supabase),
      ).getProfile(auth.enterpriseId, identityId, trustIntelligenceLimit(request));
      return trustIntelligenceResponse(
        { ok: true, profile: result.profile, persisted: result.persisted },
        200,
        correlationId,
      );
    }
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
