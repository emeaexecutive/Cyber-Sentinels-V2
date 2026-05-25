export const trustRegistryObjectTypes = [
  "verified_human",
  "verified_agent",
  "company",
  "candidate",
  "creator",
  "marketplace",
  "trust_seal",
  "trust_badge",
  "reality_passport",
  "agent_passport",
] as const;

export const trustRegistryStatuses = [
  "active",
  "pending",
  "under_review",
  "expired",
  "revoked",
  "suspended",
] as const;

export const trustRegistrySignals = [
  "trust_registry_searched",
  "registry_profile_viewed",
  "registry_entry_verified",
] as const;

export const trustRegistryAuditEvents = [
  "trust_registry_searched",
  "registry_entry_viewed",
] as const;

export type TrustRegistryObjectType = (typeof trustRegistryObjectTypes)[number];
export type TrustRegistryStatus = (typeof trustRegistryStatuses)[number];

export type PublicTrustRegistryEntry = {
  id: string;
  display_name: string;
  object_type: TrustRegistryObjectType;
  status: TrustRegistryStatus;
  trust_band: "verified" | "strong" | "watch" | "limited" | "revoked";
  seal_status: TrustRegistryStatus | null;
  badge_status: TrustRegistryStatus | null;
  last_verified_at: string | null;
  public_verify_url: string;
  public_profile_url: string | null;
  summary: string;
};

export const publicSafeRegistryFields = [
  "id",
  "display_name",
  "object_type",
  "status",
  "trust_band",
  "seal_status",
  "badge_status",
  "last_verified_at",
  "public_verify_url",
  "public_profile_url",
  "summary",
] as const;

export const privateRegistryFieldsNeverExposed = [
  "private evidence",
  "admin notes",
  "raw logs",
  "internal risk scores",
  "private PII",
  "API keys",
] as const;

export const demoTrustRegistryEntries: PublicTrustRegistryEntry[] = [
  {
    id: "registry-verified-human",
    display_name: "Avery Stone",
    object_type: "verified_human",
    status: "active",
    trust_band: "verified",
    seal_status: "active",
    badge_status: "active",
    last_verified_at: "2026-05-21",
    public_verify_url: "/verify/demo-verified-human",
    public_profile_url: "/profile/badge-verified-human",
    summary: "Verified human with active public trust badge and seal.",
  },
  {
    id: "registry-ai-agent",
    display_name: "Orion Research Agent",
    object_type: "verified_agent",
    status: "active",
    trust_band: "strong",
    seal_status: "active",
    badge_status: "active",
    last_verified_at: "2026-05-20",
    public_verify_url: "/verify/demo-verified-agent",
    public_profile_url: "/agent-registry/demo-orion-research-agent",
    summary: "Verified AI agent connected to registry and permission status.",
  },
  {
    id: "registry-reality-passport",
    display_name: "Founder Reality Passport",
    object_type: "reality_passport",
    status: "active",
    trust_band: "strong",
    seal_status: "active",
    badge_status: null,
    last_verified_at: "2026-05-18",
    public_verify_url: "/verify/demo-reality-passport",
    public_profile_url: "/reality-passport",
    summary: "Reality Passport record with public-safe provenance status.",
  },
  {
    id: "registry-company-seal",
    display_name: "Cyber Sentinels Company Trust Seal",
    object_type: "trust_seal",
    status: "active",
    trust_band: "verified",
    seal_status: "active",
    badge_status: null,
    last_verified_at: "2026-05-17",
    public_verify_url: "/seal/seal-marketplace-demo",
    public_profile_url: "/trust-seal-authority",
    summary: "Company trust seal listed for public verification.",
  },
  {
    id: "registry-candidate-report",
    display_name: "Candidate Trust Report",
    object_type: "candidate",
    status: "under_review",
    trust_band: "watch",
    seal_status: "under_review",
    badge_status: "pending",
    last_verified_at: "2026-05-14",
    public_verify_url: "/verify/demo-candidate-report",
    public_profile_url: "/profile",
    summary: "Candidate trust report with public-safe review state.",
  },
  {
    id: "registry-marketplace-badge",
    display_name: "Marketplace Badge",
    object_type: "marketplace",
    status: "active",
    trust_band: "verified",
    seal_status: "active",
    badge_status: "active",
    last_verified_at: "2026-05-12",
    public_verify_url: "/verify/demo-marketplace-trust",
    public_profile_url: "/marketplace-trust",
    summary: "Marketplace trust badge available for public verification.",
  },
  {
    id: "registry-revoked-seal",
    display_name: "Revoked Media Seal",
    object_type: "trust_seal",
    status: "revoked",
    trust_band: "revoked",
    seal_status: "revoked",
    badge_status: null,
    last_verified_at: "2026-05-20",
    public_verify_url: "/seal/seal-revoked-demo",
    public_profile_url: null,
    summary: "Revoked seal retained for public warning and verification.",
  },
];

export function searchTrustRegistry(query?: string | null, type?: string | null) {
  const normalizedQuery = query?.trim().toLowerCase();
  const normalizedType = type?.trim();

  return demoTrustRegistryEntries.filter((entry) => {
    const typeMatches =
      !normalizedType ||
      normalizedType === "all" ||
      entry.object_type === normalizedType;
    const queryMatches =
      !normalizedQuery ||
      [
        entry.id,
        entry.display_name,
        entry.object_type,
        entry.status,
        entry.trust_band,
        entry.summary,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);

    return typeMatches && queryMatches;
  });
}

export function toPublicTrustRegistryJson(entry: PublicTrustRegistryEntry) {
  return {
    id: entry.id,
    display_name: entry.display_name,
    object_type: entry.object_type,
    status: entry.status,
    trust_band: entry.trust_band,
    seal_status: entry.seal_status,
    badge_status: entry.badge_status,
    last_verified_at: entry.last_verified_at,
    public_verify_url: entry.public_verify_url,
    public_profile_url: entry.public_profile_url,
    summary: entry.summary,
  };
}
