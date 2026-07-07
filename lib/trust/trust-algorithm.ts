import type { DetectionSource } from "@/lib/detection/detection-engine";
import { evaluateTrustDecision, type TrustDecision } from "@/lib/trust/decision-engine";

export type TrustAlgorithmDecision = TrustDecision;

export type TrustAlgorithmInput = {
  identityConfidence?: number | null;
  proofOfHuman?: "verified" | "failed" | "unknown" | null;
  agentIdentity?: "verified" | "unverified" | "unknown" | null;
  nhiOwnership?: "known" | "orphaned" | "unknown" | null;
  sessionIntegrity?: number | null;
  injectionRisk?: number | null;
  deviceChannelIntegrity?: number | null;
  provenanceConfidence?: number | null;
  documentRisk?: number | null;
  intentRisk?: number | null;
  runtimeBehavior?: number | null;
  providerSignals?: number | null;
  heuristicBaseline?: number | null;
  previousTrustPosture?: "fresh" | "checkpoint" | "reverification_due" | "governance_review" | null;
  governanceHistory?: Array<"approved" | "review" | "escalated" | "blocked">;
  reviewerOutcome?: "allow" | "review" | "escalate" | "block" | null;
  evidenceRefs?: string[];
  sourceLabels?: DetectionSource[];
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function confidenceToScore(value: number | null | undefined, fallback = 0.5) {
  return typeof value === "number" && Number.isFinite(value) ? clamp01(value) : fallback;
}

function riskToConfidence(value: number | null | undefined, fallback = 0.5) {
  return typeof value === "number" && Number.isFinite(value) ? 1 - clamp01(value) : fallback;
}

export function runTrustAlgorithm(input: TrustAlgorithmInput) {
  const identity = confidenceToScore(input.identityConfidence);
  const session = confidenceToScore(input.sessionIntegrity);
  const device = confidenceToScore(input.deviceChannelIntegrity);
  const provenance = confidenceToScore(input.provenanceConfidence);
  const provider = confidenceToScore(input.providerSignals, input.providerSignals == null ? 0.45 : 0.5);
  const heuristic = confidenceToScore(input.heuristicBaseline, 0.65);
  const injection = riskToConfidence(input.injectionRisk);
  const document = riskToConfidence(input.documentRisk);
  const intent = riskToConfidence(input.intentRisk == null ? null : input.intentRisk / 100);
  const runtime = riskToConfidence(input.runtimeBehavior);
  const governancePenalty = (input.governanceHistory ?? []).includes("blocked")
    ? 0.25
    : (input.governanceHistory ?? []).includes("escalated")
      ? 0.12
      : input.previousTrustPosture === "governance_review"
        ? 0.1
        : 0;
  const rawScore =
    (identity * 0.14 +
      session * 0.12 +
      device * 0.1 +
      provenance * 0.09 +
      provider * 0.1 +
      heuristic * 0.12 +
      injection * 0.08 +
      document * 0.07 +
      intent * 0.1 +
      runtime * 0.08 -
      governancePenalty) *
    100;
  const trustScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const confidenceBand = trustScore >= 80 ? "high" : trustScore >= 55 ? "medium" : "low";
  const trustLevel =
    trustScore >= 80
      ? "trusted"
      : trustScore >= 65
        ? "reviewable"
        : trustScore >= 45
          ? "elevated"
          : "restricted";
  const sourceLabels = input.sourceLabels?.length
    ? input.sourceLabels
    : ([
        input.providerSignals == null ? "Awaiting Credentials" : "Provider API",
        "Heuristic Baseline",
        "Runtime Intelligence",
        "Governance Review",
      ] as DetectionSource[]);
  const decisionResult = evaluateTrustDecision({
    identityConfidence: identity,
    agentOwnership: input.nhiOwnership === "orphaned" ? "orphaned" : input.agentIdentity === "verified" || input.nhiOwnership === "known" ? "known" : "unknown",
    humanAuthority: input.proofOfHuman === "failed" ? "missing" : "active",
    proofOfHuman: input.proofOfHuman ?? "unknown",
    intentRisk: input.intentRisk,
    permissionScope: input.intentRisk != null && input.intentRisk > 80 ? "mismatch" : input.intentRisk != null && input.intentRisk > 55 ? "overbroad" : "matched",
    sessionIntegrity: session,
    provenanceConfidence: provenance,
    providerSignals: input.providerSignals,
    heuristicBaseline: heuristic,
    runtimeAnomalies: input.runtimeBehavior,
    governanceHistory: input.governanceHistory,
    sourceLabels,
  });
  const reviewerDecision = input.reviewerOutcome;
  const decision: TrustAlgorithmDecision = reviewerDecision ?? decisionResult.decision;
  const nextAction: Record<TrustAlgorithmDecision, string> = {
    allow: "Continue workflow and issue an evidence receipt.",
    step_up: "Require stronger verification before execution continues.",
    review: "Open governance review with preserved evidence.",
    escalate: "Route to high-risk governance queue.",
    block: "Block action while preserving evidence and replay context.",
    insufficient_evidence: "Pause workflow and request more evidence.",
    "insufficient evidence": "Pause workflow and request more evidence.",
  };

  return {
    trust_score: trustScore,
    trust_level: trustLevel,
    confidence_band: confidenceBand,
    decision,
    reasons: [decisionResult.reason, reviewerDecision ? "Reviewer outcome overrode algorithm recommendation." : "Algorithm recommendation retained."],
    evidence_refs: [...(input.evidenceRefs ?? [])],
    source_labels: sourceLabels,
    limitations: [
      "ML/provider output is one signal, not autonomous certainty.",
      "The algorithm must not return confirmed fake without provider/model and governance evidence.",
      "Trust score is workflow posture, not a universal identity score.",
      ...decisionResult.limitations,
    ],
    next_action: nextAction[decision],
  };
}
