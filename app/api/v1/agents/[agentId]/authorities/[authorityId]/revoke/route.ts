import { boundedJson, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { revokeExternalAuthority } from "@/lib/public-api/v1/runtime";

export async function POST(request: Request, { params }: { params: Promise<{ agentId: string; authorityId: string }> }) {
  const { agentId, authorityId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}/authorities/{authorityId}/revoke",
    routeClass: "authority",
    scopes: ["authority:write"],
  }, async ({ principal, correlationId, requestId }) =>
    publicApiResponse(await revokeExternalAuthority(principal, decodeURIComponent(agentId), decodeURIComponent(authorityId), await boundedJson(request, 4_096), correlationId), {}, correlationId, requestId));
}
