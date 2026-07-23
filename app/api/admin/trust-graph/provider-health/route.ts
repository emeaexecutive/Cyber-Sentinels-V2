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
    const providers = await createTrustGraphRepository(auth.supabase).providerHealth(
      auth.enterpriseId,
    );
    return trustGraphResponse({ ok: true, providers }, 200, correlationId);
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}
