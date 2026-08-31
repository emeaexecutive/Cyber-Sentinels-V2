export const SYNTHETIC_STAGING_PROVIDER_KEY = "cyber_sentinels_synthetic_staging";
export const SYNTHETIC_STAGING_CLASSIFICATION = "SYNTHETIC_STAGING_VERIFICATION";
export const SERVER_VERIFIED_AGENT_CONFIGURATION = "SERVER_VERIFIED_AGENT_CONFIGURATION";
export const SERVER_VERIFIED_MONITORING = "SERVER_VERIFIED_MONITORING_HEARTBEAT";

const knownProductionProjectRefs = new Set(["kecgtsfibkypjuaxqbjx"]);
const knownProductionHosts = new Set(["cybersentinels.com", "www.cybersentinels.com"]);

export class SyntheticStagingBoundaryError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "SyntheticStagingBoundaryError";
  }
}

function projectRef(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).hostname.split(".")[0]?.toLowerCase() || null;
  } catch {
    return null;
  }
}

export function resolveSyntheticStagingBoundary(environment: Record<string, string | undefined>) {
  if (environment.SYNTHETIC_FIXTURES?.trim().toLowerCase() !== "true") return null;
  const name = environment.CYBER_SENTINELS_ENVIRONMENT?.trim().toLowerCase();
  if (!name || !["staging", "test"].includes(name)) {
    throw new SyntheticStagingBoundaryError("SYNTHETIC_STAGING_ENVIRONMENT_REQUIRED");
  }
  if (environment.VERCEL_ENV?.trim().toLowerCase() === "production") {
    throw new SyntheticStagingBoundaryError("SYNTHETIC_STAGING_FORBIDDEN_IN_PRODUCTION");
  }
  let origin: URL;
  try {
    origin = new URL(environment.CYBER_SENTINELS_PUBLIC_ORIGIN ?? "");
  } catch {
    throw new SyntheticStagingBoundaryError("SYNTHETIC_STAGING_ORIGIN_INVALID");
  }
  if (origin.protocol !== "https:" || knownProductionHosts.has(origin.hostname.toLowerCase())) {
    throw new SyntheticStagingBoundaryError("SYNTHETIC_STAGING_PRODUCTION_ORIGIN_REJECTED");
  }
  const actualProjectRef = projectRef(environment.SUPABASE_URL ?? environment.NEXT_PUBLIC_SUPABASE_URL);
  const expectedProjectRef = environment.SYNTHETIC_STAGING_PROJECT_REF?.trim().toLowerCase() || null;
  const configuredProductionRef = environment.CYBER_SENTINELS_PRODUCTION_SUPABASE_PROJECT_REF?.trim().toLowerCase() || null;
  if (!actualProjectRef || !expectedProjectRef || actualProjectRef !== expectedProjectRef) {
    throw new SyntheticStagingBoundaryError("SYNTHETIC_STAGING_PROJECT_REF_MISMATCH");
  }
  if (knownProductionProjectRefs.has(actualProjectRef) || actualProjectRef === configuredProductionRef) {
    throw new SyntheticStagingBoundaryError("SYNTHETIC_STAGING_PRODUCTION_PROJECT_REJECTED");
  }
  return {
    environment: name as "staging" | "test",
    origin: origin.origin,
    projectRef: actualProjectRef,
    providerKey: SYNTHETIC_STAGING_PROVIDER_KEY,
    classification: SYNTHETIC_STAGING_CLASSIFICATION,
  };
}
