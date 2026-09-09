import { boundedJson, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { recordIncident } from "@/lib/operational-incidents/server";
export async function POST(request: Request, { params }: { params: Promise<{ incidentId: string }> }) {
  const { incidentId } = await params;
  return withPublicApi(request, { route: "/api/v1/incidents/{incidentId}/chronology", routeClass: "evidence", scopes: ["incidents:write"] },
    async ({ principal, correlationId, requestId }) => publicApiResponse(await recordIncident(principal, await boundedJson(request, 16_384), incidentId), { status: 201 }, correlationId, requestId));
}
