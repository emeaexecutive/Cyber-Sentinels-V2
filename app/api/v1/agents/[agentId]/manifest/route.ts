import { boundedJson, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { registerExternalManifest } from "@/lib/public-api/v1/runtime";

export async function POST(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}/manifest",
    routeClass: "registration",
    scopes: ["agents:write"],
  }, async ({ principal, correlationId, requestId }) => {
    const result = await registerExternalManifest(principal, decodeURIComponent(agentId), await boundedJson(request));
    return publicApiResponse(result, { status: 201 }, correlationId, requestId);
  });
}
