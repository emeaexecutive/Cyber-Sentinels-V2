import { publicApiOpenApi } from "@/lib/public-api/v1/openapi";
import { publicApiResponse } from "@/lib/public-api/v1/contracts";

export const dynamic = "force-static";

export function GET() {
  return publicApiResponse(publicApiOpenApi, { headers: { "cache-control": "public, max-age=300" } });
}
