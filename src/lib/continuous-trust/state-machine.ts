import { canTransition } from "../trust-state/transitions.ts";
import type { TrustState } from "../trust-state/types.ts";
import type { ContinuousPolicyAction } from "./signal-types.ts";

export type StateTransitionProposal = {
  previousState: TrustState;
  newState: TrustState;
  reasonCodes: string[];
  triggeringSignals: string[];
  policyId: string;
  actor: string;
  confidence: number;
  timestamp: string;
  manualOverride: boolean;
};

export function stateForPolicyAction(action: ContinuousPolicyAction, current: TrustState): TrustState {
  if (action === "REVOKE") return "REVOKED";
  if (["RESTRICT", "SUSPEND"].includes(action)) return "BLOCKED";
  if (["WATCH", "STEP_UP_VERIFICATION", "REQUIRE_MANUAL_REVIEW"].includes(action)) return "CHALLENGED";
  return current;
}
export function validateStateTransition(proposal: StateTransitionProposal, allowRecoveryFromBlocked = false) {
  if (!proposal.reasonCodes.length || !proposal.triggeringSignals.length || !proposal.actor.trim()) {
    throw Object.assign(new Error("Every transition requires reasons, triggering signals, and an actor."), { code: "TRANSITION_CONTEXT_REQUIRED" });
  }
  if (!Number.isFinite(proposal.confidence) || proposal.confidence < 0 || proposal.confidence > 1) {
    throw Object.assign(new Error("Transition confidence must be between 0 and 1."), { code: "TRANSITION_CONFIDENCE_INVALID" });
  }
  if (!canTransition(proposal.previousState, proposal.newState, allowRecoveryFromBlocked)) {
    throw Object.assign(new Error(`Trust transition ${proposal.previousState} -> ${proposal.newState} is not permitted.`), { code: "INVALID_STATE_TRANSITION" });
  }
  return proposal;
}
