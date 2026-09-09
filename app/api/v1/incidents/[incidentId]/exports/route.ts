import { boundedJson, PublicApiError, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { exportIncident } from "@/lib/operational-incidents/server";
export async function POST(request: Request, { params }: { params: Promise<{ incidentId: string }> }) {
  const { incidentId } = await params;
  return withPublicApi(request, { route: "/api/v1/incidents/{incidentId}/exports", routeClass: "evidence", scopes: ["evidence:export"] },
    async ({ principal, correlationId, requestId }) => {
      if (Object.keys(await boundedJson(request, 1024)).length) throw new PublicApiError("INVALID_REQUEST", "Export accepts an empty object.", 400);
      return publicApiResponse(await exportIncident(principal, incidentId), { status: 201 }, correlationId, requestId);
    });
}
