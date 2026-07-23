import { TrustGraphService } from "@/src/core/trust/graph";
import {
  trustGraphBody,
  trustGraphContext,
  trustGraphCorrelationId,
  trustGraphFailure,
  trustGraphResponse,
} from "@/src/core/trust/graph/http";
import { createTrustGraphRepository } from "@/src/core/trust/repositories/supabase";
import type { TrustEntityStatus, TrustEntityType } from "@/src/core/trust/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const correlationId = trustGraphCorrelationId(request);
  try {
    const auth = await trustGraphContext(request, true, ["owner", "admin", "reviewer"]);
    const body = await trustGraphBody(request);
    const entity = await new TrustGraphService(
      createTrustGraphRepository(auth.supabase),
    ).createEntity(
      { tenantId: auth.enterpriseId, actorId: auth.user.id, correlationId },
      {
        entityType: String(body.entityType ?? "") as TrustEntityType,
        entityName: String(body.entityName ?? ""),
        status: body.status ? String(body.status) as TrustEntityStatus : undefined,
        metadata: body.metadata as Record<string, unknown> | undefined,
      },
    );
    return trustGraphResponse({ ok: true, entity }, 201, correlationId);
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}
