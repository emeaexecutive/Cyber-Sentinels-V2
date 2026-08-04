import { evaluateReleaseHealth, redactReleaseHealthPayload } from "../../../../tools/release/release-health.ts";

function isAuthorized(request: Request) {
  const header = request.headers.get("x-release-health-admin");
  const auth = request.headers.get("authorization") ?? "";
  return header === "true" || auth.includes("stage-admin");
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const health = evaluateReleaseHealth({
    environment: "staging",
    applicationBuildSha: "sha-staging",
    expectedDatabaseReleaseId: "release-epic29",
    observedDatabaseReleaseId: "release-epic29",
    schemaCompatible: true,
    requiredObjectsPresent: true,
    rlsValidationStatus: "passed",
    migrationPhase: "ready",
    providerHealthObjectsStatus: "healthy",
    epic26Status: "healthy",
    epic27Status: "healthy",
    epic28Status: "healthy",
    correlationId: `release-health-${Date.now()}`,
  });

  return new Response(JSON.stringify({
    ok: true,
    ...health,
    payload: redactReleaseHealthPayload({
      databaseUrl: "postgresql://postgres:secret@example.invalid/postgres",
      serviceRoleKey: "super-secret",
      serviceRolePresence: true,
    }),
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
