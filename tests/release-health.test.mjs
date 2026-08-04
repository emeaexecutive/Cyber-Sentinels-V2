import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReleaseHealth, redactReleaseHealthPayload } from "../tools/release/release-health.ts";
import { GET } from "../app/api/internal/release-health/route.ts";

test("release health flags missing schema release ID", () => {
  const result = evaluateReleaseHealth({
    environment: "staging",
    applicationBuildSha: "sha-123",
    expectedDatabaseReleaseId: "release-epic29",
    observedDatabaseReleaseId: undefined,
    schemaCompatible: false,
    requiredObjectsPresent: true,
    rlsValidationStatus: "passed",
    migrationPhase: "ready",
    providerHealthObjectsStatus: "healthy",
    epic26Status: "healthy",
    epic27Status: "healthy",
    epic28Status: "healthy",
    correlationId: "corr-001",
  });

  assert.equal(result.status, "incompatible");
  assert.equal(result.codes[0], "SCHEMA_RELEASE_ID_MISSING");
});

test("release health flags outdated observed release ID", () => {
  const result = evaluateReleaseHealth({
    environment: "staging",
    applicationBuildSha: "sha-123",
    expectedDatabaseReleaseId: "release-epic29",
    observedDatabaseReleaseId: "release-epic28",
    schemaCompatible: false,
    requiredObjectsPresent: true,
    rlsValidationStatus: "passed",
    migrationPhase: "ready",
    providerHealthObjectsStatus: "healthy",
    epic26Status: "healthy",
    epic27Status: "healthy",
    epic28Status: "healthy",
    correlationId: "corr-002",
  });

  assert.equal(result.status, "incompatible");
  assert.equal(result.codes[0], "SCHEMA_RELEASE_BEHIND");
});

test("release health flags partial migrations", () => {
  const result = evaluateReleaseHealth({
    environment: "staging",
    applicationBuildSha: "sha-123",
    expectedDatabaseReleaseId: "release-epic29",
    observedDatabaseReleaseId: "release-epic29",
    schemaCompatible: false,
    requiredObjectsPresent: true,
    rlsValidationStatus: "passed",
    migrationPhase: "partial",
    providerHealthObjectsStatus: "healthy",
    epic26Status: "healthy",
    epic27Status: "healthy",
    epic28Status: "healthy",
    correlationId: "corr-003",
  });

  assert.equal(result.status, "incomplete");
  assert.equal(result.codes[0], "SCHEMA_RELEASE_PARTIAL");
});

test("release health endpoint redacts sensitive payloads", async () => {
  const request = new Request("http://localhost/api/internal/release-health", {
    headers: {
      "x-release-health-admin": "true",
      authorization: "Bearer stage-admin",
    },
  });

  const response = await GET(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "healthy");
  assert.equal(body.environment, "staging");
  assert.equal(body.correlationId.startsWith("release-health-"), true);
  assert.equal(body.applicationBuildSha, "sha-staging");
  assert.equal(body.schemaCompatible, true);
  assert.deepEqual(redactReleaseHealthPayload({
    databaseUrl: "postgresql://postgres:secret@example.invalid/postgres",
    serviceRoleKey: "super-secret",
    serviceRolePresence: true,
  }), {
    databaseUrl: "[REDACTED]",
    serviceRoleKey: "[REDACTED]",
    serviceRolePresence: false,
  });
});
