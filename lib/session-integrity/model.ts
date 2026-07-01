export const sessionSignalCategories = [
  "liveness_check",
  "deepfake_risk",
  "injection_risk",
  "device_channel_integrity",
  "session_anomaly",
  "manual_review_required",
  "ip_location_change",
  "vpn_anomaly",
  "device_continuity",
  "browser_consistency",
  "provider_verification_change",
  "session_interruption",
  "workflow_inconsistency",
  "virtual_camera_risk",
  "frame_integrity",
  "device_attestation",
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
  ip_location_changed?: boolean;
  vpn_anomaly?: boolean;
  device_continuity_state?: string;
  browser_consistency_state?: string;
  provider_verification_changed?: boolean;
  session_interrupted?: boolean;
  workflow_inconsistency_score?: number;
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
    ip_location_changed: body.ip_location_changed === true,
    vpn_anomaly: body.vpn_anomaly === true,
    device_continuity_state: cleanState(body.device_continuity_state),
    browser_consistency_state: cleanState(body.browser_consistency_state),
    provider_verification_changed: body.provider_verification_changed === true,
    session_interrupted: body.session_interrupted === true,
    workflow_inconsistency_score: boundedScore(body.workflow_inconsistency_score) ?? undefined,
  };
}

export function evaluateSessionIntegrity(input: SessionIntegrityInput) {
  const liveness = cleanState(input.liveness_state);
  const channel = cleanState(input.channel_integrity_state);
  const deepfakeScore = boundedScore(input.deepfake_risk_score);
  const injectionScore = boundedScore(input.injection_risk_score);
  const anomalyScore = boundedScore(input.session_anomaly_score);
  const workflowInconsistency = boundedScore(input.workflow_inconsistency_score);
  const virtualCameraState = cleanState(input.evidence_metadata?.virtual_camera_risk);
  const frameIntegrityState = cleanState(input.evidence_metadata?.frame_integrity);
  const deviceAttestationState = cleanState(input.evidence_metadata?.device_attestation);
  const deviceContinuous = ["continuous", "consistent", "verified"].includes(cleanState(input.device_continuity_state));
  const browserConsistent = ["consistent", "verified"].includes(cleanState(input.browser_consistency_state));

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
      || input.ip_location_changed
      || input.vpn_anomaly
      || input.provider_verification_changed
      || input.session_interrupted
      || (workflowInconsistency !== null && workflowInconsistency >= 35)
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
      category: "ip_location_change",
      label: "IP and location continuity",
      status: input.ip_location_changed ? "elevated" : "clear",
      risk_level: input.ip_location_changed ? "medium" : "low",
      confidence_score: null,
      explanation: input.ip_location_changed
        ? "Network location changed during the workflow. This is a reviewable continuity signal, not proof of misuse."
        : "No IP or location continuity change was reported.",
      badge: input.ip_location_changed ? "Location Change" : "Continuity Clear",
      requires_manual_review: Boolean(input.ip_location_changed),
    },
    {
      category: "vpn_anomaly",
      label: "VPN anomaly",
      status: input.vpn_anomaly ? "elevated" : "clear",
      risk_level: input.vpn_anomaly ? "medium" : "low",
      confidence_score: null,
      explanation: input.vpn_anomaly
        ? "Network routing changed in a way that requires workflow review. VPN use alone does not establish malicious intent."
        : "No VPN routing anomaly was reported.",
      badge: input.vpn_anomaly ? "VPN Anomaly" : "Network Clear",
      requires_manual_review: Boolean(input.vpn_anomaly),
    },
    {
      category: "device_continuity",
      label: "Device continuity",
      status: deviceContinuous ? "verified" : "pending",
      risk_level: deviceContinuous ? "low" : "unknown",
      confidence_score: null,
      explanation: deviceContinuous ? "Device continuity remained consistent." : "Device continuity is pending or changed and should be reviewed with other evidence.",
      badge: deviceContinuous ? "Device Continuous" : "Device Review Pending",
      requires_manual_review: false,
    },
    {
      category: "browser_consistency",
      label: "Browser consistency",
      status: browserConsistent ? "verified" : "pending",
      risk_level: browserConsistent ? "low" : "unknown",
      confidence_score: null,
      explanation: browserConsistent ? "Browser context remained consistent." : "Browser consistency evidence is incomplete or changed.",
      badge: browserConsistent ? "Browser Consistent" : "Browser Review Pending",
      requires_manual_review: false,
    },
    {
      category: "provider_verification_change",
      label: "Provider verification continuity",
      status: input.provider_verification_changed ? "elevated" : "clear",
      risk_level: input.provider_verification_changed ? "medium" : "low",
      confidence_score: null,
      explanation: input.provider_verification_changed ? "Provider verification state changed during the workflow and must remain visible in replay." : "Provider verification state remained continuous.",
      badge: input.provider_verification_changed ? "Provider State Changed" : "Provider State Continuous",
      requires_manual_review: Boolean(input.provider_verification_changed),
    },
    {
      category: "session_interruption",
      label: "Session interruption",
      status: input.session_interrupted ? "elevated" : "clear",
      risk_level: input.session_interrupted ? "medium" : "low",
      confidence_score: null,
      explanation: input.session_interrupted ? "The session was interrupted; authorization and device continuity require review before resumption." : "No session interruption was reported.",
      badge: input.session_interrupted ? "Session Interrupted" : "Session Continuous",
      requires_manual_review: Boolean(input.session_interrupted),
    },
    {
      category: "workflow_inconsistency",
      label: "Workflow inconsistency",
      status: riskStatus(workflowInconsistency),
      risk_level: riskFromScore(workflowInconsistency),
      confidence_score: workflowInconsistency,
      explanation: workflowInconsistency === null ? "No workflow inconsistency assessment is available." : "This rule-based signal identifies divergence from the expected workflow sequence for governance review.",
      badge: workflowInconsistency !== null && workflowInconsistency >= 35 ? "Workflow Inconsistency" : "Workflow Review Pending",
      requires_manual_review: workflowInconsistency !== null && workflowInconsistency >= 35,
    },
    {
      category: "virtual_camera_risk",
      label: "Virtual camera risk",
      status: "pending",
      risk_level: "unknown",
      confidence_score: null,
      explanation: virtualCameraState === "pending"
        ? "Placeholder only. No configured provider currently supplies a virtual-camera risk result."
        : `Provider-supplied placeholder state recorded as ${virtualCameraState}; independent validation is still required.`,
      badge: "Provider Signal Pending",
      requires_manual_review: false,
    },
    {
      category: "frame_integrity",
      label: "Frame integrity",
      status: "pending",
      risk_level: "unknown",
      confidence_score: null,
      explanation: frameIntegrityState === "pending"
        ? "Placeholder only. Frame-integrity validation requires a configured provider and retained evidence reference."
        : `Provider-supplied placeholder state recorded as ${frameIntegrityState}; independent validation is still required.`,
      badge: "Provider Signal Pending",
      requires_manual_review: false,
    },
    {
      category: "device_attestation",
      label: "Device attestation",
      status: "pending",
      risk_level: "unknown",
      confidence_score: null,
      explanation: deviceAttestationState === "pending"
        ? "Placeholder only. No device-attestation credential is configured for this workflow."
        : `Provider-supplied placeholder state recorded as ${deviceAttestationState}; credential validation is still required.`,
      badge: "Provider Credential Pending",
      requires_manual_review: false,
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

