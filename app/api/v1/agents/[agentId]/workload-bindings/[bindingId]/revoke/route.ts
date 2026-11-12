import { publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { revokeWorkloadBinding } from "@/lib/public-api/v1/workload-bindings";

type Context = { params: Promise<{ agentId: string; bindingId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { agentId, bindingId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}/workload-bindings/{bindingId}/revoke",
    routeClass: "authority",
    scopes: ["agents:write"],
  }, async ({ principal, correlationId, requestId }) =>
    publicApiResponse(
      await revokeWorkloadBinding(principal, decodeURIComponent(agentId), bindingId),
      {},
      correlationId,
      requestId,
    ));
}
