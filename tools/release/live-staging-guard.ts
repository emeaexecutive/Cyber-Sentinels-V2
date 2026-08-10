import { assertSafeStagingEnvironment, type EnvironmentSafetyInput } from "./environment-safety.ts";

export const liveStagingGuardErrorCodes = [
  "LIVE_TARGET_IDENTITY_MISSING",
  "LIVE_TARGET_UNKNOWN",
  "LIVE_TARGET_PRODUCTION_REFUSED",
  "LIVE_TARGET_MIGRATION_HEAD_MISMATCH",
  "LIVE_SYNTHETIC_MODE_REQUIRED",
  "LIVE_TEST_CONFIRMATION_REQUIRED",
] as const;

export type LiveStagingGuardErrorCode = (typeof liveStagingGuardErrorCodes)[number];

export type LiveStagingGuardInput = EnvironmentSafetyInput & {
  expectedMigrationHead?: string;
  migrationHead?: string;
  approvedHostname?: string;
  liveTestConfirmation?: boolean;
};

export type LiveStagingGuardResult = {
  statusCode: "LIVE_TARGET_VALIDATED";
  environmentName: string;
  environmentType: "staging";
  projectReference: string;
  migrationHead: string;
  syntheticFixtures: true;
  liveTestConfirmation: true;
};

export class LiveStagingGuardError extends Error {
  readonly code: LiveStagingGuardErrorCode;

  constructor(code: LiveStagingGuardErrorCode) {
    super(code);
    this.name = "LiveStagingGuardError";
    this.code = code;
  }
}

function fail(code: LiveStagingGuardErrorCode): never {
  throw new LiveStagingGuardError(code);
}

function normalizeHostname(value: string | undefined) {
  if (!value) return "";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  try {
    return new URL(normalized.includes("://") ? normalized : `https://${normalized}`).hostname;
  } catch {
    return normalized.split("/")[0]?.split(":")[0] ?? "";
  }
}

function isProductionHostname(hostname: string) {
  if (!hostname) return false;
  return /cybersentinels\.com$/i.test(hostname) || hostname.includes("cybersentinels.com") || hostname.includes("kecgtsfibkypjuaxqbjx");
}

export function assertLiveStagingGuard(input: LiveStagingGuardInput): LiveStagingGuardResult {
  const environmentName = input.environmentName?.trim().toLowerCase();
  const projectReference = input.projectReference?.trim().toLowerCase();
  const expectedEnvironmentType = input.expectedEnvironmentType?.trim().toLowerCase();
  const migrationHead = input.migrationHead?.trim();
  const expectedMigrationHead = input.expectedMigrationHead?.trim();
  const approvedHostname = input.approvedHostname ?? input.hostname;

  if (!environmentName || !projectReference || !expectedEnvironmentType) {
    fail("LIVE_TARGET_IDENTITY_MISSING");
  }

  if (projectReference === "kecgtsfibkypjuaxqbjx" || projectReference.includes("kecgtsfibkypjuaxqbjx")) {
    fail("LIVE_TARGET_PRODUCTION_REFUSED");
  }

  if (input.liveTestConfirmation !== true) {
    fail("LIVE_TEST_CONFIRMATION_REQUIRED");
  }

  if (!input.syntheticFixtures) {
    fail("LIVE_SYNTHETIC_MODE_REQUIRED");
  }

  if (!migrationHead || !expectedMigrationHead || migrationHead !== expectedMigrationHead) {
    fail("LIVE_TARGET_MIGRATION_HEAD_MISMATCH");
  }

  const hostname = normalizeHostname(approvedHostname);
  if (isProductionHostname(hostname)) {
    fail("LIVE_TARGET_PRODUCTION_REFUSED");
  }

  try {
    const safetyResult = assertSafeStagingEnvironment({
      environmentName,
      projectReference,
      expectedEnvironmentType: expectedEnvironmentType as "staging",
      syntheticFixtures: true,
      hostname: approvedHostname,
    });
    if (safetyResult.environmentType !== "staging") {
      fail("LIVE_TARGET_PRODUCTION_REFUSED");
    }
    return {
      statusCode: "LIVE_TARGET_VALIDATED",
      environmentName: safetyResult.environmentName,
      environmentType: "staging",
      projectReference: safetyResult.projectReference,
      migrationHead,
      syntheticFixtures: true,
      liveTestConfirmation: true,
    };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const code = String((error as { code?: string }).code ?? "");
      if (code === "PRODUCTION_OPERATION_REFUSED") {
        fail("LIVE_TARGET_PRODUCTION_REFUSED");
      }
      if (code === "ENVIRONMENT_UNKNOWN" || code === "ENVIRONMENT_REFERENCE_MISMATCH") {
        fail("LIVE_TARGET_UNKNOWN");
      }
      if (code === "SYNTHETIC_MODE_REQUIRED") {
        fail("LIVE_SYNTHETIC_MODE_REQUIRED");
      }
      if (code === "ENVIRONMENT_IDENTITY_MISSING") {
        fail("LIVE_TARGET_IDENTITY_MISSING");
      }
    }
    throw error;
  }
}
