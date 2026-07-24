import { deterministicUuid } from "../trust-core/hash.ts";
import type {
  ContinuousPolicyAction,
  SignalDrift,
  SignalPolicyDecision,
  TrustSignal,
  TrustSignalSeverity,
} from "./signal-types.ts";

const severityRank: Record<TrustSignalSeverity, number> = {
  INFORMATIONAL: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

const dimensions: Record<TrustSignal["signalType"], string[]> = {
  IDENTITY: ["Identity", "Historical"],
  DOCUMENT: ["Identity", "Documents", "Historical"],
  EMAIL: ["Email", "Identity", "Enterprise"],
  PHONE: ["Phone", "Identity"],
  DEVICE: ["Device", "Behaviour", "Historical"],
  SESSION: ["Behaviour", "Device", "Network"],
  BROWSER: ["Device", "Behaviour"],
  NETWORK: ["Network", "Location", "Behaviour"],
  VPN: ["Network", "Location", "Behaviour"],
  LOCATION: ["Location", "Behaviour", "Historical"],
  BEHAVIOUR: ["Behaviour", "Historical"],
  LIVENESS: ["Identity", "Behaviour", "Provider Confidence"],
  DEEPFAKE: ["Identity", "Behaviour", "Provider Confidence"],
  PROVIDER: ["Provider Confidence", "Historical"],
  ENTERPRISE_POLICY: ["Enterprise", "Historical"],
  MANUAL_REVIEW: ["Historical", "Enterprise"],
  AI_AGENT: ["AI Behaviour", "Enterprise", "Historical"],
  AUTHORITY: ["Enterprise", "Historical", "Provider Confidence"],
  CREDENTIAL: ["Identity", "Enterprise", "Historical"],
  INTEGRATION: ["Enterprise", "Network", "Provider Confidence"],
  SYSTEM: ["Historical", "Provider Confidence"],
};

function text(signal: TrustSignal, key: string) {
  const value = signal.metadata[key];
  return typeof value === "string" ? value.toUpperCase() : "";
}

function number(signal: TrustSignal, key: string) {
  const value = Number(signal.metadata[key]);
  return Number.isFinite(value) ? value : null;
}

function actionFor(severity: TrustSignalSeverity, status: TrustSignal["status"]): ContinuousPolicyAction {
  if (status === "REVOKED") return "REVOKE";
  if (status === "UNAVAILABLE") return severityRank[severity] >= 3 ? "ALERT" : "RECORD_ONLY";
  if (status === "NEGATIVE" && severity === "CRITICAL") return "SUSPEND";
  if (status === "NEGATIVE" && severity === "HIGH") return "RESTRICT";
  if (status === "NEGATIVE" && severity === "MEDIUM") return "STEP_UP_VERIFICATION";
  if (severityRank[severity] >= 3) return "ALERT";
  return severityRank[severity] >= 1 ? "RECALCULATE" : "RECORD_ONLY";
}

function finding(
  signal: TrustSignal,
  driftType: string,
  explanation: string,
  reasonCode: string,
  overrides: Partial<SignalDrift> = {},
): SignalDrift {
  return {
    driftType,
    severity: signal.severity,
    confidence: signal.confidence,
    affectedDimensions: dimensions[signal.signalType],
    previousValue: (signal.metadata.previousValue as string | number | boolean | null | undefined) ?? null,
    currentValue: (signal.metadata.currentValue as string | number | boolean | null | undefined) ?? signal.status,
    recommendedAction: actionFor(signal.severity, signal.status),
    explanation,
    reasonCodes: [reasonCode],
    ...overrides,
  };
}

export function affectedTrustDimensions(signalType: TrustSignal["signalType"]) {
  return dimensions[signalType];
}

export function detectSignalDrift(signal: TrustSignal): SignalDrift[] {
  const change = text(signal, "changeType");
  const findings: SignalDrift[] = [];
  const add = (type: string, explanation: string, code: string, overrides?: Partial<SignalDrift>) =>
    findings.push(finding(signal, type, explanation, code, overrides));

  if (signal.signalType === "DEVICE" && change === "NEW_DEVICE") add("new_device", "A previously unseen device was observed.", "NEW_DEVICE_OBSERVED");
  if (signal.signalType === "DEVICE" && ["FINGERPRINT_CHANGED", "DEVICE_MISMATCH"].includes(change)) add("device_fingerprint_change", "The normalized device fingerprint changed.", "DEVICE_FINGERPRINT_CHANGED");
  if (signal.signalType === "LOCATION" && ["IMPOSSIBLE_TRAVEL", "UNUSUAL_LOCATION", "LOCATION_MISMATCH"].includes(change)) add("location_anomaly", "Location continuity changed beyond the configured rule.", "LOCATION_ANOMALY");
  if (signal.signalType === "VPN" && ["POSITIVE", "INFORMATIONAL"].includes(signal.status)) add("vpn_or_proxy_appearance", "A VPN or proxy signal appeared; this is risk context, not fraud proof.", "VPN_OR_PROXY_APPEARED", { recommendedAction: "WATCH" });
  if (signal.signalType === "EMAIL" && ["CORPORATE_EMAIL_LOST", "DOMAIN_LOST"].includes(change)) add("corporate_email_loss", "Corporate email or domain continuity was lost.", "CORPORATE_EMAIL_LOST");
  if (signal.signalType === "DOCUMENT" && ["EXPIRED", "DOCUMENT_EXPIRED"].includes(change)) add("document_expiration", "A retained document reached its expiry boundary.", "DOCUMENT_EXPIRED");
  if (signal.signalType === "PROVIDER" && ["DEGRADED", "UNAVAILABLE", "TIMEOUT", "LOW_CONFIDENCE"].includes(text(signal, "providerState"))) add("provider_confidence_deterioration", "Provider health or confidence deteriorated without creating negative identity proof.", "PROVIDER_CONFIDENCE_DETERIORATED", { recommendedAction: "ALERT" });
  if (signal.signalType === "LIVENESS" && signal.status === "NEGATIVE") add("failed_liveness", "A liveness evaluation failed.", "LIVENESS_FAILED");
  if (signal.signalType === "DEEPFAKE" && signal.status === "NEGATIVE") add("deepfake_risk", "A deterministic provider signal reported synthetic-media risk.", "DEEPFAKE_RISK_DETECTED");
  if (signal.signalType === "AI_AGENT" && ["ABNORMAL_BEHAVIOUR", "AUTHORITY_CHANGED", "UNEXPECTED_ACTION"].includes(change)) add("abnormal_ai_agent_behaviour", "AI-agent behaviour or authority diverged from retained history.", "AI_AGENT_BEHAVIOUR_CHANGED");
  if (signal.signalType === "CREDENTIAL" && ["ROTATED", "UNEXPECTED_ROTATION"].includes(change)) add("credential_rotation", "Credential lineage changed and requires continuity review.", "CREDENTIAL_ROTATED");
  if (signal.signalType === "AUTHORITY" && ["CHANGED", "REVOKED", "DELEGATION_REVOKED"].includes(change)) add("authority_chain_change", "Authority or delegated permission changed.", "AUTHORITY_CHAIN_CHANGED");
  if (signal.signalType === "ENTERPRISE_POLICY" && ["BREACH", "POLICY_BREACH"].includes(change)) add("enterprise_policy_breach", "An enterprise policy rule was breached.", "ENTERPRISE_POLICY_BREACH");
  if (number(signal, "failureCount") !== null && number(signal, "failureCount")! >= 3) add("repeated_failed_verification", "Repeated failed verification reached the deterministic threshold.", "REPEATED_VERIFICATION_FAILURE");
  if (["SHARED_DEVICE", "SHARED_IDENTIFIER"].includes(change)) add("shared_identifier_pattern", "A shared device or identifier pattern was observed.", "SHARED_IDENTIFIER_PATTERN");
  if (["EVIDENCE_REMOVED", "EVIDENCE_DISAPPEARED"].includes(change)) add("evidence_disappearance", "Current evidence became unavailable without deleting retained history.", "EVIDENCE_DISAPPEARED");
  const previousScore = number(signal, "previousScore");
  const currentScore = number(signal, "currentScore");
  if (previousScore !== null && currentScore !== null && previousScore - currentScore >= 10) add("trust_score_reduction", "The trust score fell by the configured material threshold.", "TRUST_SCORE_REDUCED", { previousValue: previousScore, currentValue: currentScore });
  if (signal.signalType === "BEHAVIOUR" && ["HISTORICAL_MISMATCH", "ABNORMAL"].includes(change)) add("historical_behaviour_mismatch", "Current behaviour mismatched retained historical behaviour.", "HISTORICAL_BEHAVIOUR_MISMATCH");
  return findings;
}

export function evaluateSignalPolicy(
  signal: TrustSignal,
  drift: SignalDrift[],
  policy: { policyId: string; policyVersion: string; severityThreshold?: TrustSignalSeverity; confidenceThreshold?: number } = {
    policyId: "continuous-trust-signal-default",
    policyVersion: "1.0.0",
  },
): SignalPolicyDecision {
  const threshold = severityRank[policy.severityThreshold ?? "MEDIUM"];
  const confident = signal.confidence >= (policy.confidenceThreshold ?? 0.5);
  const material = drift.some((item) => severityRank[item.severity] >= threshold) || signal.status === "REVOKED";
  let action: ContinuousPolicyAction = material && confident
    ? [...drift].sort((a, b) => severityRank[b.severity] - severityRank[a.severity])[0]?.recommendedAction ?? actionFor(signal.severity, signal.status)
    : signal.status === "UNAVAILABLE" ? "RECORD_ONLY" : "RECALCULATE";
  if (signal.signalType === "MANUAL_REVIEW") action = "REQUIRE_MANUAL_REVIEW";
  const reasonCodes = [...new Set([
    material ? "MATERIAL_TRUST_SIGNAL" : "NON_MATERIAL_TRUST_SIGNAL",
    confident ? "SIGNAL_CONFIDENCE_ACCEPTED" : "SIGNAL_CONFIDENCE_BELOW_POLICY",
    ...drift.flatMap((item) => item.reasonCodes),
  ])].sort();
  const affectedDimensions = [...new Set(drift.flatMap((item) => item.affectedDimensions).concat(dimensions[signal.signalType]))].sort();
  return {
    policyDecisionId: deterministicUuid({
      tenantId: signal.tenantId,
      signalId: signal.id,
      policyId: policy.policyId,
      policyVersion: policy.policyVersion,
      action,
      reasonCodes,
    }),
    policyId: policy.policyId,
    policyVersion: policy.policyVersion,
    action,
    reasonCodes,
    affectedDimensions,
    manualReviewRequired: action === "REQUIRE_MANUAL_REVIEW",
    material,
  };
}
