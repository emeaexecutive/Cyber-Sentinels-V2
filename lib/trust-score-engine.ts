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
  const adminDecisionRecorded = auditEvents.includes("admin_decision_created");
  const verificationCompleted = auditEvents.includes("verification_completed");
  const decisionCompletedSignal = signalEvents.includes("decision completed");
  const provenanceSignals = [
    passport?.provenance_status,
    passport?.c2pa_status,
    passport?.origin_trace_score,
    ...signalEvents.filter((event) => /provenance|origin|metadata|watermark/i.test(event)),
  ].filter((value) => String(value ?? "").trim() !== "");
  const sessionContinuitySignals = [
    passport?.liveness_score,
    passport?.voice_clone_risk,
    passport?.video_deepfake_risk,
    ...signalEvents.filter((event) => /session|liveness|voice|webcam|interview/i.test(event)),
  ].filter((value) => String(value ?? "").trim() !== "");
  const governanceReviewExists =
    adminDecisionRecorded ||
    auditEvents.some((event) => /governance|review|decision/.test(event)) ||
    decisions.length > 0;
  const trustHistoryExists =
    auditLogs.length > 0 ||
    signalEvents.some((event) => /history|timeline|receipt|replay/.test(event));
  const acceptedEvidenceExists = evidence.some((item) =>
    ["accepted", "clean", "approved"].includes(normalized(item.status ?? item.scan_status))
  );
  const rejectedEvidenceExists = evidence.some((item) =>
    ["rejected", "failed"].includes(normalized(item.status ?? item.scan_status))
  );
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
    reasonCodes.push("Evidence completeness signal");
  }

  if (governanceReviewExists) {
    score += 10;
    reasonCodes.push("Governance review recorded");
  }

  if (verificationCompleted) {
    score += 10;
    reasonCodes.push("Workflow integrity confirmed");
  }

  if (decisionCompletedSignal) {
    score += 5;
    reasonCodes.push("Reviewer action recorded");
  }

  if (provenanceSignals.length) {
    score += 5;
    reasonCodes.push("Provenance signal present");
  }

  if (sessionContinuitySignals.length) {
    score += 5;
    reasonCodes.push("Session continuity signal present");
  }

  if (trustHistoryExists) {
    score += 5;
    reasonCodes.push("Trust history available");
  }

  if (decisionValues.includes("deny")) {
    score -= 20;
  }

  if (rejectedEvidenceExists) {
    score -= 15;
    reasonCodes.push("Evidence rejection signal");
  }

  if (needsMoreEvidence) {
    score -= 10;
    reasonCodes.push("Evidence gap requires review");
  }

  if (manualReviewRequired) {
    score -= 10;
    reasonCodes.push("Human escalation required");
  }

  if (!evidence.length) {
    reasonCodes.push("Evidence missing");
  }

  if (!provenanceSignals.length) {
    reasonCodes.push("Provenance signal unavailable");
  }

  if (!governanceReviewExists) {
    reasonCodes.push("Governance review pending");
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
      "Evidence completeness signal",
      "Governance review recorded",
      "Workflow integrity confirmed",
      "Reviewer action recorded",
      "Provenance signal present",
      "Session continuity signal present",
      "Trust history available",
    ].includes(reason)
  ) {
    return "positive";
  }

  if (
    [
      "Evidence missing",
      "Evidence gap requires review",
      "Provenance signal unavailable",
      "Governance review pending",
    ].includes(reason)
  ) {
    return "warning";
  }

  return "danger";
}
