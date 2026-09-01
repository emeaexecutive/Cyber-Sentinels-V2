import { assertLiveStagingGuard } from "./live-staging-guard.ts";
import type { LiveStagingGuardInput } from "./live-staging-guard.ts";

const input: LiveStagingGuardInput = {
  environmentName: process.env.STAGING_ENVIRONMENT,
  projectReference: process.env.CYBER_SENTINELS_STAGING_PROJECT_REF,
  expectedEnvironmentType: "staging",
  syntheticFixtures: process.env.SYNTHETIC_FIXTURES === "true",
  migrationHead: process.env.STAGING_MIGRATION_HEAD,
  expectedMigrationHead: "20260829164824",
  approvedHostname: process.env.STAGING_HOSTNAME,
  liveTestConfirmation: process.env.I_CONFIRM_STAGING === "I_CONFIRM_STAGING",
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
