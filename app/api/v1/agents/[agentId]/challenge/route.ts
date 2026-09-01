import { boundedJson, publicApiResponse, assertOnlyFields } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { issueExternalChallenge } from "@/lib/public-api/v1/runtime";

export async function POST(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}/challenge",
    routeClass: "challenge",
    scopes: ["agents:verify"],
  }, async ({ principal, correlationId, requestId }) => {
    const body = await boundedJson(request, 1_024);
    assertOnlyFields(body, []);
    const audience = `${new URL(request.url).origin}/api/v1`;
    const result = await issueExternalChallenge(principal, decodeURIComponent(agentId), audience);
    return publicApiResponse(result, { status: 201 }, correlationId, requestId);
  });
}
