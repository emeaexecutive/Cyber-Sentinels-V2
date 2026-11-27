import { boundedJson, PublicApiError, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { requestOpenGraphSite } from "@/lib/public-api/v1/opengraph-gateway";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withPublicApi(request, {
    route: "/api/v1/tools/opengraph/site",
    routeClass: "decision",
    scopes: ["trust:request"],
  }, async ({ principal, correlationId, requestId }) => {
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      throw new PublicApiError("CONTENT_TYPE_UNSUPPORTED", "Content-Type must be application/json.", 415);
    }
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
    const body = await boundedJson(request, 16_384);
    const receipt = await requestOpenGraphSite(principal, body, idempotencyKey);
    return publicApiResponse({ ok: true, receipt }, {
      status: receipt.idempotentReplay ? 200 : 201,
      headers: { location: receipt.historyUrl },
    }, correlationId, requestId);
  });
}