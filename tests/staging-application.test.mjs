import assert from "node:assert/strict";
import test from "node:test";
import { evaluateStagingApplicationValidation } from "../tools/release/staging-application-validation.ts";

test("staging application validation enforces staging-only identity", () => {
  const result = evaluateStagingApplicationValidation({
    environment: "staging",
    deploymentId: "deploy-001",
    buildSha: "sha-staging",
    stagingHostname: "staging.cybersentinels.example",
    releaseId: "release-epic29",
    protectionEnabled: true,
    noindexEnabled: true,
    productionReference: false,
    syntheticMode: true,
  });

  assert.equal(result.status, "pass");
  assert.equal(result.codes.length, 0);
});

test("staging application validation rejects production references", () => {
  const result = evaluateStagingApplicationValidation({
    environment: "production",
    deploymentId: "deploy-001",
    buildSha: "sha-prod",
    stagingHostname: "cybersentinels.com",
    releaseId: "release-epic29",
    protectionEnabled: true,
    noindexEnabled: true,
    productionReference: true,
    syntheticMode: true,
  });

  assert.equal(result.status, "fail");
  assert.equal(result.codes[0], "ENVIRONMENT_REFERENCE_MISMATCH");
});
