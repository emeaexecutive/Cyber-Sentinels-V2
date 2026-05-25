export const trustSealTypes = [
  "verified_human_seal",
  "verified_agent_seal",
  "reality_passport_seal",
  "hpi_checked_seal",
  "origin_trace_checked_seal",
  "evidence_chain_verified_seal",
  "candidate_trust_seal",
  "marketplace_trust_seal",
  "team_trust_seal",
  "company_trust_seal",
] as const;

export const trustSealStatuses = [
  "active",
  "pending",
  "under_review",
  "expired",
  "revoked",
  "suspended",
] as const;

export const trustSealSignals = [
  "trust_seal_issued",
  "trust_seal_verified",
  "trust_seal_expired",
  "trust_seal_revoked",
  "trust_seal_viewed",
] as const;

export const trustSealAuditEvents = [
  "trust_seal_issued",
  "trust_seal_revoked",
  "trust_seal_verified",
] as const;

export type TrustSealType = (typeof trustSealTypes)[number];
export type TrustSealStatus = (typeof trustSealStatuses)[number];

export type PublicTrustSeal = {
  seal_id: string;
  subject_name: string;
  subject_type: "human" | "agent" | "company" | "candidate" | "team" | "marketplace" | "media";
  seal_type: TrustSealType;
  status: TrustSealStatus;
  trust_band: "verified" | "strong" | "watch" | "limited" | "revoked";
  issued_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  issuer: "Cyber Sentinels";
  verification_url: string;
  public_summary: string;
};

export const publicSafeSealFields = [
  "seal_id",
  "subject_name",
  "subject_type",
  "seal_type",
  "status",
  "trust_band",
  "issued_at",
  "expires_at",
  "revoked_at",
  "issuer",
  "verification_url",
  "public_summary",
] as const;

export const privateSealFieldsNeverExposed = [
  "private evidence",
  "raw audit logs",
  "admin notes",
  "internal risk scores",
  "full PII",
  "API keys",
] as const;

export const demoTrustSeals: PublicTrustSeal[] = [
  {
    seal_id: "seal-verified-human-demo",
    subject_name: "Avery Stone",
    subject_type: "human",
    seal_type: "verified_human_seal",
    status: "active",
    trust_band: "verified",
    issued_at: "2026-05-01",
    expires_at: "2027-05-01",
    revoked_at: null,
    issuer: "Cyber Sentinels",
    verification_url: "/seal/seal-verified-human-demo",
    public_summary: "Verified human trust seal with active public verification.",
  },
  {
    seal_id: "seal-agent-demo",
    subject_name: "Orion Research Agent",
    subject_type: "agent",
    seal_type: "verified_agent_seal",
    status: "active",
    trust_band: "strong",
    issued_at: "2026-05-03",
    expires_at: "2026-11-03",
    revoked_at: null,
    issuer: "Cyber Sentinels",
    verification_url: "/seal/seal-agent-demo",
    public_summary: "Verified AI agent seal connected to registry and permissions status.",
  },
  {
    seal_id: "seal-reality-passport-demo",
    subject_name: "Founder Reality Passport",
    subject_type: "human",
    seal_type: "reality_passport_seal",
    status: "active",
    trust_band: "strong",
    issued_at: "2026-05-05",
    expires_at: "2027-05-05",
    revoked_at: null,
    issuer: "Cyber Sentinels",
    verification_url: "/seal/seal-reality-passport-demo",
    public_summary: "Reality Passport seal for public-safe provenance and reality status.",
  },
  {
    seal_id: "seal-marketplace-demo",
    subject_name: "Marketplace Seller",
    subject_type: "marketplace",
    seal_type: "marketplace_trust_seal",
    status: "active",
    trust_band: "verified",
    issued_at: "2026-05-12",
    expires_at: "2027-05-12",
    revoked_at: null,
    issuer: "Cyber Sentinels",
    verification_url: "/seal/seal-marketplace-demo",
    public_summary: "Marketplace trust seal for public-safe seller verification.",
  },
  {
    seal_id: "seal-revoked-demo",
    subject_name: "Revoked Media Seal",
    subject_type: "media",
    seal_type: "origin_trace_checked_seal",
    status: "revoked",
    trust_band: "revoked",
    issued_at: "2026-04-01",
    expires_at: "2026-10-01",
    revoked_at: "2026-05-20",
    issuer: "Cyber Sentinels",
    verification_url: "/seal/seal-revoked-demo",
    public_summary: "This seal has been revoked and should not be treated as active.",
  },
];

export function getPublicTrustSeal(id: string): PublicTrustSeal {
  return (
    demoTrustSeals.find((seal) => seal.seal_id === id) ?? {
      seal_id: id,
      subject_name: "Unknown Trust Seal",
      subject_type: "media",
      seal_type: "origin_trace_checked_seal",
      status: "pending",
      trust_band: "limited",
      issued_at: "2026-05-01",
      expires_at: null,
      revoked_at: null,
      issuer: "Cyber Sentinels",
      verification_url: `/seal/${encodeURIComponent(id)}`,
      public_summary: "Public-safe trust seal placeholder.",
    }
  );
}

export function toPublicTrustSealJson(seal: PublicTrustSeal) {
  return {
    seal_id: seal.seal_id,
    subject_name: seal.subject_name,
    subject_type: seal.subject_type,
    seal_type: seal.seal_type,
    status: seal.status,
    trust_band: seal.trust_band,
    issued_at: seal.issued_at,
    expires_at: seal.expires_at,
    revoked_at: seal.revoked_at,
    issuer: seal.issuer,
    verification_url: seal.verification_url,
    public_summary: seal.public_summary,
  };
}
