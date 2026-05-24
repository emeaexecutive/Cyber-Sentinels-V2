export type DecisionAction =
  | "allow"
  | "deny"
  | "manual_review"
  | "needs_more_evidence";

export type DecisionRiskLevel = "low" | "medium" | "high" | "critical";

export type DecisionReasonCode =
  | "high_synthetic_risk"
  | "weak_human_presence"
  | "weak_origin_trace"
  | "suspicious_activity_detected"
  | "strong_trust_signal"
  | "manual_review_required";

export type DecisionSignal =
  | "decision_recommended"
  | "manual_review_required"
  | "evidence_required"
  | "trust_allow_recommended"
  | "trust_deny_recommended";

export type DecisionEngineInput = {
  trust_score?: number | null;
  human_presence_index?: number | null;
  origin_trace_score?: number | null;
  synthetic_risk?: number | null;
  liveness_score?: number | null;
  linkedin_profile_consistency?: number | null;
  video_deepfake_risk?: number | null;
  voice_clone_risk?: number | null;
  image_authenticity_score?: number | null;
  provenance_status?: string | null;
  review_status?: string | null;
  suspicious_activity?: boolean | null;
  abuse_risk?: string | null;
};

export type DecisionEngineResult = {
  decision: DecisionAction;
  riskLevel: DecisionRiskLevel;
  recommendedAction: string;
  reasonCodes: DecisionReasonCode[];
  signals: DecisionSignal[];
};

export const decisionEngineAuditEvent = "decision_engine_evaluated";

export const decisionEngineSignals: DecisionSignal[] = [
  "decision_recommended",
  "manual_review_required",
  "evidence_required",
  "trust_allow_recommended",
  "trust_deny_recommended",
];

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function includesElevatedAbuseRisk(value: string | null | undefined) {
  return Boolean(value && !["low", "none", "minimal"].includes(value));
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function getRiskLevel(
  decision: DecisionAction,
  input: DecisionEngineInput
): DecisionRiskLevel {
  if (
    decision === "deny" ||
    (isNumber(input.synthetic_risk) && input.synthetic_risk >= 90) ||
    input.suspicious_activity ||
    input.review_status === "rejected" ||
    includesElevatedAbuseRisk(input.abuse_risk)
  ) {
    return "critical";
  }

  if (
    decision === "manual_review" ||
    (isNumber(input.synthetic_risk) && input.synthetic_risk > 80) ||
    (isNumber(input.video_deepfake_risk) && input.video_deepfake_risk > 70) ||
    (isNumber(input.voice_clone_risk) && input.voice_clone_risk > 70) ||
    (isNumber(input.origin_trace_score) && input.origin_trace_score < 40)
  ) {
    return "high";
  }

  if (
    decision === "needs_more_evidence" ||
    (isNumber(input.human_presence_index) && input.human_presence_index < 50) ||
    (isNumber(input.image_authenticity_score) &&
      input.image_authenticity_score < 60) ||
    input.provenance_status === "unverified"
  ) {
    return "medium";
  }

  return "low";
}

function getRecommendedAction(decision: DecisionAction) {
  const actions: Record<DecisionAction, string> = {
    allow: "Allow",
    deny: "Deny",
    manual_review: "Manual review",
    needs_more_evidence: "Request more evidence",
  };

  return actions[decision];
}

function getSignals(decision: DecisionAction): DecisionSignal[] {
  const signals: DecisionSignal[] = ["decision_recommended"];

  if (decision === "allow") {
    signals.push("trust_allow_recommended");
  }

  if (decision === "deny") {
    signals.push("trust_deny_recommended");
  }

  if (decision === "manual_review") {
    signals.push("manual_review_required");
  }

  if (decision === "needs_more_evidence") {
    signals.push("evidence_required");
  }

  return signals;
}

export function evaluateDecisionEngine(
  input: DecisionEngineInput
): DecisionEngineResult {
  const reasonCodes: DecisionReasonCode[] = [];
  let decision: DecisionAction = "manual_review";

  if (isNumber(input.synthetic_risk) && input.synthetic_risk > 80) {
    reasonCodes.push("high_synthetic_risk");
    decision = input.synthetic_risk >= 90 ? "deny" : "manual_review";
  } else if (
    isNumber(input.human_presence_index) &&
    input.human_presence_index < 50
  ) {
    reasonCodes.push("weak_human_presence");
    decision = "needs_more_evidence";
  } else if (
    isNumber(input.origin_trace_score) &&
    input.origin_trace_score < 40
  ) {
    reasonCodes.push("weak_origin_trace");
    decision = "manual_review";
  } else if (input.suspicious_activity) {
    reasonCodes.push("suspicious_activity_detected");
    decision = "manual_review";
  } else if (
    isNumber(input.trust_score) &&
    input.trust_score > 85 &&
    isNumber(input.human_presence_index) &&
    input.human_presence_index > 80
  ) {
    reasonCodes.push("strong_trust_signal");
    decision = "allow";
  } else {
    reasonCodes.push("manual_review_required");
  }

  if (decision === "manual_review" && !reasonCodes.length) {
    reasonCodes.push("manual_review_required");
  }

  return {
    decision,
    riskLevel: getRiskLevel(decision, input),
    recommendedAction: getRecommendedAction(decision),
    reasonCodes: unique(reasonCodes),
    signals: getSignals(decision),
  };
}
