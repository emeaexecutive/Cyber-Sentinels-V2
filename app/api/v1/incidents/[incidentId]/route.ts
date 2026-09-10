import { publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { readIncident } from "@/lib/operational-incidents/server";
export async function GET(request: Request, { params }: { params: Promise<{ incidentId: string }> }) {
  const { incidentId } = await params;
  return withPublicApi(request, { route: "/api/v1/incidents/{incidentId}", routeClass: "read", scopes: ["incidents:read"] },
    async ({ principal, correlationId, requestId }) => publicApiResponse(await readIncident(principal, incidentId), {}, correlationId, requestId));
}
