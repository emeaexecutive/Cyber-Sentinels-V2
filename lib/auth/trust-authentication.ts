import type { TrustFreshnessState } from "@/lib/trust-posture/posture";
import type { GeoSessionIntelligence } from "@/lib/runtime/geo-session-intelligence";

export type TrustAuthenticationInput = {
  authenticatedUser: boolean;
  verifiedEmail?: boolean;
  verifiedPhoneOrMfa?: boolean;
  verifiedHuman?: boolean;
  verifiedAgent?: boolean;
  authorizedNhi?: boolean;
  activeSessionIntegrity?: boolean;
  geoConsistency?: boolean;
  deviceContinuity?: boolean;
  geoSession?: GeoSessionIntelligence | null;
  permissionScope?: "matched" | "overbroad" | "mismatch" | "unknown";
  trustPosture?: TrustFreshnessState | "unknown";
  trustScore?: number | null;
  riskPosture?: "low" | "medium" | "high" | "critical" | "unknown";
  threshold?: number;
  governanceLock?: boolean;
};

export type TrustAuthenticationDecision = "allow" | "step_up" | "review" | "block";

export function evaluateTrustAuthentication(input: TrustAuthenticationInput) {
  const threshold = input.threshold ?? 65;
  const verifiedEmail = input.verifiedEmail ?? true;
  const verifiedPhoneOrMfa = input.verifiedPhoneOrMfa ?? false;
  const geoConsistent = input.geoConsistency ?? !input.geoSession?.geo_mismatch;
  const deviceContinuous = input.deviceContinuity ?? !input.geoSession?.new_device;
  const riskPosture = input.riskPosture ?? "unknown";
  const hardBlock =
    !input.authenticatedUser ||
    input.governanceLock === true ||
    input.permissionScope === "mismatch" ||
    input.geoSession?.decision === "block" ||
    riskPosture === "critical";
  const stepUpRequired = !hardBlock && (
    !verifiedEmail ||
    !verifiedPhoneOrMfa ||
    input.verifiedHuman === false ||
    input.activeSessionIntegrity === false ||
    geoConsistent === false ||
    deviceContinuous === false ||
    input.geoSession?.decision === "step_up" ||
    (typeof input.trustScore === "number" && input.trustScore < threshold)
  );
  const governanceRequired = !hardBlock && !stepUpRequired && (
    input.permissionScope === "overbroad" ||
    input.trustPosture === "governance_review" ||
    input.trustPosture === "reverification_due" ||
    input.geoSession?.decision === "review" ||
    riskPosture === "high" ||
    input.verifiedAgent === false ||
    input.authorizedNhi === false
  );
  const decision: TrustAuthenticationDecision = hardBlock
    ? "block"
    : stepUpRequired
      ? "step_up"
      : governanceRequired
        ? "review"
        : "allow";
  const accessAllowed = decision === "allow";
  const reason = hardBlock
    ? input.authenticatedUser
      ? "Governance lock, permission mismatch or policy block prevents access."
      : "Authenticated user is required."
    : stepUpRequired
      ? "Step-up verification is required before access continues."
      : governanceRequired
        ? "Governance review is required before access continues."
        : "Trust authentication checks passed.";

  return {
    decision,
    access_allowed: accessAllowed,
    step_up_required: stepUpRequired,
    governance_required: governanceRequired,
    blocked: hardBlock,
    reason,
    trust_inputs: {
      authenticated_user: input.authenticatedUser,
      verified_email: verifiedEmail,
      verified_phone_or_mfa: verifiedPhoneOrMfa,
      trust_posture: input.trustPosture ?? "unknown",
      trust_score: input.trustScore ?? null,
      risk_posture: riskPosture,
      geo_consistency: geoConsistent,
      device_continuity: deviceContinuous,
      session_integrity: input.activeSessionIntegrity ?? null,
      governance_lock: input.governanceLock === true,
    },
    source_labels: ["Heuristic Baseline", "Runtime Intelligence"] as const,
    replay_event_required: decision !== "allow",
  };
}
