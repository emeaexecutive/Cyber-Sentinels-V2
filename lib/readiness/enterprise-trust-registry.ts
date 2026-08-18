import { trustDomainRegistry } from "../../src/lib/trust-architecture/domain-registry.ts";

export type TrustDomainRegistryRow = {
  domain_key: string | null;
  version: string | null;
  active: boolean | null;
};

type RegistryQueryError = { code?: string | null } | null;

export type EnterpriseTrustRegistryEvaluation = {
  state: "READY" | "NOT_READY" | "BLOCKED";
  reasonCode:
    | "ENTERPRISE_TRUST_ARCHITECTURE_AVAILABLE"
    | "ENTERPRISE_TRUST_DOMAIN_REGISTRY_INCOMPLETE"
    | "ENTERPRISE_TRUST_DOMAIN_REGISTRY_AMBIGUOUS"
    | "EPIC_18_MIGRATION_NOT_DEPLOYED"
    | "AUTHORITATIVE_DATA_PLANE_UNAVAILABLE";
  missingDomains: string[];
  inactiveDomains: string[];
  versionMismatchDomains: string[];
  duplicateDomains: string[];
};

const requiredDomains = trustDomainRegistry.filter((domain) => domain.active);
const missingTableCodes = new Set(["42P01", "PGRST205"]);

function unavailable(reasonCode: EnterpriseTrustRegistryEvaluation["reasonCode"]): EnterpriseTrustRegistryEvaluation {
  return {
    state: reasonCode === "EPIC_18_MIGRATION_NOT_DEPLOYED" ? "NOT_READY" : "BLOCKED",
    reasonCode,
    missingDomains: reasonCode === "EPIC_18_MIGRATION_NOT_DEPLOYED" ? requiredDomains.map((domain) => domain.domainKey) : [],
    inactiveDomains: [],
    versionMismatchDomains: [],
    duplicateDomains: [],
  };
}

export function evaluateEnterpriseTrustRegistry(
  rows: TrustDomainRegistryRow[] | null,
  error: RegistryQueryError,
): EnterpriseTrustRegistryEvaluation {
  if (error) {
    return unavailable(missingTableCodes.has(error.code ?? "") ? "EPIC_18_MIGRATION_NOT_DEPLOYED" : "AUTHORITATIVE_DATA_PLANE_UNAVAILABLE");
  }
  if (!rows) return unavailable("AUTHORITATIVE_DATA_PLANE_UNAVAILABLE");

  const missingDomains: string[] = [];
  const inactiveDomains: string[] = [];
  const versionMismatchDomains: string[] = [];
  const duplicateDomains: string[] = [];

  for (const required of requiredDomains) {
    const domainRows = rows.filter((row) => row.domain_key === required.domainKey);
    const expectedVersionRows = domainRows.filter((row) => row.version === required.version);
    const activeRows = domainRows.filter((row) => row.active === true);

    if (domainRows.length === 0) missingDomains.push(required.domainKey);
    else if (expectedVersionRows.length === 0) versionMismatchDomains.push(required.domainKey);
    else if (!expectedVersionRows.some((row) => row.active === true)) inactiveDomains.push(required.domainKey);

    if (expectedVersionRows.length > 1 || activeRows.length > 1) duplicateDomains.push(required.domainKey);
  }

  if (duplicateDomains.length > 0) {
    return { state: "NOT_READY", reasonCode: "ENTERPRISE_TRUST_DOMAIN_REGISTRY_AMBIGUOUS", missingDomains, inactiveDomains, versionMismatchDomains, duplicateDomains };
  }
  if (missingDomains.length > 0 || inactiveDomains.length > 0 || versionMismatchDomains.length > 0) {
    return { state: "NOT_READY", reasonCode: "ENTERPRISE_TRUST_DOMAIN_REGISTRY_INCOMPLETE", missingDomains, inactiveDomains, versionMismatchDomains, duplicateDomains };
  }
  return {
    state: "READY",
    reasonCode: "ENTERPRISE_TRUST_ARCHITECTURE_AVAILABLE",
    missingDomains,
    inactiveDomains,
    versionMismatchDomains,
    duplicateDomains,
  };
}

export function buildEnterpriseTrustReadinessResponse(
  registry: EnterpriseTrustRegistryEvaluation,
  runtimeCommit: string | null,
  generatedAt: string,
) {
  return {
    statusCode: registry.state === "READY" ? 200 : 503,
    body: {
      schemaVersion: "readiness-v2",
      status: registry.state,
      reasonCode: registry.reasonCode,
      checks: {
        environment: "READY",
        enterpriseTrustArchitecture: registry.state,
        repositoryRuntime: runtimeCommit ? "VERIFIED_FROM_RUNTIME" : "NOT_CONFIGURED",
        externalControls: "BLOCKED",
      },
      enterpriseTrustRegistry: {
        missingDomains: registry.missingDomains,
        inactiveDomains: registry.inactiveDomains,
        versionMismatchDomains: registry.versionMismatchDomains,
        duplicateDomains: registry.duplicateDomains,
      },
      runtime: { commitSha: runtimeCommit },
      externalControls: {
        state: "BLOCKED",
        reasonCode: "AUTHORITATIVE_CONTROL_PLANE_EVIDENCE_REQUIRED",
      },
      generatedAt,
    },
  };
}
