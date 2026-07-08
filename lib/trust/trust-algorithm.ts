import type { DetectionSource } from "@/lib/detection/detection-engine";
import { evaluateTrustDecision, type TrustDecision } from "@/lib/trust/decision-engine";

export type TrustAlgorithmDecision = TrustDecision;

export type TrustAlgorithmTuning = {
  identityWeight: number;
  sessionIntegrityWeight: number;
  deviceChannelWeight: number;
  provenanceWeight: number;
  providerWeight: number;
  heuristicWeight: number;
  injectionWeight: number;
  documentWeight: number;
  intentWeight: number;
  agentRuntimeWeight: number;
  reviewerOverrideWeight: number;
  confidenceThreshold: number;
  escalationThreshold: number;
  restrictionThreshold: number;
  decayCheckpointDays: number;
  decayReverificationDays: number;
  decayCheckpointPenalty: number;
  decayReverificationPenalty: number;
};

export const trustAlgorithmTuningDefaults: TrustAlgorithmTuning = {
  identityWeight: 0.14,
  sessionIntegrityWeight: 0.12,
  deviceChannelWeight: 0.1,
  provenanceWeight: 0.09,
  providerWeight: 0.1,
  heuristicWeight: 0.12,
  injectionWeight: 0.08,
  documentWeight: 0.07,
  intentWeight: 0.1,
  agentRuntimeWeight: 0.08,
  reviewerOverrideWeight: 1,
  confidenceThreshold: 80,
  escalationThreshold: 65,
  restrictionThreshold: 45,
  decayCheckpointDays: 45,
  decayReverificationDays: 90,
  decayCheckpointPenalty: 0.08,
  decayReverificationPenalty: 0.16,
};

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
  evidenceLastSeenAt?: string | null;
  now?: Date;
  sourceLabels?: DetectionSource[];
  tuning?: Partial<TrustAlgorithmTuning>;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const dayMs = 24 * 60 * 60 * 1000;

function confidenceToScore(value: number | null | undefined, fallback = 0.5) {
  return typeof value === "number" && Number.isFinite(value) ? clamp01(value) : fallback;
}

function riskToConfidence(value: number | null | undefined, fallback = 0.5) {
  return typeof value === "number" && Number.isFinite(value) ? 1 - clamp01(value) : fallback;
}

function evidenceAgeDays(input: Pick<TrustAlgorithmInput, "evidenceLastSeenAt" | "now">) {
  if (!input.evidenceLastSeenAt) return null;
  const lastSeen = new Date(input.evidenceLastSeenAt);
  if (Number.isNaN(lastSeen.getTime())) return null;
  const now = input.now ?? new Date();
  return Math.max(0, Math.floor((now.getTime() - lastSeen.getTime()) / dayMs));
}

export function runTrustAlgorithm(input: TrustAlgorithmInput) {
  const tuning = { ...trustAlgorithmTuningDefaults, ...(input.tuning ?? {}) };
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
  const ageDays = evidenceAgeDays(input);
  const trustDecayPenalty =
    input.previousTrustPosture === "reverification_due" || (ageDays !== null && ageDays >= tuning.decayReverificationDays)
      ? tuning.decayReverificationPenalty
      : input.previousTrustPosture === "checkpoint" || (ageDays !== null && ageDays >= tuning.decayCheckpointDays)
        ? tuning.decayCheckpointPenalty
        : 0;
  const governanceWeight = (input.governanceHistory ?? []).includes("blocked")
    ? 0.25
    : (input.governanceHistory ?? []).includes("escalated")
      ? 0.12
      : input.previousTrustPosture === "governance_review"
        ? 0.1
        : 0;
  const runtimePostureShift =
    (input.runtimeBehavior ?? 0) >= 0.75 || (input.injectionRisk ?? 0) >= 0.75
      ? "critical_runtime_shift"
      : (input.runtimeBehavior ?? 0) >= 0.45 || input.previousTrustPosture === "checkpoint"
        ? "review_checkpoint"
        : trustDecayPenalty > 0
          ? "decaying_evidence"
          : "stable";
  const signalWeights = {
    identity: Number((identity * tuning.identityWeight).toFixed(3)),
    session: Number((session * tuning.sessionIntegrityWeight).toFixed(3)),
    device: Number((device * tuning.deviceChannelWeight).toFixed(3)),
    provenance: Number((provenance * tuning.provenanceWeight).toFixed(3)),
    provider: Number((provider * tuning.providerWeight).toFixed(3)),
    heuristic: Number((heuristic * tuning.heuristicWeight).toFixed(3)),
    injection: Number((injection * tuning.injectionWeight).toFixed(3)),
    document: Number((document * tuning.documentWeight).toFixed(3)),
    intent: Number((intent * tuning.intentWeight).toFixed(3)),
    runtime: Number((runtime * tuning.agentRuntimeWeight).toFixed(3)),
    governancePenalty: Number(governanceWeight.toFixed(3)),
    trustDecayPenalty: Number(trustDecayPenalty.toFixed(3)),
    reviewerOverride: Number((input.reviewerOutcome ? tuning.reviewerOverrideWeight : 0).toFixed(3)),
  };
  const rawScore =
    (identity * tuning.identityWeight +
      session * tuning.sessionIntegrityWeight +
      device * tuning.deviceChannelWeight +
      provenance * tuning.provenanceWeight +
      provider * tuning.providerWeight +
      heuristic * tuning.heuristicWeight +
      injection * tuning.injectionWeight +
      document * tuning.documentWeight +
      intent * tuning.intentWeight +
      runtime * tuning.agentRuntimeWeight -
      governanceWeight -
      trustDecayPenalty) *
    100;
  const trustScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const confidenceBand = trustScore >= tuning.confidenceThreshold ? "high" : trustScore >= 55 ? "medium" : "low";
  const trustLevel =
    trustScore >= tuning.confidenceThreshold
      ? "trusted"
      : trustScore >= tuning.escalationThreshold
        ? "reviewable"
        : trustScore >= tuning.restrictionThreshold
          ? "elevated"
          : "restricted";
  const sourceLabels = input.sourceLabels?.length
    ? input.sourceLabels
    : ([
        input.providerSignals == null ? "Awaiting Credentials" : "Provider API",
        "Heuristic Baseline",
        "Runtime Intelligence",
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
  const decayDecision: TrustAlgorithmDecision =
    trustDecayPenalty >= 0.16 && decisionResult.decision === "allow"
      ? "step_up"
      : runtimePostureShift === "critical_runtime_shift" && ["allow", "review"].includes(decisionResult.decision)
        ? "escalate"
        : decisionResult.decision;
  const decision: TrustAlgorithmDecision = reviewerDecision ?? decayDecision;
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
    reasons: [
      decisionResult.reason,
      reviewerDecision ? "Reviewer outcome overrode algorithm recommendation." : "Algorithm recommendation retained.",
      trustDecayPenalty > 0 ? `Trust decay applied from ${ageDays ?? "unknown"} day evidence age or posture state.` : "No trust decay penalty applied.",
      runtimePostureShift !== "stable" ? `Runtime posture shift: ${runtimePostureShift}.` : "Runtime posture remained stable.",
    ],
    evidence_refs: [...(input.evidenceRefs ?? [])],
    source_labels: sourceLabels,
    signal_weights: signalWeights,
    trust_decay: {
      age_days: ageDays,
      penalty: Number(trustDecayPenalty.toFixed(3)),
      posture_input: input.previousTrustPosture ?? "fresh",
      reason: trustDecayPenalty > 0
        ? "Evidence freshness or prior posture increased review priority."
        : "Evidence freshness did not require decay.",
    },
    runtime_posture_shift: runtimePostureShift,
    governance_weighting: {
      penalty: Number(governanceWeight.toFixed(3)),
      history: [...(input.governanceHistory ?? [])],
      reviewer_override_weight: input.reviewerOutcome ? tuning.reviewerOverrideWeight : 0,
    },
    reviewer_override_applied: Boolean(reviewerDecision),
    limitations: [
      "ML/provider output is one signal, not autonomous certainty.",
      "The algorithm must not return confirmed fake without provider/model and governance evidence.",
      "Trust score is workflow posture, not a universal identity score.",
      ...decisionResult.limitations,
    ],
    next_action: nextAction[decision],
  };
}
