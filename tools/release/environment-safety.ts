import { readFileSync } from "node:fs";

export const environmentSafetyErrorCodes = [
  "ENVIRONMENT_IDENTITY_MISSING",
  "ENVIRONMENT_UNKNOWN",
  "PRODUCTION_OPERATION_REFUSED",
  "SYNTHETIC_MODE_REQUIRED",
  "ENVIRONMENT_REFERENCE_MISMATCH",
] as const;

export type EnvironmentSafetyErrorCode = (typeof environmentSafetyErrorCodes)[number];

type EnvironmentType = "production" | "staging";

type EnvironmentRegistryEntry = {
  name: string;
  displayName: string;
  environmentType: EnvironmentType;
  projectReference: string;
  region: string;
  production: boolean;
  syntheticDataOnly: boolean;
  automatedMutationPermitted: boolean;
  automatedStagingValidationPermitted: boolean;
  permittedOperations: string[];
  knownApplicationHostnames: string[];
  retentionClassification: string;
};

type EnvironmentRegistry = {
  schemaVersion: number;
  environments: EnvironmentRegistryEntry[];
};

export type EnvironmentSafetyInput = {
  environmentName?: string;
  projectReference?: string;
  expectedEnvironmentType?: EnvironmentType;
  syntheticFixtures?: boolean;
  hostname?: string;
};

export type SafeEnvironmentIdentity = {
  statusCode: "ENVIRONMENT_VALIDATED";
  environmentName: string;
  environmentType: EnvironmentType;
  projectReference: string;
  region: string;
  syntheticFixtures: true;
  automatedStagingValidationPermitted: true;
};

export class EnvironmentSafetyError extends Error {
  readonly code: EnvironmentSafetyErrorCode;

  constructor(code: EnvironmentSafetyErrorCode) {
    super(code);
    this.name = "EnvironmentSafetyError";
    this.code = code;
  }
}

const registry = JSON.parse(
  readFileSync(new URL("../../config/environments/registry.json", import.meta.url), "utf8"),
) as EnvironmentRegistry;

function fail(code: EnvironmentSafetyErrorCode): never {
  throw new EnvironmentSafetyError(code);
}

function normalizeHostname(value: string | undefined) {
  if (!value) return "";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  try {
    return new URL(normalized.includes("://") ? normalized : "https://" + normalized).hostname;
  } catch {
    return normalized.split("/")[0]?.split(":")[0] ?? "";
  }
}

function isProductionHostname(hostname: string) {
  if (!hostname) return false;
  const production = registry.environments.find((environment) => environment.production);
  if (!production) return true;
  return (
    hostname === "cybersentinels.com" ||
    hostname.endsWith(".cybersentinels.com") ||
    hostname.includes(production.projectReference) ||
    production.knownApplicationHostnames.includes(hostname)
  );
}

export function assertSafeStagingEnvironment(input: EnvironmentSafetyInput): SafeEnvironmentIdentity {
  const environmentName = input.environmentName?.trim().toLowerCase();
  const projectReference = input.projectReference?.trim().toLowerCase();
  const expectedEnvironmentType = input.expectedEnvironmentType?.trim().toLowerCase() as
    | EnvironmentType
    | undefined;

  if (!environmentName || !projectReference || !expectedEnvironmentType) {
    fail("ENVIRONMENT_IDENTITY_MISSING");
  }

  if (isProductionHostname(normalizeHostname(input.hostname))) {
    fail("PRODUCTION_OPERATION_REFUSED");
  }

  const environmentByName = registry.environments.find(
    (environment) => environment.name.toLowerCase() === environmentName,
  );
  const environmentByReference = registry.environments.find(
    (environment) => environment.projectReference.toLowerCase() === projectReference,
  );

  if (!environmentByName || !environmentByReference) {
    fail("ENVIRONMENT_UNKNOWN");
  }

  if (environmentByName !== environmentByReference) {
    fail("ENVIRONMENT_REFERENCE_MISMATCH");
  }

  if (
    environmentByName.production ||
    environmentByName.environmentType === "production" ||
    !environmentByName.automatedStagingValidationPermitted
  ) {
    fail("PRODUCTION_OPERATION_REFUSED");
  }

  if (environmentByName.environmentType !== expectedEnvironmentType) {
    fail("ENVIRONMENT_REFERENCE_MISMATCH");
  }

  if (environmentByName.syntheticDataOnly && input.syntheticFixtures !== true) {
    fail("SYNTHETIC_MODE_REQUIRED");
  }

  return {
    statusCode: "ENVIRONMENT_VALIDATED",
    environmentName: environmentByName.name,
    environmentType: environmentByName.environmentType,
    projectReference: environmentByName.projectReference,
    region: environmentByName.region,
    syntheticFixtures: true,
    automatedStagingValidationPermitted: true,
  };
}
