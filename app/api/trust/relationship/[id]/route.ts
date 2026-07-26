import { TrustGraphService } from "@/src/core/trust/graph";
import {
  trustGraphContext,
  trustGraphCorrelationId,
  trustGraphFailure,
  trustGraphResponse,
  trustGraphUuid,
  trustGraphVersion,
} from "@/src/core/trust/graph/http";
import { createTrustGraphRepository } from "@/src/core/trust/repositories/supabase";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = trustGraphCorrelationId(request);
  try {
    const auth = await trustGraphContext(request, true, ["owner", "admin", "reviewer"]);
    const relationshipId = trustGraphUuid((await context.params).id, "relationshipId");
    const expectedVersion = trustGraphVersion(request.headers.get("if-match"));
    const relationship = await new TrustGraphService(
      createTrustGraphRepository(auth.supabase),
    ).removeRelationship(
      { tenantId: auth.enterpriseId, actorId: auth.user.id, correlationId },
      relationshipId,
      expectedVersion,
    );
    return trustGraphResponse({ ok: true, relationship }, 200, correlationId);
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}
