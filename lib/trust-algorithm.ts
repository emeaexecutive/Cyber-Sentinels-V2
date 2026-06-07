export type TrustAlgorithmSubjectType = "passport" | "agent";

export type TrustAlgorithmRow = Record<string, any>;

export type TrustAlgorithmResult = {
  trust_score: number;
  score: number;
  confidence_level:
    | "High Trust"
    | "Verified with Review"
    | "In Review"
    | "Elevated Risk";
  explanation: string;
  positive_signals: string[];
  negative_signals: string[];
  missing_requirements: string[];
  recommended_action: string;
};

export type TrustAlgorithmInput = {
  subjectType: TrustAlgorithmSubjectType;
  subject?: TrustAlgorithmRow | null;
  verificationCases?: TrustAlgorithmRow[];
  evidence?: TrustAlgorithmRow[];
  decisions?: TrustAlgorithmRow[];
  auditLogs?: TrustAlgorithmRow[];
  signals?: TrustAlgorithmRow[];
  appeals?: TrustAlgorithmRow[];
  agentActivity?: TrustAlgorithmRow[];
  trustEvents?: TrustAlgorithmRow[];
  permissions?: TrustAlgorithmRow[];
};

function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function hasAny(values: unknown[], accepted: string[]) {
  return values.some((value) => accepted.includes(normalized(value)));
}

function clamp(score: number) {
  return Math.max(0, Math.min(100, score));
}

export function getTrustAlgorithmConfidence(score: number): TrustAlgorithmResult["confidence_level"] {
  if (score >= 80) return "High Trust";
  if (score >= 60) return "Verified with Review";
  if (score >= 40) return "In Review";
  return "Elevated Risk";
}

function unresolvedAppealExists(appeals: TrustAlgorithmRow[]) {
  return appeals.some((appeal) => {
    const status = normalized(appeal.status);
    return !["closed", "resolved", "upheld", "reversed", "rejected"].includes(status);
  });
}

function highRiskSignalExists(signals: TrustAlgorithmRow[], trustEvents: TrustAlgorithmRow[]) {
  const signalRows = signals.some((signal) => {
    const event = normalized(signal.event);
    const severity = normalized(signal.severity ?? signal.risk_level);
    return (
      ["high", "critical"].includes(severity) ||
      /high-risk|high risk|critical|suspicious|fraud|abuse/.test(event)
    );
  });

  const trustEventRows = trustEvents.some((event) =>
    ["high", "critical"].includes(normalized(event.risk_level))
  );

  return signalRows || trustEventRows;
}

function suspiciousAgentActivityExists(
  agentActivity: TrustAlgorithmRow[],
  trustEvents: TrustAlgorithmRow[]
) {
  return (
    agentActivity.some((activity) => {
      const reviewStatus = normalized(activity.review_status);
      const activityType = normalized(activity.activity_type);
      return (
        ["suspicious", "unknown", "rejected", "failed"].includes(reviewStatus) ||
        /suspicious|unknown|unsigned|unverified|anomaly/.test(activityType)
      );
    }) ||
    trustEvents.some((event) => {
      const eventType = normalized(event.event_type);
      return /suspicious|unknown|unsigned|unverified|anomaly/.test(eventType);
    })
  );
}

function buildExplanation(
  positiveSignals: string[],
  negativeSignals: string[],
  missingRequirements: string[]
) {
  if (negativeSignals.length || missingRequirements.length) {
    const reasons = [...missingRequirements, ...negativeSignals].slice(0, 3).join(", ");
    return `This subject requires review because ${reasons}.`;
  }

  if (positiveSignals.length >= 4) {
    return "This subject has a strong trust chain because evidence, decisions, signals and audit logs are present.";
  }

  return "This subject has partial trust evidence and should remain visible for deterministic review.";
}

function recommendedAction(
  score: number,
  negativeSignals: string[],
  missingRequirements: string[]
) {
  if (score >= 80 && !negativeSignals.length && !missingRequirements.length) {
    return "Maintain trust status and continue routine monitoring.";
  }

  if (missingRequirements.includes("Evidence is missing")) {
    return "Request evidence before increasing trust status.";
  }

  if (negativeSignals.some((signal) => /rejected|denied|high-risk|suspicious|appeal/i.test(signal))) {
    return "Escalate for human review before approving additional access.";
  }

  return "Continue review and collect the missing trust-chain requirements.";
}

export function calculateTrustAlgorithmV1({
  subjectType,
  subject,
  verificationCases = [],
  evidence = [],
  decisions = [],
  auditLogs = [],
  signals = [],
  appeals = [],
  agentActivity = [],
  trustEvents = [],
  permissions = [],
}: TrustAlgorithmInput): TrustAlgorithmResult {
  let score = 50;
  const positiveSignals: string[] = [];
  const negativeSignals: string[] = [];
  const missingRequirements: string[] = [];

  const subjectStatuses = [
    subject?.verified === true ? "verified" : "",
    subject?.verification_status,
    subject?.review_status,
    subject?.reality_passport_status,
    subject?.status,
    subject?.policy_status,
  ];
  const decisionValues = decisions.flatMap((decision) => [
    decision.decision,
    decision.status,
    decision.decision_type,
  ]);
  const evidenceStatuses = evidence.map((item) => item.status ?? item.scan_status);
  const activityExists = agentActivity.length > 0 || trustEvents.length > 0;
  const signalExists = signals.length > 0 || trustEvents.length > 0;
  const auditTrailExists = auditLogs.length > 0 || trustEvents.length > 0 || agentActivity.length > 0;
  const graphDataExists =
    verificationCases.length > 0 ||
    permissions.length > 0 ||
    activityExists ||
    decisions.length > 0;
  const acceptedEvidenceExists = hasAny(evidenceStatuses, [
    "accepted",
    "approved",
    "clean",
    "verified",
  ]);
  const approvedDecisionExists = hasAny(decisionValues, [
    "allow",
    "approve",
    "approved",
    "verified",
  ]);
  const rejectedDecisionExists = hasAny(decisionValues, [
    "deny",
    "denied",
    "rejected",
  ]);
  const manualReviewRequired =
    hasAny([...subjectStatuses, ...decisionValues], [
      "manual_review",
      "needs_manual_review",
      "in_review",
      "escalated",
      "needs_more_evidence",
    ]) ||
    Boolean(subject?.human_review_required || subject?.linkedin_review_required);
  const unresolvedAppeal = unresolvedAppealExists(appeals);
  const highRiskSignal = highRiskSignalExists(signals, trustEvents);
  const agentVerified =
    subjectType !== "agent" ||
    hasAny(subjectStatuses, ["verified", "approved", "active", "operational"]);
  const suspiciousAgentActivity =
    subjectType === "agent" &&
    suspiciousAgentActivityExists(agentActivity, trustEvents);

  if (subjectType === "passport" && hasAny(subjectStatuses, ["verified", "approved"])) {
    score += 15;
    positiveSignals.push("Verified passport");
  }

  if (acceptedEvidenceExists) {
    score += 10;
    positiveSignals.push("Accepted evidence exists");
  }

  if (approvedDecisionExists) {
    score += 10;
    positiveSignals.push("Admin decision allow/approved");
  }

  if (auditTrailExists) {
    score += 10;
    positiveSignals.push("Audit trail exists");
  }

  if (signalExists) {
    score += 5;
    positiveSignals.push("Signals exist");
  }

  if (!unresolvedAppeal) {
    score += 5;
    positiveSignals.push("No unresolved appeal");
  }

  if (graphDataExists) {
    score += 5;
    positiveSignals.push("Graph/relationship data exists");
  }

  if (rejectedDecisionExists) {
    score -= 20;
    negativeSignals.push("Rejected/denied decision");
  }

  if (!evidence.length) {
    score -= 15;
    missingRequirements.push("Evidence is missing");
  }

  if (manualReviewRequired) {
    score -= 10;
    negativeSignals.push("Manual review required");
  }

  if (unresolvedAppeal) {
    score -= 10;
    negativeSignals.push("Unresolved appeal");
  }

  if (highRiskSignal) {
    score -= 10;
    negativeSignals.push("High-risk signal");
  }

  if (!agentVerified) {
    score -= 10;
    negativeSignals.push("Unverified AI agent");
  }

  if (suspiciousAgentActivity) {
    score -= 15;
    negativeSignals.push("Suspicious/unknown agent activity");
  }

  if (!approvedDecisionExists) {
    missingRequirements.push("Admin decision is missing");
  }

  if (!auditTrailExists) {
    missingRequirements.push("Audit trail is missing");
  }

  if (!signalExists) {
    missingRequirements.push("Trust signals are missing");
  }

  const finalScore = clamp(score);
  const explanation = buildExplanation(
    positiveSignals,
    negativeSignals,
    missingRequirements
  );
  const action = recommendedAction(finalScore, negativeSignals, missingRequirements);

  return {
    trust_score: finalScore,
    score: finalScore,
    confidence_level: getTrustAlgorithmConfidence(finalScore),
    explanation,
    positive_signals: positiveSignals,
    negative_signals: negativeSignals,
    missing_requirements: missingRequirements,
    recommended_action: action,
  };
}

export function reasonCodes(result?: Pick<TrustAlgorithmResult, "positive_signals" | "negative_signals" | "missing_requirements"> | null) {
  if (!result) return [];
  return [
    ...result.positive_signals,
    ...result.negative_signals,
    ...result.missing_requirements,
  ];
}
