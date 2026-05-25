export const recoveryTriggers = [
  "revoked_passport",
  "restricted_agent",
  "paused_api_key",
  "failed_step_up",
  "evidence_tamper_resolved",
  "linkedin_mismatch_resolved",
  "human_presence_reverified",
  "origin_trace_recalculated",
  "admin_reversal_requested",
] as const;

export const recoveryActions = [
  "request_evidence",
  "start_step_up",
  "manual_review",
  "recalculate_hpi",
  "rerun_origin_trace",
  "restore_passport",
  "restore_agent",
  "restore_api_key",
  "deny_recovery",
] as const;

export const recoveryStatuses = [
  "not_started",
  "requested",
  "evidence_required",
  "in_review",
  "approved",
  "denied",
  "restored",
  "expired",
] as const;

export const recoverySignals = [
  "trust_recovery_requested",
  "trust_recovery_evidence_submitted",
  "trust_recovery_approved",
  "trust_recovery_denied",
  "trust_restored",
] as const;

export const recoveryAuditEvents = [
  "trust_recovery_requested",
  "trust_recovery_reviewed",
  "trust_restored",
  "trust_recovery_denied",
] as const;

export type RecoveryTrigger = (typeof recoveryTriggers)[number];
export type RecoveryAction = (typeof recoveryActions)[number];
export type RecoveryStatus = (typeof recoveryStatuses)[number];
export type RecoverySubjectType =
  | "human"
  | "candidate"
  | "passport"
  | "agent"
  | "api_key"
  | "evidence"
  | "clearance"
  | "system";

export type TrustRecoveryInput = {
  subject_type: RecoverySubjectType;
  subject_id: string;
  recovery_reason: RecoveryTrigger;
  submitted_evidence?: string | null;
  risk_level?: "low" | "medium" | "high" | "critical" | null;
};

export type TrustRecoveryResult = {
  recovery_status: RecoveryStatus;
  required_next_steps: RecoveryAction[];
  recommended_action: string;
};

export type DemoRecoveryCase = {
  subject: string;
  recovery_reason: RecoveryTrigger;
  status: RecoveryStatus | "step_up_required" | "admin_review";
  action: RecoveryAction;
  summary: string;
};

export const demoRecoveryCases: DemoRecoveryCase[] = [
  {
    subject: "Revoked passport",
    recovery_reason: "revoked_passport",
    status: "evidence_required",
    action: "request_evidence",
    summary: "New identity, liveness and provenance evidence required.",
  },
  {
    subject: "Restricted agent",
    recovery_reason: "restricted_agent",
    status: "in_review",
    action: "manual_review",
    summary: "Agent scopes held until policy review completes.",
  },
  {
    subject: "Paused API key",
    recovery_reason: "paused_api_key",
    status: "step_up_required",
    action: "start_step_up",
    summary: "High-volume usage needs builder step-up before restoration.",
  },
  {
    subject: "LinkedIn mismatch resolved",
    recovery_reason: "linkedin_mismatch_resolved",
    status: "restored",
    action: "restore_passport",
    summary: "Professional profile evidence reconciled and restored.",
  },
  {
    subject: "Origin Trace recalculated",
    recovery_reason: "origin_trace_recalculated",
    status: "admin_review",
    action: "manual_review",
    summary: "Recalculated origin score needs admin approval.",
  },
];

const highRiskRecoveryReasons: RecoveryTrigger[] = [
  "revoked_passport",
  "restricted_agent",
  "paused_api_key",
  "failed_step_up",
  "admin_reversal_requested",
];

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export function evaluateTrustRecovery(
  input: TrustRecoveryInput
): TrustRecoveryResult {
  const hasEvidence = Boolean(input.submitted_evidence?.trim());
  const steps: RecoveryAction[] = [];
  const isHighRisk =
    input.risk_level === "high" ||
    input.risk_level === "critical" ||
    highRiskRecoveryReasons.includes(input.recovery_reason);

  if (!hasEvidence) {
    steps.push("request_evidence");
  }

  if (input.recovery_reason === "failed_step_up" || input.recovery_reason === "paused_api_key") {
    steps.push("start_step_up");
  }

  if (
    input.recovery_reason === "human_presence_reverified" ||
    input.recovery_reason === "revoked_passport"
  ) {
    steps.push("recalculate_hpi");
  }

  if (
    input.recovery_reason === "origin_trace_recalculated" ||
    input.recovery_reason === "evidence_tamper_resolved"
  ) {
    steps.push("rerun_origin_trace");
  }

  if (isHighRisk) {
    steps.push("manual_review");
  }

  if (!hasEvidence) {
    return {
      recovery_status: "evidence_required",
      required_next_steps: unique(steps),
      recommended_action: "Request evidence before recovery can proceed",
    };
  }

  if (isHighRisk) {
    return {
      recovery_status: "in_review",
      required_next_steps: unique(steps),
      recommended_action: "Route recovery to admin review before restoring trust",
    };
  }

  const restoreAction: RecoveryAction =
    input.subject_type === "agent"
      ? "restore_agent"
      : input.subject_type === "api_key"
        ? "restore_api_key"
        : "restore_passport";

  return {
    recovery_status: "approved",
    required_next_steps: unique([...steps, restoreAction]),
    recommended_action: "Approve recovery and restore trust after audit logging",
  };
}
