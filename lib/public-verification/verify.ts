import { demoTrustBadges } from "@/lib/marketplace/trustLayer";

export const publicVerificationObjects = [
  "trust_passport",
  "reality_passport",
  "human_presence_index",
  "origin_trace",
  "trust_badge",
  "candidate_report",
  "agent_passport",
  "marketplace_badge",
] as const;

export const publicVerificationStatuses = [
  "active",
  "pending",
  "expired",
  "revoked",
  "under_review",
  "not_found",
] as const;

export const publicVerificationSignals = [
  "public_verification_checked",
  "public_badge_viewed",
  "revoked_badge_checked",
] as const;

export const publicVerificationAuditEvents = [
  "public_verification_checked",
] as const;

export type PublicVerificationObject = (typeof publicVerificationObjects)[number];
export type PublicVerificationStatus =
  (typeof publicVerificationStatuses)[number];

export type PublicVerificationSummary = {
  subject_name: string;
  subject_type: string;
  badge_status: PublicVerificationStatus;
  trust_score_band: string;
  verification_status: PublicVerificationStatus;
  issued_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  public_summary: string;
  evidence_summary_safe: string;
  issuer: string;
  verification_id: string;
  verification_object: PublicVerificationObject;
};

const issuedAt = new Date();
issuedAt.setMonth(issuedAt.getMonth() - 2);

export const demoPublicVerifications: PublicVerificationSummary[] =
  demoTrustBadges.map((badge) => ({
    subject_name: badge.label,
    subject_type: badge.subject_type,
    badge_status: badge.badge_status,
    trust_score_band:
      badge.trust_score >= 85
        ? "high"
        : badge.trust_score >= 65
          ? "medium"
          : "low",
    verification_status: badge.badge_status,
    issued_at: issuedAt.toISOString(),
    expires_at: badge.expires_at,
    revoked_at: badge.badge_status === "revoked" ? new Date().toISOString() : null,
    public_summary: badge.verification_summary,
    evidence_summary_safe: "Evidence was reviewed by Cyber Sentinels. Private evidence is not public.",
    issuer: "Cyber Sentinels",
    verification_id: badge.badge_id,
    verification_object:
      badge.subject_type === "agent"
        ? "agent_passport"
        : badge.subject_type === "media"
          ? "reality_passport"
          : "trust_badge",
  }));

export const notFoundVerification: PublicVerificationSummary = {
  subject_name: "Verification not found",
  subject_type: "unknown",
  badge_status: "not_found",
  trust_score_band: "unknown",
  verification_status: "not_found",
  issued_at: null,
  expires_at: null,
  revoked_at: null,
  public_summary: "No active public Cyber Sentinels verification was found for this ID.",
  evidence_summary_safe: "No public evidence summary is available.",
  issuer: "Cyber Sentinels",
  verification_id: "not_found",
  verification_object: "trust_badge",
};

export function getPublicVerification(id: string): PublicVerificationSummary {
  const safeId = id.trim();

  if (!safeId) return notFoundVerification;

  const found = demoPublicVerifications.find(
    (item) => item.verification_id.toLowerCase() === safeId.toLowerCase()
  );

  if (!found) {
    return {
      ...notFoundVerification,
      verification_id: safeId,
    };
  }

  return found;
}
