import {
  trustGraphContext,
  trustGraphCorrelationId,
  trustGraphFailure,
  trustGraphResponse,
} from "@/src/core/trust/graph/http";
import { createTrustGraphRepository } from "@/src/core/trust/repositories/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = trustGraphCorrelationId(request);
  try {
    const auth = await trustGraphContext(request, false, ["owner", "admin"]);
    const statistics = await createTrustGraphRepository(auth.supabase).statistics(
      auth.enterpriseId,
    );
    return trustGraphResponse(
      {
        ok: true,
        entities: {
          total: statistics.entities,
          active: statistics.activeEntities,
          evidence: statistics.evidence,
          measuredAt: statistics.measuredAt,
        },
      },
      200,
      correlationId,
    );
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}
