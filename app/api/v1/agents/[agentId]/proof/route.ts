import { boundedJson, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { submitExternalProof } from "@/lib/public-api/v1/runtime";

export async function POST(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}/proof",
    routeClass: "proof",
    scopes: ["agents:verify"],
  }, async ({ principal, correlationId, requestId }) => {
    const audience = `${new URL(request.url).origin}/api/v1`;
    const result = await submitExternalProof(principal, decodeURIComponent(agentId), await boundedJson(request, 32_768), audience);
    return publicApiResponse(result, { status: 200 }, correlationId, requestId);
  });
}
