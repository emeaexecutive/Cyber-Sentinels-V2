export type MediaType =
  | "image"
  | "video"
  | "audio"
  | "document";

export type ReviewStatus =
  | "pending"
  | "in_review"
  | "verified"
  | "rejected"
  | "escalated";

export type PassportSubjectType = "human" | "agent" | "candidate" | "content";

export type PassportTrustSignals = {
  subjectName: string;
  subjectType: PassportSubjectType;
  mediaType: MediaType;
  humanPresenceIndex: number;
  originTraceScore: number;
  attributionConfidence: number;
  syntheticRisk: number;
  reviewStatus: ReviewStatus;
};

export type SecurityPlaceholders = {
  source_ip_hash?: string | null;
  user_agent_hash?: string | null;
  suspicious_activity?: boolean;
  abuse_risk?: "low" | "medium" | "high";
  scan_status?: "pending" | "clean" | "blocked" | "manual_review";
  allowed_file_type?: MediaType | "unverified";
  rate_limit_status?: "allowed" | "limited" | "blocked";
};
