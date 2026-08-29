import { boundedJson, PublicApiError, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { requestExternalDecision } from "@/lib/public-api/v1/runtime";

export async function POST(request: Request) {
  return withPublicApi(request, {
    route: "/api/v1/trust/decisions",
    routeClass: "decision",
    scopes: ["trust:request"],
  }, async ({ principal, correlationId }) => {
    const key = request.headers.get("idempotency-key")?.trim() ?? "";
    if (!key) throw new PublicApiError("IDEMPOTENCY_KEY_REQUIRED", "An Idempotency-Key header is required.", 400);
    const result = await requestExternalDecision(principal, await boundedJson(request, 16_384), key, new URL(request.url).origin, correlationId);
    return publicApiResponse(result, { status: result.idempotent_replay ? 200 : 201 }, correlationId);
  });
}
