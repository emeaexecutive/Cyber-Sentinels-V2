import { publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { getExternalReview } from "@/lib/public-api/v1/runtime";

export async function GET(request: Request, { params }: { params: Promise<{ reviewReference: string }> }) {
  const { reviewReference } = await params;
  return withPublicApi(request, {
    route: "/api/v1/reviews/{reviewReference}",
    routeClass: "review",
    scopes: ["review:read"],
  }, async ({ principal, correlationId, requestId }) =>
    publicApiResponse(await getExternalReview(principal, decodeURIComponent(reviewReference)), {}, correlationId, requestId));
}
