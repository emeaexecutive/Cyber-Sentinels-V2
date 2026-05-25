export const revocationTriggers = [
  "deepfake_detected",
  "voice_clone_risk_high",
  "origin_trace_failed",
  "human_presence_failed",
  "linkedin_mismatch",
  "policy_violation",
  "permission_abuse",
  "admin_decision_reversed",
  "evidence_tampered",
  "api_key_abuse",
  "agent_policy_violation",
  "suspicious_activity_confirmed",
] as const;

export const revocationActions = [
  "revoke_passport",
  "restrict_agent",
  "pause_api_key",
  "require_step_up",
  "escalate_review",
  "expire_clearance",
  "lock_evidence",
  "notify_admin",
] as const;

export const revocationStatuses = [
  "active",
  "restricted",
  "revoked",
  "expired",
  "under_review",
  "paused",
] as const;

export const revocationSignals = [
  "trust_revoked",
  "agent_restricted",
  "api_key_paused",
  "clearance_expired",
  "evidence_locked",
  "revocation_review_started",
] as const;

export const revocationAuditEvents = [
  "revocation_evaluated",
  "trust_revoked",
  "agent_restricted",
  "api_key_paused",
  "evidence_locked",
] as const;

export type RevocationTrigger = (typeof revocationTriggers)[number];
export type RevocationAction = (typeof revocationActions)[number];
export type RevocationStatus = (typeof revocationStatuses)[number];
export type RevocationSubjectType =
  | "human"
  | "candidate"
  | "passport"
  | "agent"
  | "api_key"
  | "evidence"
  | "clearance"
  | "system";

export type RevocationInput = {
  subject_type: RevocationSubjectType;
  subject_id: string;
  trigger_reason: RevocationTrigger;
};

export type RevocationResult = {
  revocation_action: RevocationAction;
  status: RevocationStatus;
  reason_codes: RevocationTrigger[];
  recommended_next_step: string;
};

export type DemoRevocationCase = {
  subject: string;
  trigger_reason: RevocationTrigger;
  action: RevocationAction;
  status: RevocationStatus;
  summary: string;
};

export const demoRevocationCases: DemoRevocationCase[] = [
  {
    subject: "AI Agent policy violation",
    trigger_reason: "agent_policy_violation",
    action: "restrict_agent",
    status: "restricted",
    summary: "Autonomous scope paused pending policy review.",
  },
  {
    subject: "Origin Trace failed",
    trigger_reason: "origin_trace_failed",
    action: "require_step_up",
    status: "under_review",
    summary: "Fresh provenance evidence required before trust is restored.",
  },
  {
    subject: "Evidence tampered",
    trigger_reason: "evidence_tampered",
    action: "lock_evidence",
    status: "restricted",
    summary: "Evidence chain locked for admin review.",
  },
  {
    subject: "API key abuse",
    trigger_reason: "api_key_abuse",
    action: "pause_api_key",
    status: "paused",
    summary: "API key paused until usage is reviewed.",
  },
  {
    subject: "LinkedIn mismatch",
    trigger_reason: "linkedin_mismatch",
    action: "escalate_review",
    status: "under_review",
    summary: "Professional profile conflict routed to manual review.",
  },
  {
    subject: "Human Presence failed",
    trigger_reason: "human_presence_failed",
    action: "revoke_passport",
    status: "revoked",
    summary: "Passport trust revoked after failed presence check.",
  },
];

const triggerMap: Record<RevocationTrigger, Pick<RevocationResult, "revocation_action" | "status" | "recommended_next_step">> = {
  deepfake_detected: {
    revocation_action: "revoke_passport",
    status: "revoked",
    recommended_next_step: "Revoke affected trust record and notify admin review",
  },
  voice_clone_risk_high: {
    revocation_action: "escalate_review",
    status: "under_review",
    recommended_next_step: "Escalate voice evidence for manual review",
  },
  origin_trace_failed: {
    revocation_action: "require_step_up",
    status: "under_review",
    recommended_next_step: "Require step-up evidence before restoring trust",
  },
  human_presence_failed: {
    revocation_action: "revoke_passport",
    status: "revoked",
    recommended_next_step: "Revoke passport and require new human presence proof",
  },
  linkedin_mismatch: {
    revocation_action: "escalate_review",
    status: "under_review",
    recommended_next_step: "Route profile mismatch to manual review",
  },
  policy_violation: {
    revocation_action: "escalate_review",
    status: "under_review",
    recommended_next_step: "Start policy review and notify admin",
  },
  permission_abuse: {
    revocation_action: "notify_admin",
    status: "under_review",
    recommended_next_step: "Notify admin and review permission history",
  },
  admin_decision_reversed: {
    revocation_action: "expire_clearance",
    status: "expired",
    recommended_next_step: "Expire clearance and record reversal history",
  },
  evidence_tampered: {
    revocation_action: "lock_evidence",
    status: "restricted",
    recommended_next_step: "Lock evidence and preserve chain of custody",
  },
  api_key_abuse: {
    revocation_action: "pause_api_key",
    status: "paused",
    recommended_next_step: "Pause API key and review usage before reactivation",
  },
  agent_policy_violation: {
    revocation_action: "restrict_agent",
    status: "restricted",
    recommended_next_step: "Restrict agent scopes until policy review completes",
  },
  suspicious_activity_confirmed: {
    revocation_action: "notify_admin",
    status: "under_review",
    recommended_next_step: "Notify admin and start revocation review",
  },
};

export function evaluateRevocationEngine(
  input: RevocationInput
): RevocationResult {
  const result = triggerMap[input.trigger_reason];

  return {
    ...result,
    reason_codes: [input.trigger_reason],
  };
}
