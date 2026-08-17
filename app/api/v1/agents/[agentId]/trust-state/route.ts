import { publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { getExternalTrustState } from "@/lib/public-api/v1/runtime";

export async function GET(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}/trust-state",
    routeClass: "read",
    scopes: ["authority:read"],
  }, async ({ principal, correlationId }) =>
    publicApiResponse(await getExternalTrustState(principal, decodeURIComponent(agentId)), {}, correlationId));
}
