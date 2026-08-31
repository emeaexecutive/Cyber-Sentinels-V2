import { boundedJson, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { submitExternalEvidence } from "@/lib/public-api/v1/runtime";

export async function POST(request: Request) {
  return withPublicApi(request, {
    route: "/api/v1/evidence",
    routeClass: "evidence",
    scopes: ["evidence:write"],
  }, async ({ principal, correlationId, requestId }) =>
    publicApiResponse(await submitExternalEvidence(principal, await boundedJson(request, 65_536)), { status: 201 }, correlationId, requestId));
}
