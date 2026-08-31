import { publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { getExternalAuthorityById } from "@/lib/public-api/v1/runtime";

export async function GET(request: Request, { params }: { params: Promise<{ agentId: string; authorityId: string }> }) {
  const { agentId, authorityId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}/authorities/{authorityId}",
    routeClass: "authority",
    scopes: ["authority:read"],
  }, async ({ principal, correlationId, requestId }) =>
    publicApiResponse(await getExternalAuthorityById(principal, decodeURIComponent(agentId), decodeURIComponent(authorityId)), {}, correlationId, requestId));
}
