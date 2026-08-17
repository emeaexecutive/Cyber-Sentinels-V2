import { createPublicApiContext, publicApiSuccess } from "@/lib/api/public-contracts";

export function GET(request: Request) {
  const runtimeCommit =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.BUILD_VERSION?.trim() ||
    null;
  const response = publicApiSuccess({
    status: "ok",
    probe: "liveness",
    schema_version: "health-v2",
    release_version: runtimeCommit,
  }, createPublicApiContext(request, "health"));
  response.headers.set("cache-control", "no-store");
  return response;
}
