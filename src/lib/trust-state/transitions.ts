import type { TrustState } from "./types.ts";

const transitions: Record<TrustState, readonly TrustState[]> = {
  UNKNOWN: ["UNKNOWN", "OBSERVED", "INCONCLUSIVE", "TRUSTED", "VERIFIED", "CHALLENGED", "BLOCKED", "REVOKED", "EXPIRED"],
  OBSERVED: ["OBSERVED", "INCONCLUSIVE", "TRUSTED", "VERIFIED", "CHALLENGED", "BLOCKED", "REVOKED", "EXPIRED"],
  INCONCLUSIVE: ["OBSERVED", "INCONCLUSIVE", "TRUSTED", "VERIFIED", "CHALLENGED", "BLOCKED", "REVOKED", "EXPIRED"],
  TRUSTED: ["INCONCLUSIVE", "TRUSTED", "VERIFIED", "CHALLENGED", "BLOCKED", "REVOKED", "EXPIRED"],
  VERIFIED: ["INCONCLUSIVE", "TRUSTED", "VERIFIED", "CHALLENGED", "BLOCKED", "REVOKED", "EXPIRED"],
  CHALLENGED: ["OBSERVED", "INCONCLUSIVE", "TRUSTED", "VERIFIED", "CHALLENGED", "BLOCKED", "REVOKED", "EXPIRED"],
  BLOCKED: ["BLOCKED", "REVOKED"],
  REVOKED: ["REVOKED"],
  EXPIRED: ["OBSERVED", "INCONCLUSIVE", "TRUSTED", "VERIFIED", "CHALLENGED", "BLOCKED", "REVOKED", "EXPIRED"],
};

export function canTransition(priorState: TrustState, nextState: TrustState, allowRecoveryFromBlocked = false): boolean {
  if (priorState === "BLOCKED" && allowRecoveryFromBlocked && ["OBSERVED", "INCONCLUSIVE", "CHALLENGED"].includes(nextState)) return true;
  return transitions[priorState].includes(nextState);
}

export function assertTransition(priorState: TrustState, nextState: TrustState, allowRecoveryFromBlocked = false): void {
  if (!canTransition(priorState, nextState, allowRecoveryFromBlocked)) throw Object.assign(new Error(`Trust transition ${priorState} -> ${nextState} is not permitted.`), { code: priorState === "REVOKED" ? "REVOKED_STATE_IRREVERSIBLE" : "INVALID_STATE_TRANSITION" });
}
