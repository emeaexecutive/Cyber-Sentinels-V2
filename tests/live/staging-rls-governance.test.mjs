import assert from "node:assert/strict";
import test from "node:test";
import { assertLiveStagingGuard, LiveStagingGuardError } from "../../tools/release/live-staging-guard.ts";

const validInput = {
  environmentName: "staging",
  projectReference: "agpyhygpfmppjkxwcpac",
  expectedEnvironmentType: "staging",
  syntheticFixtures: true,
  migrationHead: "202608010002",
  expectedMigrationHead: "202608010002",
  approvedHostname: "staging.example.invalid",
  liveTestConfirmation: true,
};

test("live guard accepts the registered staging target", () => {
  const result = assertLiveStagingGuard(validInput);
  assert.equal(result.statusCode, "LIVE_TARGET_VALIDATED");
  assert.equal(result.environmentType, "staging");
  assert.equal(result.syntheticFixtures, true);
  assert.equal(result.liveTestConfirmation, true);
});

test("live guard rejects production reference", () => {
  assert.throws(
    () => assertLiveStagingGuard({ ...validInput, projectReference: "kecgtsfibkypjuaxqbjx" }),
    (error) => error instanceof LiveStagingGuardError && error.code === "LIVE_TARGET_PRODUCTION_REFUSED",
  );
});

test("live guard requires synthetic mode", () => {
  assert.throws(
    () => assertLiveStagingGuard({ ...validInput, syntheticFixtures: false }),
    (error) => error instanceof LiveStagingGuardError && error.code === "LIVE_SYNTHETIC_MODE_REQUIRED",
  );
});

test("live guard requires migration-head agreement", () => {
  assert.throws(
    () => assertLiveStagingGuard({ ...validInput, migrationHead: "202607310001" }),
    (error) => error instanceof LiveStagingGuardError && error.code === "LIVE_TARGET_MIGRATION_HEAD_MISMATCH",
  );
});

test("live guard requires explicit confirmation", () => {
  assert.throws(
    () => assertLiveStagingGuard({ ...validInput, liveTestConfirmation: false }),
    (error) => error instanceof LiveStagingGuardError && error.code === "LIVE_TEST_CONFIRMATION_REQUIRED",
  );
});
