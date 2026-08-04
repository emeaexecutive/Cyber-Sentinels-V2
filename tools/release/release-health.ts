export type ReleaseHealthStatus = "healthy" | "degraded" | "incompatible" | "incomplete" | "unavailable";

export type ReleaseHealthCode =
  | "SCHEMA_RELEASE_ID_MISSING"
  | "SCHEMA_RELEASE_BEHIND"
  | "SCHEMA_RELEASE_PARTIAL"
  | "SCHEMA_OBJECT_MISSING"
  | "RLS_VALIDATION_FAILED"
  | "ENVIRONMENT_REFERENCE_MISMATCH";

export type ReleaseHealthInput = {
  environment: string;
  applicationBuildSha: string;
  expectedDatabaseReleaseId?: string;
  observedDatabaseReleaseId?: string;
  schemaCompatible: boolean;
  requiredObjectsPresent: boolean;
  rlsValidationStatus: "passed" | "failed" | "unknown";
  migrationPhase: "ready" | "partial" | "unknown";
  providerHealthObjectsStatus: "healthy" | "degraded" | "unavailable";
  epic26Status: ReleaseHealthStatus;
  epic27Status: ReleaseHealthStatus;
  epic28Status: ReleaseHealthStatus;
  correlationId?: string;
};

export type ReleaseHealthResult = {
  status: ReleaseHealthStatus;
  environment: string;
  applicationBuildSha: string;
  expectedDatabaseReleaseId?: string;
  observedDatabaseReleaseId?: string;
  schemaCompatible: boolean;
  requiredObjectsPresent: boolean;
  rlsValidationStatus: "passed" | "failed" | "unknown";
  migrationPhase: "ready" | "partial" | "unknown";
  providerHealthObjectsStatus: "healthy" | "degraded" | "unavailable";
  epic26Status: ReleaseHealthStatus;
  epic27Status: ReleaseHealthStatus;
  epic28Status: ReleaseHealthStatus;
  timestamp: string;
  correlationId: string;
  codes: ReleaseHealthCode[];
};

export function evaluateReleaseHealth(input: ReleaseHealthInput): ReleaseHealthResult {
  const codes: ReleaseHealthCode[] = [];

  if (!input.expectedDatabaseReleaseId) {
    codes.push("SCHEMA_RELEASE_ID_MISSING");
  } else if (!input.observedDatabaseReleaseId) {
    codes.push("SCHEMA_RELEASE_ID_MISSING");
  } else if (input.observedDatabaseReleaseId !== input.expectedDatabaseReleaseId) {
    codes.push("SCHEMA_RELEASE_BEHIND");
  }

  if (input.migrationPhase === "partial") {
    codes.push("SCHEMA_RELEASE_PARTIAL");
  }

  if (!input.requiredObjectsPresent) {
    codes.push("SCHEMA_OBJECT_MISSING");
  }

  if (input.rlsValidationStatus === "failed") {
    codes.push("RLS_VALIDATION_FAILED");
  }

  if (input.environment !== "staging") {
    codes.push("ENVIRONMENT_REFERENCE_MISMATCH");
  }

  const status: ReleaseHealthStatus = codes.length === 0
    ? "healthy"
    : codes.some((code) => code === "SCHEMA_RELEASE_PARTIAL")
      ? "incomplete"
      : codes.some((code) => code === "SCHEMA_OBJECT_MISSING" || code === "RLS_VALIDATION_FAILED" || code === "ENVIRONMENT_REFERENCE_MISMATCH")
        ? "degraded"
        : "incompatible";

  return {
    status,
    environment: input.environment,
    applicationBuildSha: input.applicationBuildSha,
    expectedDatabaseReleaseId: input.expectedDatabaseReleaseId,
    observedDatabaseReleaseId: input.observedDatabaseReleaseId,
    schemaCompatible: input.schemaCompatible,
    requiredObjectsPresent: input.requiredObjectsPresent,
    rlsValidationStatus: input.rlsValidationStatus,
    migrationPhase: input.migrationPhase,
    providerHealthObjectsStatus: input.providerHealthObjectsStatus,
    epic26Status: input.epic26Status,
    epic27Status: input.epic27Status,
    epic28Status: input.epic28Status,
    timestamp: new Date().toISOString(),
    correlationId: input.correlationId ?? `release-health-${Date.now()}`,
    codes,
  };
}

export function redactReleaseHealthPayload<T extends Record<string, unknown>>(payload: T): T & {
  databaseUrl: string;
  serviceRoleKey: string;
  serviceRolePresence: boolean;
} {
  return {
    ...payload,
    databaseUrl: "[REDACTED]",
    serviceRoleKey: "[REDACTED]",
    serviceRolePresence: false,
  } as T & {
    databaseUrl: string;
    serviceRoleKey: string;
    serviceRolePresence: boolean;
  };
}
