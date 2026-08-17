import { boundedJson, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { registerExternalAgent } from "@/lib/public-api/v1/runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withPublicApi(request, {
    route: "/api/v1/agents",
    routeClass: "registration",
    scopes: ["agents:write"],
  }, async ({ principal, correlationId }) => {
    const result = await registerExternalAgent(principal, await boundedJson(request, 16_384));
    return publicApiResponse(result, { status: 201 }, correlationId);
  });
}
