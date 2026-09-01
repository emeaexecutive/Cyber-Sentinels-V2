import { publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { getExternalReplay } from "@/lib/public-api/v1/runtime";

export async function GET(request: Request, { params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/trust/transactions/{transactionId}/replay",
    routeClass: "read",
    scopes: ["trust:read"],
  }, async ({ principal, correlationId, requestId }) =>
    publicApiResponse(await getExternalReplay(principal, transactionId), {}, correlationId, requestId));
}
