import { boundedJson, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { grantExternalAuthority, listExternalAuthorities } from "@/lib/public-api/v1/runtime";

type Context = { params: Promise<{ agentId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { agentId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}/authorities",
    routeClass: "authority",
    scopes: ["authority:read"],
  }, async ({ principal, correlationId, requestId }) =>
    publicApiResponse(await listExternalAuthorities(principal, decodeURIComponent(agentId)), {}, correlationId, requestId));
}

export async function POST(request: Request, { params }: Context) {
  const { agentId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}/authorities",
    routeClass: "authority",
    scopes: ["authority:write"],
  }, async ({ principal, correlationId, requestId }) =>
    publicApiResponse(await grantExternalAuthority(principal, decodeURIComponent(agentId), await boundedJson(request, 8_192), correlationId), { status: 201 }, correlationId, requestId));
}
