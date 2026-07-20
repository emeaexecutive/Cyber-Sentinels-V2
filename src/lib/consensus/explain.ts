import type { ConsensusDecision } from "./types.ts";

export function explainConsensusDecision(decision: ConsensusDecision) {
  return {
    summary: `${decision.state} at confidence ${decision.confidence}/100 under ${decision.policyId}@${decision.policyVersion}.`,
    contributors: decision.evidence.filter((item) => item.included && item.effectiveWeight !== 0),
    ignored: decision.evidence.filter((item) => !item.included || item.ignoredReason),
    conflicts: decision.conflicts,
    thresholds: decision.thresholds,
    reasonCodes: decision.reasonCodes,
    lineage: { decisionHash: decision.decisionHash, evidenceSnapshotHash: decision.evidenceSnapshotHash, priorDecisionId: decision.priorDecisionId },
    boundary: "Confidence is a deterministic policy score, not probability, certainty, identity ownership, or a legal conclusion.",
  };
}
