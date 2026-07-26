import { TrustGraphService } from "@/src/core/trust/graph";
import {
  trustGraphBody,
  trustGraphContext,
  trustGraphCorrelationId,
  trustGraphFailure,
  trustGraphResponse,
  trustGraphUuid,
} from "@/src/core/trust/graph/http";
import { createTrustGraphRepository } from "@/src/core/trust/repositories/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const correlationId = trustGraphCorrelationId(request);
  try {
    const auth = await trustGraphContext(request, true, ["owner", "admin", "reviewer"]);
    const body = await trustGraphBody(request);
    const relationship = await new TrustGraphService(
      createTrustGraphRepository(auth.supabase),
    ).createRelationship(
      { tenantId: auth.enterpriseId, actorId: auth.user.id, correlationId },
      {
        sourceEntityId: trustGraphUuid(body.sourceEntityId, "sourceEntityId"),
        targetEntityId: trustGraphUuid(body.targetEntityId, "targetEntityId"),
        relationshipType: String(body.relationshipType ?? ""),
        confidence: Number(body.confidence),
        metadata: (body.metadata as Record<string, string | number | boolean | null>) ?? {},
      },
    );
    return trustGraphResponse({ ok: true, relationship }, 201, correlationId);
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}
