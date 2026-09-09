import { boundedJson, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { recordIncident } from "@/lib/operational-incidents/server";
export async function POST(request: Request) {
  return withPublicApi(request, { route: "/api/v1/incidents", routeClass: "evidence", scopes: ["incidents:write"] },
    async ({ principal, correlationId, requestId }) => publicApiResponse(await recordIncident(principal, await boundedJson(request, 16_384)), { status: 201 }, correlationId, requestId));
}
