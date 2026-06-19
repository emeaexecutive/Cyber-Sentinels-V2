export const sessionSignalCategories = [
  "liveness_check",
  "deepfake_risk",
  "injection_risk",
  "device_channel_integrity",
  "session_anomaly",
  "manual_review_required",
] as const;

export type SessionSignalCategory = (typeof sessionSignalCategories)[number];
export type SessionSignalRisk = "low" | "medium" | "high" | "unknown";
export type SessionSignalStatus =
  | "confirmed"
  | "verified"
  | "clear"
  | "elevated"
  | "failed"
  | "pending"
  | "required";

export type SessionIntegrityInput = {
  session_id?: string;
  identity_verification_state?: string;
  liveness_state?: string;
  deepfake_risk_score?: number;
  injection_risk_score?: number;
  channel_integrity_state?: string;
  session_anomaly_score?: number;
  manual_review_required?: boolean;
  evidence_source?: string;
  evidence_metadata?: Record<string, unknown>;
};

export type ExplainableSessionSignal = {
  category: SessionSignalCategory;
  label: string;
  status: SessionSignalStatus;
  risk_level: SessionSignalRisk;
  confidence_score: number | null;
  explanation: string;
  badge: string;
  requires_manual_review: boolean;
};

function cleanState(value: unknown, fallback = "pending") {
  if (typeof value !== "string") return fallback;
  return value.trim().toLowerCase().replaceAll(" ", "_").slice(0, 60) || fallback;
}

function boundedScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function riskFromScore(score: number | null): SessionSignalRisk {
  if (score === null) return "unknown";
  if (score >= 70) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function riskStatus(score: number | null): SessionSignalStatus {
  if (score === null) return "pending";
  return score >= 35 ? "elevated" : "clear";
}

export function normalizeSessionIntegrityInput(
  body: Record<string, unknown>
): SessionIntegrityInput {
  const metadata =
    body.evidence_metadata &&
    typeof body.evidence_metadata === "object" &&
    !Array.isArray(body.evidence_metadata)
      ? (body.evidence_metadata as Record<string, unknown>)
      : {};

  return {
    session_id: typeof body.session_id === "string" ? body.session_id.trim() : "",
    identity_verification_state: cleanState(body.identity_verification_state),
    liveness_state: cleanState(body.liveness_state),
    deepfake_risk_score: boundedScore(body.deepfake_risk_score) ?? undefined,
    injection_risk_score: boundedScore(body.injection_risk_score) ?? undefined,
    channel_integrity_state: cleanState(body.channel_integrity_state),
    session_anomaly_score: boundedScore(body.session_anomaly_score) ?? undefined,
    manual_review_required: body.manual_review_required === true,
    evidence_source:
      typeof body.evidence_source === "string"
        ? body.evidence_source.trim().slice(0, 120)
        : "operator_input",
    evidence_metadata: metadata,
  };
}

export function evaluateSessionIntegrity(input: SessionIntegrityInput) {
  const liveness = cleanState(input.liveness_state);
  const channel = cleanState(input.channel_integrity_state);
  const deepfakeScore = boundedScore(input.deepfake_risk_score);
  const injectionScore = boundedScore(input.injection_risk_score);
  const anomalyScore = boundedScore(input.session_anomaly_score);

  const livenessConfirmed = ["confirmed", "passed", "live_presence_confirmed"].includes(liveness);
  const livenessFailed = ["failed", "not_confirmed"].includes(liveness);
  const channelVerified = ["verified", "passed", "intact"].includes(channel);
  const channelFailed = ["failed", "compromised", "untrusted"].includes(channel);
  const riskRequiresReview = [deepfakeScore, injectionScore, anomalyScore].some(
    (score) => score !== null && score >= 35
  );
  const manualReview = Boolean(
    input.manual_review_required ||
      livenessFailed ||
      channelFailed ||
      riskRequiresReview
  );

  const signals: ExplainableSessionSignal[] = [
    {
      category: "liveness_check",
      label: "Liveness check",
      status: livenessConfirmed ? "confirmed" : livenessFailed ? "failed" : "pending",
      risk_level: livenessFailed ? "high" : livenessConfirmed ? "low" : "unknown",
      confidence_score: null,
      explanation: livenessConfirmed
        ? "Live presence was observed for this check. Liveness is one signal and does not establish identity or overall trust by itself."
        : livenessFailed
          ? "Live presence was not confirmed. This result requires review alongside identity and channel evidence."
          : "The liveness check is pending or unavailable; no trust conclusion should be drawn.",
      badge: livenessConfirmed ? "Live Presence Confirmed" : "Session Review Pending",
      requires_manual_review: livenessFailed,
    },
    {
      category: "deepfake_risk",
      label: "Deepfake risk",
      status: riskStatus(deepfakeScore),
      risk_level: riskFromScore(deepfakeScore),
      confidence_score: deepfakeScore,
      explanation:
        deepfakeScore === null
          ? "Deepfake risk has not been assessed. No authenticity claim is made."
          : "This is a risk indicator for human review, not proof that media is authentic or synthetic.",
      badge: deepfakeScore !== null && deepfakeScore >= 35 ? "Deepfake Risk" : "Session Review Pending",
      requires_manual_review: deepfakeScore !== null && deepfakeScore >= 35,
    },
    {
      category: "injection_risk",
      label: "Injection risk",
      status: riskStatus(injectionScore),
      risk_level: riskFromScore(injectionScore),
      confidence_score: injectionScore,
      explanation:
        injectionScore === null
          ? "Injection risk has not been assessed for this media path."
          : "This flag indicates possible virtual-camera, replay, or media-injection risk and must be reviewed with channel evidence.",
      badge: injectionScore !== null && injectionScore >= 35 ? "Injection Risk" : "Session Review Pending",
      requires_manual_review: injectionScore !== null && injectionScore >= 35,
    },
    {
      category: "device_channel_integrity",
      label: "Device and channel integrity",
      status: channelVerified ? "verified" : channelFailed ? "failed" : "pending",
      risk_level: channelFailed ? "high" : channelVerified ? "low" : "unknown",
      confidence_score: null,
      explanation: channelVerified
        ? "Available device and channel evidence passed the configured integrity checks. It remains one part of the wider verification review."
        : channelFailed
          ? "The device or media channel did not pass an integrity check. Candidate identity may still be verified, but the session requires review."
          : "Device and channel integrity evidence is pending or incomplete.",
      badge: channelVerified ? "Channel Integrity Verified" : channelFailed ? "Channel Integrity Failed" : "Session Review Pending",
      requires_manual_review: channelFailed,
    },
    {
      category: "session_anomaly",
      label: "Session anomaly risk",
      status: riskStatus(anomalyScore),
      risk_level: riskFromScore(anomalyScore),
      confidence_score: anomalyScore,
      explanation:
        anomalyScore === null
          ? "No session anomaly assessment is available."
          : "This score summarizes reviewable session anomalies without profiling behavior or making an automated decision.",
      badge: anomalyScore !== null && anomalyScore >= 35 ? "Manual Review Required" : "Session Review Pending",
      requires_manual_review: anomalyScore !== null && anomalyScore >= 35,
    },
    {
      category: "manual_review_required",
      label: "Human review decision",
      status: manualReview ? "required" : "pending",
      risk_level: manualReview ? "medium" : "unknown",
      confidence_score: null,
      explanation: manualReview
        ? "One or more verification flags require a named human reviewer before the workflow proceeds."
        : "No automatic approval is issued. A reviewer may still request more evidence or keep the session pending.",
      badge: manualReview ? "Manual Review Required" : "Session Review Pending",
      requires_manual_review: manualReview,
    },
  ];

  const overall_status = manualReview
    ? "needs_review"
    : livenessConfirmed && channelVerified
      ? "reviewable"
      : "pending";

  return {
    overall_status,
    manual_review_required: manualReview,
    signals,
    summary:
      "Liveness, deepfake risk, injection risk, channel integrity, and session anomaly risk are separate explainable signals. No single signal proves identity or trust.",
  };
}

