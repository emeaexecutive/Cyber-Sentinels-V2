import { TrustGraphService } from "@/src/core/trust/graph";
import {
  trustGraphBody,
  trustGraphContext,
  trustGraphCorrelationId,
  trustGraphFailure,
  trustGraphResponse,
  trustGraphUuid,
  trustGraphVersion,
} from "@/src/core/trust/graph/http";
import { createTrustGraphRepository } from "@/src/core/trust/repositories/supabase";
import type { TrustEntityStatus } from "@/src/core/trust/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = trustGraphCorrelationId(request);
  try {
    const auth = await trustGraphContext(request);
    const entityId = trustGraphUuid((await context.params).id, "entityId");
    const entity = await new TrustGraphService(
      createTrustGraphRepository(auth.supabase),
    ).requireEntity(auth.enterpriseId, entityId);
    return trustGraphResponse({ ok: true, entity }, 200, correlationId);
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = trustGraphCorrelationId(request);
  try {
    const auth = await trustGraphContext(request, true, ["owner", "admin", "reviewer"]);
    const body = await trustGraphBody(request);
    const entityId = trustGraphUuid((await context.params).id, "entityId");
    const entity = await new TrustGraphService(
      createTrustGraphRepository(auth.supabase),
    ).updateEntity(
      { tenantId: auth.enterpriseId, actorId: auth.user.id, correlationId },
      entityId,
      {
        expectedVersion: trustGraphVersion(body.expectedVersion),
        entityName: body.entityName === undefined ? undefined : String(body.entityName),
        status: body.status === undefined ? undefined : String(body.status) as Exclude<TrustEntityStatus, "DELETED">,
        metadata: body.metadata as Record<string, unknown> | undefined,
      },
    );
    return trustGraphResponse({ ok: true, entity }, 200, correlationId);
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}
