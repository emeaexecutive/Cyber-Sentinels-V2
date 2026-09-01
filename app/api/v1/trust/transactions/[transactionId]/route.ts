import { publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { getExternalTransaction } from "@/lib/public-api/v1/runtime";

export async function GET(request: Request, { params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/trust/transactions/{transactionId}",
    routeClass: "read",
    scopes: ["trust:read"],
  }, async ({ principal, correlationId, requestId }) =>
    publicApiResponse(await getExternalTransaction(principal, transactionId), {}, correlationId, requestId));
}
