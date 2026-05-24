export type TrustApiRiskLevel = "low" | "medium" | "high" | "critical";

export type TrustApiRecommendedAction =
  | "allow"
  | "manual_review"
  | "needs_more_evidence"
  | "deny";

export type TrustCheckRequest = {
  subject_type?: "human" | "agent" | "candidate" | "content";
  media_type?: "image" | "video" | "audio" | "document";
  biometric_confidence?: number;
  behavioural_consistency?: number;
  liveness_score?: number;
  image_authenticity_score?: number;
  trust_timeline_score?: number;
  synthetic_risk?: number;
  voice_clone_risk?: number;
  video_deepfake_risk?: number;
  attribution_confidence?: number;
  model_fingerprint_risk?: number;
  metadata_integrity?: string;
  watermark_status?: string;
  c2pa_status?: string;
  upload_chain_status?: string;
  likely_source_type?: string;
};

export type TrustCheckResponse = {
  ok: true;
  trust_score: number;
  human_presence_index: number;
  origin_trace_score: number;
  risk_level: TrustApiRiskLevel;
  recommended_action: TrustApiRecommendedAction;
};

export type TrustPassportSummary = {
  id: string;
  subject_name: string;
  subject_type: string;
  trust_score: number | null;
  human_presence_index: number | null;
  origin_trace_score: number | null;
  review_status: string | null;
  verification_status: string | null;
  reality_passport_status: string | null;
  provenance_status: string | null;
  created_at: string | null;
};

export type TrustDecisionRequest = TrustCheckRequest & {
  requested_action?: "allow" | "deny" | "manual_review" | "needs_more_evidence";
  has_trust_passport?: boolean;
  has_audit_log?: boolean;
  has_signal?: boolean;
  has_media_evidence?: boolean;
  is_admin?: boolean;
  linkedin_url?: string;
  linkedin_verification_status?: string;
  suspicious_activity?: boolean;
  provenance_status?: string;
};

export type TrustDecisionResponse = {
  ok: true;
  decision: string;
  policy_result: string;
  reason_codes: string[];
  recommended_next_step: string;
};

export type TrustEvidenceSummaryResponse = {
  ok: true;
  evidence_summary: {
    total: number;
    pending_scan: number;
    suspicious: number;
    custody_issues: number;
    linked_passports: number;
    linked_cases: number;
  };
  upload_workflow: "placeholder";
  message: string;
};

export type TrustApiErrorResponse = {
  ok: false;
  error: string;
};
