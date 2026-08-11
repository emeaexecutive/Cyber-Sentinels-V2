import { boundedJson, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { registerExternalCredential } from "@/lib/public-api/v1/runtime";

export async function POST(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}/credentials",
    routeClass: "registration",
    scopes: ["agents:write"],
  }, async ({ principal, correlationId }) => {
    const result = await registerExternalCredential(principal, decodeURIComponent(agentId), await boundedJson(request, 16_384));
    return publicApiResponse(result, { status: 201 }, correlationId);
  });
}
