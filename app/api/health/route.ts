import { createPublicApiContext, publicApiSuccess } from "@/lib/api/public-contracts";

export function GET(request: Request) {
  const response = publicApiSuccess({
    status: "ok",
    probe: "liveness",
    schema_version: "health-v2",
    release_version: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.BUILD_VERSION ?? null,
  }, createPublicApiContext(request, "health"));
  response.headers.set("cache-control", "no-store");
  return response;
}
