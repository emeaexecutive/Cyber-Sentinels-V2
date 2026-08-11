import { publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { getExternalReceipt } from "@/lib/public-api/v1/runtime";

export async function GET(request: Request, { params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/trust/transactions/{transactionId}/receipt",
    routeClass: "read",
    scopes: ["trust:read"],
  }, async ({ principal, correlationId }) =>
    publicApiResponse(await getExternalReceipt(principal, transactionId), {
      headers: { "content-disposition": `attachment; filename="cyber-sentinels-${transactionId}.json"` },
    }, correlationId));
}
