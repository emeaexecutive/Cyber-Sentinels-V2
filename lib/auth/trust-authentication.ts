import type { TrustFreshnessState } from "@/lib/trust-posture/posture";

export type TrustAuthenticationInput = {
  authenticatedUser: boolean;
  verifiedHuman?: boolean;
  verifiedAgent?: boolean;
  authorizedNhi?: boolean;
  activeSessionIntegrity?: boolean;
  permissionScope?: "matched" | "overbroad" | "mismatch" | "unknown";
  trustPosture?: TrustFreshnessState | "unknown";
  trustScore?: number | null;
  threshold?: number;
  governanceLock?: boolean;
};

export function evaluateTrustAuthentication(input: TrustAuthenticationInput) {
  const threshold = input.threshold ?? 65;
  const blocked = !input.authenticatedUser || input.governanceLock === true || input.permissionScope === "mismatch";
  const stepUpRequired = !blocked && (
    input.verifiedHuman === false ||
    input.activeSessionIntegrity === false ||
    (typeof input.trustScore === "number" && input.trustScore < threshold)
  );
  const governanceRequired = !blocked && (
    input.permissionScope === "overbroad" ||
    input.trustPosture === "governance_review" ||
    input.verifiedAgent === false ||
    input.authorizedNhi === false
  );
  const accessAllowed = !blocked && !stepUpRequired && !governanceRequired;
  const reason = blocked
    ? input.authenticatedUser
      ? "Governance lock, permission mismatch or policy block prevents access."
      : "Authenticated user is required."
    : stepUpRequired
      ? "Step-up verification is required before access continues."
      : governanceRequired
        ? "Governance review is required before access continues."
        : "Trust authentication checks passed.";

  return {
    access_allowed: accessAllowed,
    step_up_required: stepUpRequired,
    governance_required: governanceRequired,
    blocked,
    reason,
    replay_event_required: blocked || stepUpRequired || governanceRequired,
  };
}
