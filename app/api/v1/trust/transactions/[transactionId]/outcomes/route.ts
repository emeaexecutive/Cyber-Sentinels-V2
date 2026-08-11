import { boundedJson, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { submitExternalOutcome } from "@/lib/public-api/v1/runtime";

export async function POST(request: Request, { params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/trust/transactions/{transactionId}/outcomes",
    routeClass: "outcome",
    scopes: ["outcomes:write"],
  }, async ({ principal, correlationId }) =>
    publicApiResponse(await submitExternalOutcome(principal, transactionId, await boundedJson(request, 16_384)), { status: 201 }, correlationId));
}
