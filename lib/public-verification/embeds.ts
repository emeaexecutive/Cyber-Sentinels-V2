export const trustEmbedTypes = [
  "verified_human",
  "verified_agent",
  "reality_passport",
  "human_presence_index",
  "origin_trace",
  "trust_badge",
  "candidate_report",
  "company_trust",
  "marketplace_trust",
] as const;

export const trustEmbedStatuses = [
  "active",
  "pending",
  "under_review",
  "expired",
  "revoked",
] as const;

export const trustEmbedSignals = [
  "trust_embed_viewed",
  "trust_embed_created",
  "trust_embed_verified",
] as const;

export const trustEmbedAuditEvents = [
  "trust_embed_created",
  "trust_embed_viewed",
] as const;

export type TrustEmbedType = (typeof trustEmbedTypes)[number];
export type TrustEmbedStatus = (typeof trustEmbedStatuses)[number];

export type PublicTrustEmbed = {
  subject_name: string;
  subject_type: "human" | "agent" | "company" | "candidate" | "media";
  badge_type: TrustEmbedType;
  status: TrustEmbedStatus;
  trust_band: "verified" | "strong" | "watch" | "limited" | "revoked";
  issued_at: string;
  expires_at: string | null;
  verification_id: string;
  public_verify_url: string;
};

export const publicSafeEmbedFields = [
  "subject_name",
  "subject_type",
  "badge_type",
  "status",
  "trust_band",
  "issued_at",
  "expires_at",
  "verification_id",
  "public_verify_url",
] as const;

export const privateEmbedFieldsNeverExposed = [
  "private evidence",
  "admin notes",
  "raw audit logs",
  "internal risk scores",
  "full PII",
  "API keys",
] as const;

export const demoTrustEmbeds: PublicTrustEmbed[] = [
  {
    subject_name: "Avery Stone",
    subject_type: "human",
    badge_type: "verified_human",
    status: "active",
    trust_band: "verified",
    issued_at: "2026-05-01",
    expires_at: "2027-05-01",
    verification_id: "demo-verified-human",
    public_verify_url: "/verify/demo-verified-human",
  },
  {
    subject_name: "Orion Research Agent",
    subject_type: "agent",
    badge_type: "verified_agent",
    status: "active",
    trust_band: "strong",
    issued_at: "2026-05-03",
    expires_at: "2026-11-03",
    verification_id: "demo-verified-agent",
    public_verify_url: "/verify/demo-verified-agent",
  },
  {
    subject_name: "Founder Reality Passport",
    subject_type: "human",
    badge_type: "reality_passport",
    status: "active",
    trust_band: "strong",
    issued_at: "2026-05-05",
    expires_at: "2027-05-05",
    verification_id: "demo-reality-passport",
    public_verify_url: "/verify/demo-reality-passport",
  },
  {
    subject_name: "Candidate Trust Report",
    subject_type: "candidate",
    badge_type: "candidate_report",
    status: "under_review",
    trust_band: "watch",
    issued_at: "2026-05-10",
    expires_at: "2026-08-10",
    verification_id: "demo-candidate-report",
    public_verify_url: "/verify/demo-candidate-report",
  },
  {
    subject_name: "Marketplace Seller",
    subject_type: "company",
    badge_type: "marketplace_trust",
    status: "active",
    trust_band: "verified",
    issued_at: "2026-05-12",
    expires_at: "2027-05-12",
    verification_id: "demo-marketplace-trust",
    public_verify_url: "/verify/demo-marketplace-trust",
  },
];

export function getPublicTrustEmbed(id: string): PublicTrustEmbed {
  return (
    demoTrustEmbeds.find((embed) => embed.verification_id === id) ?? {
      subject_name: "Unknown trust badge",
      subject_type: "media",
      badge_type: "trust_badge",
      status: "pending",
      trust_band: "limited",
      issued_at: "2026-05-01",
      expires_at: null,
      verification_id: id,
      public_verify_url: `/verify/${encodeURIComponent(id)}`,
    }
  );
}

export function toPublicTrustEmbedJson(embed: PublicTrustEmbed) {
  return {
    subject_name: embed.subject_name,
    subject_type: embed.subject_type,
    badge_type: embed.badge_type,
    status: embed.status,
    trust_band: embed.trust_band,
    issued_at: embed.issued_at,
    expires_at: embed.expires_at,
    verification_id: embed.verification_id,
    public_verify_url: embed.public_verify_url,
  };
}
