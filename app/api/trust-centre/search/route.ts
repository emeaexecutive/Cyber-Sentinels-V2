import {
  trustCentreContext,
  trustCentreCorrelationId,
  trustCentreFailure,
  trustCentreResponse,
} from "@/src/lib/trust-centre/http";
import { enterpriseTrustCentreRepository } from "@/src/lib/trust-centre/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = trustCentreCorrelationId(request);
  try {
    const auth = await trustCentreContext(request);
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const requested = Number(url.searchParams.get("limit") ?? 25);
    const limit = Number.isFinite(requested)
      ? Math.min(50, Math.max(1, Math.floor(requested)))
      : 25;
    const results = await enterpriseTrustCentreRepository().search(
      auth.enterpriseId,
      query,
      limit
    );
    return trustCentreResponse(
      { ok: true, results, page: { limit, count: results.length } },
      200,
      correlationId
    );
  } catch (error) {
    return trustCentreFailure(error, correlationId);
  }
}
