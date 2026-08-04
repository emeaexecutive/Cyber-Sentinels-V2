import { assertLiveStagingGuard } from "./live-staging-guard.ts";
import type { LiveStagingGuardInput } from "./live-staging-guard.ts";

const input: LiveStagingGuardInput = {
  environmentName: process.env.STAGING_ENVIRONMENT ?? process.env.NODE_ENV ?? "staging",
  projectReference: process.env.STAGING_PROJECT_REFERENCE ?? "agpyhygpfmppjkxwcpac",
  expectedEnvironmentType: "staging",
  syntheticFixtures: process.env.SYNTHETIC_FIXTURES === "true",
  migrationHead: process.env.STAGING_MIGRATION_HEAD ?? "202608010002",
  expectedMigrationHead: "202608010002",
  approvedHostname: process.env.STAGING_HOSTNAME ?? "staging.example.invalid",
  liveTestConfirmation: process.env.LIVE_TEST_CONFIRMATION === "true",
};

try {
  assertLiveStagingGuard(input);
  console.log("LIVE_TARGET_VALIDATED");
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}
