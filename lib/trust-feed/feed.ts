export const feedObjectTypes = [
  "public_profile",
  "trust_badge",
  "passport",
  "verification",
  "ai_agent",
  "marketplace_event",
  "reality_passport",
  "human_presence",
  "origin_trace",
  "verifier_activity",
] as const;

export const feedStatuses = [
  "active",
  "pending",
  "verified",
  "under_review",
  "renewed",
  "expired",
] as const;

export const trustFeedSignals = [
  "trust_feed_viewed",
  "public_activity_generated",
  "badge_activity_created",
] as const;

export const trustFeedAuditEvents = ["trust_feed_accessed"] as const;

export type FeedObjectType = (typeof feedObjectTypes)[number];
export type FeedStatus = (typeof feedStatuses)[number];

export type TrustFeedItem = {
  id: string;
  event: string;
  subject_name: string;
  subject_type: FeedObjectType;
  status: FeedStatus;
  trust_band: string;
  created_at: string;
  public_link: string;
};

const now = Date.now();

function minutesAgo(minutes: number) {
  return new Date(now - minutes * 60 * 1000).toISOString();
}

export const demoTrustFeed: TrustFeedItem[] = [
  {
    id: "feed-reality-passport-activated",
    event: "Reality Passport activated",
    subject_name: "Creator Media Profile",
    subject_type: "reality_passport",
    status: "active",
    trust_band: "high",
    created_at: minutesAgo(8),
    public_link: "/verify/badge-reality-passport",
  },
  {
    id: "feed-agent-registered",
    event: "AI Agent registered",
    subject_name: "AI Agent Directory Profile",
    subject_type: "ai_agent",
    status: "verified",
    trust_band: "high",
    created_at: minutesAgo(18),
    public_link: "/profile/profile-ai-agent",
  },
  {
    id: "feed-badge-issued",
    event: "Trust Badge issued",
    subject_name: "Verified Human Profile",
    subject_type: "trust_badge",
    status: "active",
    trust_band: "high",
    created_at: minutesAgo(27),
    public_link: "/verify/badge-verified-human",
  },
  {
    id: "feed-human-presence-updated",
    event: "Human Presence updated",
    subject_name: "Candidate Trust Profile",
    subject_type: "human_presence",
    status: "under_review",
    trust_band: "medium",
    created_at: minutesAgo(43),
    public_link: "/profile/profile-candidate",
  },
  {
    id: "feed-profile-viewed",
    event: "Public profile viewed",
    subject_name: "Verified Human Profile",
    subject_type: "public_profile",
    status: "active",
    trust_band: "high",
    created_at: minutesAgo(61),
    public_link: "/profile/profile-verified-human",
  },
  {
    id: "feed-verification-renewed",
    event: "Verification renewed",
    subject_name: "HPI™ Checked",
    subject_type: "verification",
    status: "renewed",
    trust_band: "high",
    created_at: minutesAgo(76),
    public_link: "/verify/badge-hpi-checked",
  },
  {
    id: "feed-origin-trace-increased",
    event: "Origin Trace increased",
    subject_name: "Origin Trace Checked",
    subject_type: "origin_trace",
    status: "pending",
    trust_band: "medium",
    created_at: minutesAgo(94),
    public_link: "/verify/badge-origin-trace",
  },
  {
    id: "feed-verifier-approved",
    event: "Verifier approved",
    subject_name: "Compliance Partner",
    subject_type: "verifier_activity",
    status: "verified",
    trust_band: "high",
    created_at: minutesAgo(122),
    public_link: "/verifier-network",
  },
  {
    id: "feed-report-generated",
    event: "Trust report generated",
    subject_name: "Candidate Trust Report",
    subject_type: "verification",
    status: "verified",
    trust_band: "medium",
    created_at: minutesAgo(145),
    public_link: "/compliance-export",
  },
  {
    id: "feed-marketplace-completed",
    event: "Marketplace verification completed",
    subject_name: "Marketplace Seller",
    subject_type: "marketplace_event",
    status: "verified",
    trust_band: "high",
    created_at: minutesAgo(166),
    public_link: "/marketplace-trust",
  },
];

export function getPublicTrustFeed(limit = 30) {
  return demoTrustFeed.slice(0, limit);
}
