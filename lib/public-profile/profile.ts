export const publicProfileTypes = [
  "verified_human",
  "candidate",
  "ai_agent",
  "company",
  "creator",
  "recruiter",
  "verifier",
] as const;

export const publicProfileStatuses = [
  "active",
  "pending",
  "under_review",
  "expired",
  "revoked",
] as const;

export const publicProfileSignals = [
  "public_profile_viewed",
  "public_profile_verified",
  "public_profile_requested_update",
] as const;

export const publicProfileAuditEvents = [
  "public_profile_viewed",
  "public_profile_updated",
] as const;

export type PublicProfileType = (typeof publicProfileTypes)[number];
export type PublicProfileStatus = (typeof publicProfileStatuses)[number];

export type PublicTrustProfile = {
  display_name: string;
  profile_type: PublicProfileType;
  trust_status: PublicProfileStatus | "not_found";
  trust_score_band: string;
  human_presence_band: string;
  origin_trace_band: string;
  verified_badges: string[];
  public_summary: string;
  issued_at: string | null;
  last_verified_at: string | null;
  expires_at: string | null;
  verification_id: string;
  public_linkedin_url: string | null;
  verification_sources_summary: string;
  trust_passport_status: string;
  reality_passport_status: string;
  safe_evidence_summary: string;
};

const issuedAt = new Date();
issuedAt.setMonth(issuedAt.getMonth() - 3);
const lastVerifiedAt = new Date();
lastVerifiedAt.setDate(lastVerifiedAt.getDate() - 12);
const expiresAt = new Date();
expiresAt.setFullYear(expiresAt.getFullYear() + 1);

export const demoPublicProfiles: PublicTrustProfile[] = [
  {
    display_name: "Verified Human Profile",
    profile_type: "verified_human",
    trust_status: "active",
    trust_score_band: "high",
    human_presence_band: "high",
    origin_trace_band: "medium",
    verified_badges: ["Verified Human", "HPI™ Checked"],
    public_summary: "Human presence and liveness checks are current.",
    issued_at: issuedAt.toISOString(),
    last_verified_at: lastVerifiedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    verification_id: "profile-verified-human",
    public_linkedin_url: "https://www.linkedin.com/in/public-profile-demo",
    verification_sources_summary: "Trust Passport, HPI and public badge checks.",
    trust_passport_status: "active",
    reality_passport_status: "not_applicable",
    safe_evidence_summary: "Evidence was reviewed privately by Cyber Sentinels.",
  },
  {
    display_name: "Candidate Trust Profile",
    profile_type: "candidate",
    trust_status: "under_review",
    trust_score_band: "medium",
    human_presence_band: "medium",
    origin_trace_band: "medium",
    verified_badges: ["Manual Review Completed", "Origin Trace Checked"],
    public_summary: "Candidate profile is under review with public-safe status available.",
    issued_at: issuedAt.toISOString(),
    last_verified_at: lastVerifiedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    verification_id: "profile-candidate",
    public_linkedin_url: "https://www.linkedin.com/in/candidate-demo",
    verification_sources_summary: "Candidate report, LinkedIn signal and manual review.",
    trust_passport_status: "under_review",
    reality_passport_status: "not_applicable",
    safe_evidence_summary: "Private candidate evidence is not exposed publicly.",
  },
  {
    display_name: "AI Agent Directory Profile",
    profile_type: "ai_agent",
    trust_status: "active",
    trust_score_band: "high",
    human_presence_band: "not_applicable",
    origin_trace_band: "high",
    verified_badges: ["Verified Agent", "Origin Trace Checked"],
    public_summary: "AI agent identity and declared permissions are publicly verifiable.",
    issued_at: issuedAt.toISOString(),
    last_verified_at: lastVerifiedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    verification_id: "profile-ai-agent",
    public_linkedin_url: null,
    verification_sources_summary: "Agent Passport, policy status and origin trace.",
    trust_passport_status: "active",
    reality_passport_status: "not_applicable",
    safe_evidence_summary: "Agent registry evidence is summarized without private logs.",
  },
  {
    display_name: "Creator Media Profile",
    profile_type: "creator",
    trust_status: "revoked",
    trust_score_band: "low",
    human_presence_band: "medium",
    origin_trace_band: "low",
    verified_badges: ["Reality Passport Active"],
    public_summary: "This creator profile has a revoked trust status.",
    issued_at: issuedAt.toISOString(),
    last_verified_at: lastVerifiedAt.toISOString(),
    expires_at: new Date().toISOString(),
    verification_id: "profile-creator-revoked",
    public_linkedin_url: null,
    verification_sources_summary: "Reality Passport and media risk checks.",
    trust_passport_status: "revoked",
    reality_passport_status: "revoked",
    safe_evidence_summary: "Revoked due to private review outcome; evidence remains private.",
  },
];

export const notFoundPublicProfile: PublicTrustProfile = {
  display_name: "Profile not found",
  profile_type: "verified_human",
  trust_status: "not_found",
  trust_score_band: "unknown",
  human_presence_band: "unknown",
  origin_trace_band: "unknown",
  verified_badges: [],
  public_summary: "No public Cyber Sentinels trust profile was found for this ID.",
  issued_at: null,
  last_verified_at: null,
  expires_at: null,
  verification_id: "not_found",
  public_linkedin_url: null,
  verification_sources_summary: "No public verification sources are available.",
  trust_passport_status: "not_found",
  reality_passport_status: "not_found",
  safe_evidence_summary: "No public evidence summary is available.",
};

export function getPublicTrustProfile(id: string): PublicTrustProfile {
  const safeId = id.trim();

  if (!safeId) return notFoundPublicProfile;

  const found = demoPublicProfiles.find(
    (profile) => profile.verification_id.toLowerCase() === safeId.toLowerCase()
  );

  if (!found) {
    return {
      ...notFoundPublicProfile,
      verification_id: safeId,
    };
  }

  return found;
}
