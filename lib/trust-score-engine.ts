type TrustRow = Record<string, any>;

export type TrustScoreResult = {
  score: number;
  confidenceLabel: "High Trust" | "Verified with Review" | "In Review" | "Elevated Risk";
  reasonCodes: string[];
};

export type TrustScoreReasonTone = "positive" | "warning" | "danger";

type TrustScoreInput = {
  passport?: TrustRow | null;
  evidence?: TrustRow[];
  decisions?: TrustRow[];
  auditLogs?: TrustRow[];
  signals?: TrustRow[];
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function normalized(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function rowMetadata(row: TrustRow) {
  const metadata = row.metadata;

  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }

  return {};
}

export function isRowLinkedToPassport(
  row: TrustRow,
  passportId: string,
  caseIds = new Set<string>()
) {
  const metadata = rowMetadata(row);
  const rowPassportId = String(row.passport_id ?? metadata.passport_id ?? "");
  const rowCaseId = String(
    row.verification_case_id ?? row.case_id ?? metadata.verification_case_id ?? ""
  );

  return rowPassportId === passportId || (rowCaseId ? caseIds.has(rowCaseId) : false);
}

export function getTrustConfidenceLabel(score: number): TrustScoreResult["confidenceLabel"] {
  if (score >= 80) {
    return "High Trust";
  }

  if (score >= 60) {
    return "Verified with Review";
  }

  if (score >= 40) {
    return "In Review";
  }

  return "Elevated Risk";
}

export function calculateTrustScoreV1({
  passport,
  evidence = [],
  decisions = [],
  auditLogs = [],
  signals = [],
}: TrustScoreInput): TrustScoreResult {
  let score = 50;
  const reasonCodes: string[] = [];
  const statuses = [
    passport?.verification_status,
    passport?.review_status,
    passport?.reality_passport_status,
    passport?.status,
    ...decisions.map((decision) => decision.status),
    ...evidence.map((item) => item.status ?? item.scan_status),
  ].map(normalized);
  const signalEvents = signals.map((signal) => normalized(signal.event));
  const auditEvents = auditLogs.map((log) => normalized(log.event_type));
  const decisionValues = decisions.map((decision) => normalized(decision.decision));
  const acceptedEvidenceExists = evidence.some((item) =>
    ["accepted", "clean", "approved"].includes(normalized(item.status ?? item.scan_status))
  );
  const rejectedEvidenceExists = evidence.some((item) =>
    ["rejected", "failed"].includes(normalized(item.status ?? item.scan_status))
  );
  const adminDecisionRecorded = auditEvents.includes("admin_decision_created");
  const verificationCompleted = auditEvents.includes("verification_completed");
  const decisionCompletedSignal = signalEvents.includes("decision completed");
  const manualReviewRequired = signalEvents.includes("manual_review_required");
  const needsMoreEvidence =
    statuses.includes("escalated") ||
    statuses.includes("needs_more_evidence") ||
    decisionValues.includes("needs_more_evidence");

  if (passport?.verified === true || statuses.includes("verified")) {
    score += 15;
  }

  if (acceptedEvidenceExists) {
    score += 10;
    reasonCodes.push("Evidence accepted");
  }

  if (adminDecisionRecorded) {
    score += 10;
    reasonCodes.push("Admin decision recorded");
  }

  if (verificationCompleted) {
    score += 10;
    reasonCodes.push("Verification completed");
  }

  if (decisionCompletedSignal) {
    score += 5;
    reasonCodes.push("Decision completed signal");
  }

  if (decisionValues.includes("deny")) {
    score -= 20;
  }

  if (rejectedEvidenceExists) {
    score -= 15;
  }

  if (needsMoreEvidence) {
    score -= 10;
    reasonCodes.push("Needs more evidence");
  }

  if (manualReviewRequired) {
    score -= 10;
    reasonCodes.push("Manual review required");
  }

  if (!evidence.length) {
    reasonCodes.push("Evidence missing");
  }

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    confidenceLabel: getTrustConfidenceLabel(finalScore),
    reasonCodes,
  };
}

export function getTrustScoreReasonTone(
  reason: string
): TrustScoreReasonTone {
  if (
    [
      "Evidence accepted",
      "Admin decision recorded",
      "Verification completed",
      "Decision completed signal",
    ].includes(reason)
  ) {
    return "positive";
  }

  if (reason === "Evidence missing" || reason === "Needs more evidence") {
    return "warning";
  }

  return "danger";
}
