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
    const repository = createTrustGraphRepository(auth.supabase);
    const [statistics, providers] = await Promise.all([
      repository.statistics(auth.enterpriseId),
      repository.providerHealth(auth.enterpriseId),
    ]);
    const unhealthyProviders = providers.filter((provider) =>
      ["DEGRADED", "UNAVAILABLE", "MISCONFIGURED"].includes(provider.health),
    );
    return trustGraphResponse(
      {
        ok: true,
        health: {
          status: unhealthyProviders.length ? "DEGRADED" : "OPERATIONAL",
          statistics,
          unhealthyProviders: unhealthyProviders.length,
          measuredAt: new Date().toISOString(),
        },
      },
      200,
      correlationId,
    );
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}
