import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReleaseQualification } from "../tools/release/release-qualification.ts";

test("release qualification requires complete manifest and stop rules", () => {
  const result = evaluateReleaseQualification({
    manifestPresent: true,
    stopRulesPresent: true,
    observabilityPlanPresent: true,
    recoveryDocPresent: true,
    performanceReportPresent: true,
    compatibilityDocPresent: true,
    evidencePackagePresent: true,
    productionUntouched: true,
    noSecrets: true,
    branchIsStagingFoundation: true,
  });

  assert.equal(result.status, "pass");
  assert.equal(result.codes.length, 0);
});

test("release qualification flags missing release stop rules", () => {
  const result = evaluateReleaseQualification({
    manifestPresent: true,
    stopRulesPresent: false,
    observabilityPlanPresent: true,
    recoveryDocPresent: true,
    performanceReportPresent: true,
    compatibilityDocPresent: true,
    evidencePackagePresent: true,
    productionUntouched: true,
    noSecrets: true,
    branchIsStagingFoundation: true,
  });

  assert.equal(result.status, "fail");
  assert.equal(result.codes[0], "RELEASE_STOP_RULES_MISSING");
});
