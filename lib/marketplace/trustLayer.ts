export const marketplaceTypes = [
  "talent_marketplace",
  "freelance_marketplace",
  "creator_platform",
  "ai_agent_platform",
  "fintech_marketplace",
  "dating_platform",
  "community_platform",
  "investor_network",
  "recruitment_platform",
] as const;

export const marketplaceTrustObjects = [
  "verified_human",
  "verified_candidate",
  "verified_seller",
  "verified_creator",
  "verified_agent",
  "verified_media",
  "verified_company",
  "verified_transaction_context",
] as const;

export const trustBadgeConcepts = [
  "Verified Human",
  "Verified Agent",
  "HPI™ Checked",
  "Origin Trace Checked",
  "Reality Passport Active",
  "Manual Review Completed",
  "Evidence Chain Verified",
] as const;

export const trustBadgeStates = [
  "active",
  "pending",
  "expired",
  "revoked",
  "under_review",
] as const;

export const marketplaceSignals = [
  "trust_badge_issued",
  "trust_badge_verified",
  "trust_badge_expired",
  "trust_badge_revoked",
  "marketplace_check_requested",
] as const;

export const marketplaceAuditEvents = [
  "trust_badge_issued",
  "trust_badge_verified",
  "marketplace_check_requested",
] as const;

export type MarketplaceType = (typeof marketplaceTypes)[number];
export type MarketplaceTrustObject = (typeof marketplaceTrustObjects)[number];
export type TrustBadgeState = (typeof trustBadgeStates)[number];

export type MarketplaceUseCase = {
  title: string;
  marketplace_type: MarketplaceType;
  trust_object: MarketplaceTrustObject;
  summary: string;
  recommended_flow: string;
};

export type TrustBadge = {
  badge_id: string;
  label: (typeof trustBadgeConcepts)[number];
  subject_type: string;
  badge_status: TrustBadgeState;
  trust_score: number;
  verification_summary: string;
  expires_at: string;
};

const nextYear = new Date();
nextYear.setFullYear(nextYear.getFullYear() + 1);

export const demoMarketplaceUseCases: MarketplaceUseCase[] = [
  {
    title: "Recruiter verifies candidate before interview",
    marketplace_type: "recruitment_platform",
    trust_object: "verified_candidate",
    summary: "Candidate trust report, LinkedIn signal and human presence review.",
    recommended_flow: "candidate_report + hpi + manual_review",
  },
  {
    title: "Marketplace verifies seller identity",
    marketplace_type: "freelance_marketplace",
    trust_object: "verified_seller",
    summary: "Seller passport, origin trace and evidence chain before listing.",
    recommended_flow: "trust_passport + evidence_vault",
  },
  {
    title: "Creator platform checks synthetic media",
    marketplace_type: "creator_platform",
    trust_object: "verified_media",
    summary: "Reality Passport and synthetic-media risk review for uploads.",
    recommended_flow: "reality_passport + origin_trace",
  },
  {
    title: "AI platform validates autonomous agent",
    marketplace_type: "ai_agent_platform",
    trust_object: "verified_agent",
    summary: "Agent registry, permission scopes and policy review before autonomy.",
    recommended_flow: "agent_registry + permissions_firewall",
  },
  {
    title: "Fintech marketplace requests step-up verification",
    marketplace_type: "fintech_marketplace",
    trust_object: "verified_transaction_context",
    summary: "High-risk transaction context requires stronger evidence and governance review before permission.",
    recommended_flow: "permissions_firewall + step_up",
  },
  {
    title: "Investor network verifies founder profile",
    marketplace_type: "investor_network",
    trust_object: "verified_company",
    summary: "Founder/company profile checks with audit-ready report exports.",
    recommended_flow: "trust_report + compliance_export",
  },
];

export const demoTrustBadges: TrustBadge[] = [
  {
    badge_id: "badge-verified-human",
    label: "Verified Human",
    subject_type: "human",
    badge_status: "active",
    trust_score: 92,
    verification_summary: "Human presence and liveness checks are current.",
    expires_at: nextYear.toISOString(),
  },
  {
    badge_id: "badge-verified-agent",
    label: "Verified Agent",
    subject_type: "agent",
    badge_status: "under_review",
    trust_score: 84,
    verification_summary: "Agent passport exists with pending policy review.",
    expires_at: nextYear.toISOString(),
  },
  {
    badge_id: "badge-hpi-checked",
    label: "HPI™ Checked",
    subject_type: "candidate",
    badge_status: "active",
    trust_score: 89,
    verification_summary: "Human Presence Index is above marketplace threshold.",
    expires_at: nextYear.toISOString(),
  },
  {
    badge_id: "badge-origin-trace",
    label: "Origin Trace Checked",
    subject_type: "media",
    badge_status: "pending",
    trust_score: 76,
    verification_summary: "Origin trace review is pending final evidence.",
    expires_at: nextYear.toISOString(),
  },
  {
    badge_id: "badge-reality-passport",
    label: "Reality Passport Active",
    subject_type: "media",
    badge_status: "active",
    trust_score: 87,
    verification_summary: "Reality Passport is active with provenance notes.",
    expires_at: nextYear.toISOString(),
  },
  {
    badge_id: "badge-manual-review",
    label: "Manual Review Completed",
    subject_type: "candidate",
    badge_status: "expired",
    trust_score: 81,
    verification_summary: "Manual review completed but badge requires renewal.",
    expires_at: new Date().toISOString(),
  },
  {
    badge_id: "badge-evidence-chain",
    label: "Evidence Chain Verified",
    subject_type: "evidence",
    badge_status: "revoked",
    trust_score: 42,
    verification_summary: "Evidence chain badge revoked after custody issue.",
    expires_at: new Date().toISOString(),
  },
];

export function verifyTrustBadge(badgeId: string, subjectId: string) {
  const badge =
    demoTrustBadges.find((item) => item.badge_id === badgeId) ??
    demoTrustBadges[0];

  return {
    badge_status: badge.badge_status,
    trust_score: badge.trust_score,
    verification_summary: `${badge.verification_summary} Subject ${subjectId.slice(
      0,
      12
    )} is represented with public-safe badge data only.`,
    expires_at: badge.expires_at,
  };
}
