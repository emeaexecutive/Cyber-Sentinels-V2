import { boundedJson, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { listWorkloadBindings, registerWorkloadBinding } from "@/lib/public-api/v1/workload-bindings";

type Context = { params: Promise<{ agentId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { agentId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}/workload-bindings",
    routeClass: "authority",
    scopes: ["agents:write"],
  }, async ({ principal, correlationId, requestId }) =>
    publicApiResponse(await listWorkloadBindings(principal, decodeURIComponent(agentId)), {}, correlationId, requestId));
}

export async function POST(request: Request, { params }: Context) {
  const { agentId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}/workload-bindings",
    routeClass: "authority",
    scopes: ["agents:write"],
  }, async ({ principal, correlationId, requestId }) =>
    publicApiResponse(
      await registerWorkloadBinding(principal, decodeURIComponent(agentId), await boundedJson(request, 8_192)),
      { status: 201 },
      correlationId,
      requestId,
    ));
}
