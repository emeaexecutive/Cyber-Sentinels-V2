import { publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { getExternalAgent } from "@/lib/public-api/v1/runtime";

export async function GET(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}",
    routeClass: "read",
    scopes: ["authority:read"],
  }, async ({ principal, correlationId }) =>
    publicApiResponse(await getExternalAgent(principal, decodeURIComponent(agentId)), {}, correlationId));
}
