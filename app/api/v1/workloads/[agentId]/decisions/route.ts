import { boundedJson, PublicApiError, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withWorkloadApi } from "@/lib/public-api/v1/handler";
import { requestExternalDecision } from "@/lib/public-api/v1/runtime";

type Context = { params: Promise<{ agentId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { agentId } = await params;
  return withWorkloadApi(request, {
    route: "/api/v1/workloads/{agentId}/decisions",
    routeClass: "decision",
    scope: "trust:request",
    agentId: decodeURIComponent(agentId),
  }, async ({ principal, correlationId, requestId, agentId: boundAgentId }) => {
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
    if (!idempotencyKey) {
      throw new PublicApiError("IDEMPOTENCY_KEY_REQUIRED", "An Idempotency-Key header is required.", 400);
    }
    const body = await boundedJson(request, 16_384);
    if (Object.hasOwn(body, "operational_entity_id")) {
      throw new PublicApiError(
        "INVALID_REQUEST",
        "The workload identifier is derived from the authenticated credential.",
        400,
      );
    }
    const result = await requestExternalDecision(
      principal,
      { ...body, operational_entity_id: boundAgentId },
      idempotencyKey,
      new URL(request.url).origin,
      correlationId,
    );
    return publicApiResponse(result, { status: result.idempotent_replay ? 200 : 201 }, correlationId, requestId);
  });
}
