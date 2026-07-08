import { fuseTrustSignals, type FusionSignal } from "@/lib/detection/signal-fusion";
import { normalizeEntityIdentity, type EntityIdentityInput } from "@/lib/core/entity-identity";
import { buildTrustPosture, evolveContinuousTrustPosture, type TrustPostureInput } from "@/lib/trust-posture/posture";
import { calculateTrustAlgorithmV1, type TrustAlgorithmInput as LegacyTrustAlgorithmInput } from "@/lib/trust-algorithm";
import { evaluateTrustDecision } from "@/lib/trust/decision-engine";
import { runTrustAlgorithm, type TrustAlgorithmInput } from "@/lib/trust/trust-algorithm";

export type CanonicalTrustInput = TrustAlgorithmInput & {
  workflowId?: string;
  signals?: FusionSignal[];
  intentRiskAssessment?: Parameters<typeof fuseTrustSignals>[0]["intentRisk"];
  sessionIntegrityRisk?: number | null;
  agentPostureRisk?: number | null;
  agentBehaviorRisk?: number | null;
  credentialExposureRisk?: number | null;
  nhiOwnershipRisk?: number | null;
  permissionBoundaryRisk?: number | null;
  reviewedOutcomeRisk?: number | null;
  providerAgreement?: number | null;
  posture?: TrustPostureInput;
  previousTrustScore?: number | null;
  replayLinked?: boolean;
  stepUpTriggered?: boolean;
  recoveredByGovernance?: boolean;
  entity?: EntityIdentityInput;
};

export function calculateTrustPosture(input: CanonicalTrustInput) {
  const entity = input.entity ? normalizeEntityIdentity(input.entity) : null;
  const fusion = input.signals
    ? fuseTrustSignals({
        signals: input.signals,
        intentRisk: input.intentRiskAssessment,
        sessionIntegrityRisk: input.sessionIntegrityRisk,
        provenanceConfidence: input.provenanceConfidence,
        agentPostureRisk: input.agentPostureRisk,
        agentBehaviorRisk: input.agentBehaviorRisk,
        credentialExposureRisk: input.credentialExposureRisk,
        nhiOwnershipRisk: input.nhiOwnershipRisk,
        permissionBoundaryRisk: input.permissionBoundaryRisk,
        reviewedOutcomeRisk: input.reviewedOutcomeRisk,
        governanceHistory: input.governanceHistory,
        reviewerOutcome: input.reviewerOutcome,
        providerAgreement: input.providerAgreement,
      })
    : null;
  const algorithm = runTrustAlgorithm({
    ...input,
    providerSignals: input.providerSignals ?? input.providerAgreement ?? undefined,
    heuristicBaseline: input.heuristicBaseline ?? fusion?.confidence ?? undefined,
    sourceLabels: input.sourceLabels?.length
      ? input.sourceLabels
      : fusion
        ? [...new Set(["Runtime Intelligence", ...fusion.sources])] as TrustAlgorithmInput["sourceLabels"]
        : input.sourceLabels,
  });
  const decision = evaluateTrustDecision({
    identityConfidence: input.identityConfidence,
    agentOwnership: input.nhiOwnership === "orphaned" ? "orphaned" : input.agentIdentity === "verified" || input.nhiOwnership === "known" ? "known" : "unknown",
    humanAuthority: input.proofOfHuman === "failed" ? "missing" : "active",
    intentRisk: input.intentRisk,
    permissionScope: input.intentRisk != null && input.intentRisk > 80 ? "mismatch" : input.intentRisk != null && input.intentRisk > 55 ? "overbroad" : "matched",
    sessionIntegrity: input.sessionIntegrity,
    provenanceConfidence: input.provenanceConfidence,
    providerSignals: input.providerSignals,
    heuristicBaseline: input.heuristicBaseline,
    runtimeAnomalies: input.runtimeBehavior,
    governanceHistory: input.governanceHistory,
    sourceLabels: algorithm.source_labels,
  });
  const posture = buildTrustPosture({
    ...input.posture,
    confidenceLabel: algorithm.confidence_band,
  });
  const continuousPosture = evolveContinuousTrustPosture({
    previousScore: input.previousTrustScore,
    currentScore: algorithm.trust_score,
    posture,
    replayLinked: input.replayLinked,
    stepUpTriggered: input.stepUpTriggered || decision.decision === "step_up" || decision.decision === "block",
    recoveredByGovernance: input.recoveredByGovernance,
  });

  return {
    engine: "trust_engine" as const,
    decision: algorithm.decision,
    trust_score: algorithm.trust_score,
    trust_level: algorithm.trust_level,
    confidence_band: algorithm.confidence_band,
    posture,
    continuous_posture: continuousPosture,
    entity_identity: entity,
    fusion,
    algorithm,
    decision_engine: decision,
    explainability: {
      reasons: algorithm.reasons,
      evidence_refs: algorithm.evidence_refs,
      source_labels: algorithm.source_labels,
      limitations: algorithm.limitations,
      next_action: algorithm.next_action,
    },
  };
}

export function calculateLegacyTrustPosture(input: LegacyTrustAlgorithmInput) {
  const result = calculateTrustAlgorithmV1(input);
  return {
    engine: "trust_engine" as const,
    ...result,
    boundary: "Legacy trust posture is exposed through the canonical trust engine facade to avoid duplicate calculation paths.",
  };
}

export const trustEngine = {
  calculateTrustPosture,
  calculateLegacyTrustPosture,
};
