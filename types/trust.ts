export type TrustAction =
  | "waitlist.created"
  | "passport.created"
  | "trust_report.created"
  | "passport.review_status_changed"
  | "human_presence_index_created"
  | "origin_trace_created"
  | "reality_passport_created"
  | "trust.update";

export type TrustUpdate = {
  action: TrustAction;
  actor: string;
  subject?: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

export type TrustScoreSignals = {
  humanPresenceIndex?: number;
  originTraceScore?: number;
  livenessScore?: number;
  imageAuthenticityScore?: number;
  syntheticRisk?: number;
  voiceCloneRisk?: number;
  videoDeepfakeRisk?: number;
  reviewOutcome?: "allow" | "deny" | "manual_review" | "needs_more_evidence";
};
