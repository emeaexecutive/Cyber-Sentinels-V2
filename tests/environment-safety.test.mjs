import assert from "node:assert/strict";
import test from "node:test";
import {
  EnvironmentSafetyError,
  assertSafeStagingEnvironment,
} from "../tools/release/environment-safety.ts";

const staging = {
  environmentName: "staging",
  projectReference: "agpyhygpfmppjkxwcpac",
  expectedEnvironmentType: "staging",
  syntheticFixtures: true,
};

function expectSafetyError(input, code) {
  assert.throws(
    () => assertSafeStagingEnvironment(input),
    (error) => error instanceof EnvironmentSafetyError && error.code === code && error.message === code,
  );
}

test("known staging reference is accepted", () => {
  const result = assertSafeStagingEnvironment(staging);
  assert.deepEqual(result, {
    statusCode: "ENVIRONMENT_VALIDATED",
    environmentName: "staging",
    environmentType: "staging",
    projectReference: "agpyhygpfmppjkxwcpac",
    region: "eu-west-3",
    syntheticFixtures: true,
    automatedStagingValidationPermitted: true,
  });
});

test("Production reference is rejected", () => {
  expectSafetyError(
    {
      environmentName: "production",
      projectReference: "kecgtsfibkypjuaxqbjx",
      expectedEnvironmentType: "production",
      syntheticFixtures: true,
    },
    "PRODUCTION_OPERATION_REFUSED",
  );
});

test("Production database hostname is rejected", () => {
  expectSafetyError(
    { ...staging, hostname: "db.kecgtsfibkypjuaxqbjx.supabase.co" },
    "PRODUCTION_OPERATION_REFUSED",
  );
});

test("Production application domain is rejected", () => {
  expectSafetyError(
    { ...staging, hostname: "https://www.cybersentinels.com/release" },
    "PRODUCTION_OPERATION_REFUSED",
  );
});

test("unknown reference is rejected", () => {
  expectSafetyError(
    { ...staging, projectReference: "unknownstagingrefxxx" },
    "ENVIRONMENT_UNKNOWN",
  );
});

test("missing identity is rejected", () => {
  expectSafetyError(
    { expectedEnvironmentType: "staging", syntheticFixtures: true },
    "ENVIRONMENT_IDENTITY_MISSING",
  );
});

test("mismatched name and reference are rejected", () => {
  expectSafetyError(
    { ...staging, projectReference: "kecgtsfibkypjuaxqbjx" },
    "ENVIRONMENT_REFERENCE_MISMATCH",
  );
});

test("staging validation with synthetic mode missing is rejected", () => {
  expectSafetyError(
    { ...staging, syntheticFixtures: undefined },
    "SYNTHETIC_MODE_REQUIRED",
  );
});

test("staging synthetic mode is accepted", () => {
  assert.equal(assertSafeStagingEnvironment(staging).statusCode, "ENVIRONMENT_VALIDATED");
});

test("safe output never contains credential or URL values", () => {
  const credential = "postgresql://postgres:do-not-emit@example.invalid:5432/postgres";
  const output = JSON.stringify(assertSafeStagingEnvironment({ ...staging, hostname: credential }));
  assert.doesNotMatch(output, /postgresql:|do-not-emit|example\.invalid|password|token|service.role/i);
  assert.equal(output.includes(credential), false);
});
