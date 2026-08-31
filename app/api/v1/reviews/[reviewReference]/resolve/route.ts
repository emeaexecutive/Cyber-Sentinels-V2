import { boundedJson, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { resolveExternalReview } from "@/lib/public-api/v1/runtime";

export async function POST(request: Request, { params }: { params: Promise<{ reviewReference: string }> }) {
  const { reviewReference } = await params;
  return withPublicApi(request, {
    route: "/api/v1/reviews/{reviewReference}/resolve",
    routeClass: "review",
    scopes: ["review:write"],
  }, async ({ principal, correlationId, requestId }) =>
    publicApiResponse(await resolveExternalReview(principal, decodeURIComponent(reviewReference), await boundedJson(request, 8_192), correlationId), {}, correlationId, requestId));
}
