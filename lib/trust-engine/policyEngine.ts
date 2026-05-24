export type PolicyResult = "pass" | "fail" | "warning";

export type PolicyAction =
  | "allow"
  | "block"
  | "manual_review"
  | "needs_more_evidence";

export type PolicyReasonCode =
  | "missing_trust_passport"
  | "weak_human_presence"
  | "weak_origin_trace"
  | "high_synthetic_risk"
  | "linkedin_mismatch"
  | "missing_evidence"
  | "admin_required"
  | "audit_required";

export type PolicySignal =
  | "policy_blocked_action"
  | "policy_manual_review_required"
  | "policy_passed";

export type PolicyEngineInput = {
  requested_action?: "allow" | "deny" | "approve" | "reject" | string | null;
  subject_type?: string | null;
  media_type?: string | null;
  has_trust_passport?: boolean | null;
  has_human_presence_index?: boolean | null;
  has_origin_trace?: boolean | null;
  has_audit_log?: boolean | null;
  has_signal?: boolean | null;
  has_media_evidence?: boolean | null;
  is_admin?: boolean | null;
  trust_score?: number | null;
  human_presence_index?: number | null;
  origin_trace_score?: number | null;
  synthetic_risk?: number | null;
  liveness_score?: number | null;
  provenance_status?: string | null;
  linkedin_url?: string | null;
  linkedin_verification_status?: string | null;
  suspicious_activity?: boolean | null;
};

export type PolicyEngineResult = {
  policy_result: PolicyResult;
  policy_action: PolicyAction;
  reason_codes: PolicyReasonCode[];
  signals: PolicySignal[];
};

export const policyEngineAuditEvent = "policy_engine_evaluated";

export const policyEngineSignals: PolicySignal[] = [
  "policy_blocked_action",
  "policy_manual_review_required",
  "policy_passed",
];

export const activePolicies = [
  "Proof Before Permission Policy",
  "Human Review Policy",
  "Evidence Sufficiency Policy",
  "Admin Decision Policy",
  "Audit Policy",
];

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function isAllowAction(action: PolicyEngineInput["requested_action"]) {
  return action === "allow" || action === "approve";
}

function isApprovalAction(action: PolicyEngineInput["requested_action"]) {
  return ["allow", "approve", "deny", "reject"].includes(String(action));
}

function isHighRisk(input: PolicyEngineInput) {
  return (
    (isNumber(input.synthetic_risk) && input.synthetic_risk > 70) ||
    (isNumber(input.human_presence_index) && input.human_presence_index < 60) ||
    (isNumber(input.origin_trace_score) && input.origin_trace_score < 50) ||
    input.suspicious_activity === true ||
    input.linkedin_verification_status === "mismatch"
  );
}

function hasProofBeforePermission(input: PolicyEngineInput) {
  return Boolean(
    input.has_trust_passport &&
      input.has_human_presence_index &&
      input.has_origin_trace &&
      input.has_audit_log
  );
}

function hasEvidenceGap(input: PolicyEngineInput) {
  const needsCandidateLinkedIn =
    input.subject_type === "candidate" && !input.linkedin_url;
  const needsMediaEvidence =
    ["video", "audio"].includes(input.media_type ?? "") &&
    !input.has_media_evidence;

  return (
    !isNumber(input.liveness_score) ||
    !input.provenance_status ||
    needsCandidateLinkedIn ||
    needsMediaEvidence
  );
}

export function evaluatePolicyEngine(
  input: PolicyEngineInput
): PolicyEngineResult {
  const reasonCodes: PolicyReasonCode[] = [];
  const highRisk = isHighRisk(input);

  if (highRisk && isAllowAction(input.requested_action)) {
    if (!input.has_trust_passport) {
      reasonCodes.push("missing_trust_passport");
    }

    if (!input.has_human_presence_index) {
      reasonCodes.push("weak_human_presence");
    }

    if (!input.has_origin_trace) {
      reasonCodes.push("weak_origin_trace");
    }

    if (!input.has_audit_log) {
      reasonCodes.push("audit_required");
    }
  }

  if (isNumber(input.synthetic_risk) && input.synthetic_risk > 70) {
    reasonCodes.push("high_synthetic_risk");
  }

  if (isNumber(input.human_presence_index) && input.human_presence_index < 60) {
    reasonCodes.push("weak_human_presence");
  }

  if (isNumber(input.origin_trace_score) && input.origin_trace_score < 50) {
    reasonCodes.push("weak_origin_trace");
  }

  if (input.suspicious_activity) {
    reasonCodes.push("high_synthetic_risk");
  }

  if (input.linkedin_verification_status === "mismatch") {
    reasonCodes.push("linkedin_mismatch");
  }

  if (hasEvidenceGap(input)) {
    reasonCodes.push("missing_evidence");
  }

  if (highRisk && isApprovalAction(input.requested_action) && !input.is_admin) {
    reasonCodes.push("admin_required");
  }

  if (input.has_audit_log === false || input.has_signal === false) {
    reasonCodes.push("audit_required");
  }

  const uniqueReasonCodes = unique(reasonCodes);
  const blocksAction =
    (highRisk &&
      isAllowAction(input.requested_action) &&
      !hasProofBeforePermission(input)) ||
    (highRisk && isApprovalAction(input.requested_action) && !input.is_admin);
  const needsEvidence = uniqueReasonCodes.includes("missing_evidence");
  const needsManualReview = uniqueReasonCodes.some((reason) =>
    [
      "weak_human_presence",
      "weak_origin_trace",
      "high_synthetic_risk",
      "linkedin_mismatch",
    ].includes(reason)
  );

  if (blocksAction) {
    return {
      policy_result: "fail",
      policy_action: "block",
      reason_codes: uniqueReasonCodes,
      signals: ["policy_blocked_action"],
    };
  }

  if (needsEvidence) {
    return {
      policy_result: "warning",
      policy_action: "needs_more_evidence",
      reason_codes: uniqueReasonCodes,
      signals: ["policy_manual_review_required"],
    };
  }

  if (needsManualReview) {
    return {
      policy_result: "warning",
      policy_action: "manual_review",
      reason_codes: uniqueReasonCodes,
      signals: ["policy_manual_review_required"],
    };
  }

  return {
    policy_result: "pass",
    policy_action: "allow",
    reason_codes: uniqueReasonCodes,
    signals: ["policy_passed"],
  };
}
