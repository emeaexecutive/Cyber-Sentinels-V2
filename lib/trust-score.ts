export type ProviderVerificationState =
  | "none"
  | "pending"
  | "verified"
  | "failed";

export type GovernanceReviewState =
  | "not_started"
  | "pending"
  | "approved"
  | "rejected"
  | "escalated";

export type TrustScoreRiskFlag =
  | "missing_evidence"
  | "session_integrity_anomaly"
  | "injection_risk"
  | "proxy_candidate_risk"
  | "failed_governance_review"
  | "provider_failed"
  | "high_risk_context";

export type TransparentTrustScoreInput = {
  identityConfidence: number;
  sessionIntegrity: number;
  evidenceCompleteness: number;
  governanceReview: GovernanceReviewState;
  riskFlags?: TrustScoreRiskFlag[];
  providerVerification?: ProviderVerificationState;
};

export type TransparentTrustScoreResult = {
  score: number;
  level: "low" | "moderate" | "high" | "blocked";
  flagsTriggered: string[];
  recommendedAction: string;
  evidenceGenerated: string[];
  breakdown: {
    identityConfidence: number;
    sessionIntegrity: number;
    evidenceCompleteness: number;
    governanceReview: number;
    providerVerification: number;
    riskPenalty: number;
  };
};

const riskFlagLabels: Record<TrustScoreRiskFlag, string> = {
  missing_evidence: "Missing evidence",
  session_integrity_anomaly: "Session integrity anomaly",
  injection_risk: "Session injection risk",
  proxy_candidate_risk: "Proxy candidate risk",
  failed_governance_review: "Failed governance review",
  provider_failed: "Provider verification failed",
  high_risk_context: "High-risk workflow context",
};

const riskPenalty: Record<TrustScoreRiskFlag, number> = {
  missing_evidence: 12,
  session_integrity_anomaly: 16,
  injection_risk: 22,
  proxy_candidate_risk: 20,
  failed_governance_review: 30,
  provider_failed: 18,
  high_risk_context: 10,
};

const governanceScore: Record<GovernanceReviewState, number> = {
  not_started: 45,
  pending: 55,
  approved: 90,
  rejected: 15,
  escalated: 35,
};

const providerScore: Record<ProviderVerificationState, number> = {
  none: 50,
  pending: 55,
  verified: 90,
  failed: 20,
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreLevel(score: number, flags: TrustScoreRiskFlag[]): TransparentTrustScoreResult["level"] {
  if (flags.includes("failed_governance_review") || flags.includes("provider_failed") || score < 35) {
    return "blocked";
  }

  if (score < 60) return "low";
  if (score < 80) return "moderate";
  return "high";
}

function recommendedAction(level: TransparentTrustScoreResult["level"], flags: TrustScoreRiskFlag[]) {
  if (level === "blocked") {
    return "Block workflow advancement until governance review is resolved.";
  }

  if (flags.includes("injection_risk") || flags.includes("proxy_candidate_risk")) {
    return "Escalate to governance review before the workflow moves forward.";
  }

  if (flags.includes("missing_evidence") || flags.includes("session_integrity_anomaly")) {
    return "Request missing evidence and review session integrity before approval.";
  }

  if (level === "moderate") {
    return "Allow continued review with reviewer confirmation before final outcome.";
  }

  return "Proceed with normal workflow review and retain receipt evidence.";
}

function evidenceGenerated(input: TransparentTrustScoreInput, flags: TrustScoreRiskFlag[]) {
  const evidence = [
    "MVP trust score breakdown",
    "Workflow trust state",
    "Rule-based flag summary",
  ];

  if (input.evidenceCompleteness > 0) {
    evidence.push("Evidence completeness marker");
  }

  if (input.governanceReview !== "not_started") {
    evidence.push("Governance review state");
  }

  if (input.providerVerification && input.providerVerification !== "none") {
    evidence.push("Provider verification signal");
  }

  if (flags.length) {
    evidence.push("Reviewer action recommendation");
  }

  return evidence;
}

// MVP transparency note:
// This is a deterministic, rule-based scoring model for workflow review. It is
// not a trained biometric, liveness, deepfake, voice-clone, or identity-detection
// model. Scores explain current product state and reviewer workflow priority;
// they do not independently validate a person's identity or media authenticity.
export function calculateTransparentTrustScore(
  input: TransparentTrustScoreInput
): TransparentTrustScoreResult {
  const flags = input.riskFlags ?? [];
  const governance = governanceScore[input.governanceReview] ?? governanceScore.pending;
  const provider = providerScore[input.providerVerification ?? "none"];
  const penalty = flags.reduce((total, flag) => total + (riskPenalty[flag] ?? 0), 0);

  const weightedScore =
    clampScore(input.identityConfidence) * 0.24 +
    clampScore(input.sessionIntegrity) * 0.24 +
    clampScore(input.evidenceCompleteness) * 0.2 +
    governance * 0.2 +
    provider * 0.12 -
    penalty;

  const score = clampScore(weightedScore);
  const level = scoreLevel(score, flags);

  return {
    score,
    level,
    flagsTriggered: flags.map((flag) => riskFlagLabels[flag] ?? flag),
    recommendedAction: recommendedAction(level, flags),
    evidenceGenerated: evidenceGenerated(input, flags),
    breakdown: {
      identityConfidence: clampScore(input.identityConfidence),
      sessionIntegrity: clampScore(input.sessionIntegrity),
      evidenceCompleteness: clampScore(input.evidenceCompleteness),
      governanceReview: governance,
      providerVerification: provider,
      riskPenalty: penalty,
    },
  };
}

export function calculateTrustScore(
  profileConsistency: number,
  syntheticRisk: number,
  confidence: number
) {
  const score =
    profileConsistency * 0.45 +
    confidence * 0.45 -
    syntheticRisk * 0.25;

  return Math.max(0, Math.min(100, Math.round(score)));
}
