import type { IdentityEnterpriseRole } from "@/lib/identity-signals/enterprise-context";
import type {
  EnterpriseTrustCentreRole,
  TrustCentreCapability,
} from "./types";

const rank: Record<EnterpriseTrustCentreRole, number> = {
  VIEWER: 0,
  ANALYST: 1,
  INVESTIGATOR: 2,
  ADMINISTRATOR: 3,
  SUPER_ADMINISTRATOR: 4,
};

export function enterpriseTrustCentreRole(
  role: IdentityEnterpriseRole,
  profile?: unknown
): EnterpriseTrustCentreRole {
  if (role === "owner") return "SUPER_ADMINISTRATOR";
  if (role === "admin") return "ADMINISTRATOR";
  if (role === "reviewer") {
    return String(profile).toUpperCase() === "ANALYST" ? "ANALYST" : "INVESTIGATOR";
  }
  return "VIEWER";
}

export function trustCentreCapabilities(
  role: EnterpriseTrustCentreRole
): TrustCentreCapability[] {
  const capabilities: TrustCentreCapability[] = ["read", "export"];
  if (rank[role] >= rank.ANALYST) capabilities.push("comment");
  if (rank[role] >= rank.INVESTIGATOR) capabilities.push("triage");
  if (rank[role] >= rank.ADMINISTRATOR) capabilities.push("assign", "simulate");
  return capabilities;
}

export function hasTrustCentreCapability(
  role: EnterpriseTrustCentreRole,
  capability: TrustCentreCapability
) {
  return trustCentreCapabilities(role).includes(capability);
}
