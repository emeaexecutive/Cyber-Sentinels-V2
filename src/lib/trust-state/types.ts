import type { EvidenceObject } from "../trust-architecture/evidence.ts";

export const trustStates = ["UNKNOWN", "OBSERVED", "INCONCLUSIVE", "TRUSTED", "VERIFIED", "CHALLENGED", "BLOCKED", "REVOKED", "EXPIRED"] as const;
export type TrustState = (typeof trustStates)[number];

export type TrustStateRecommendation = {
  recommendationId: string;
  recommendedState: TrustState;
  confidence: number;
  reasonCodes: string[];
  evidenceSnapshotHash: string;
};

export type TrustStatePolicy = {
  policyId: string;
  policyVersion: string;
  allowRecoveryFromBlocked: boolean;
  minimumEvidenceForTrusted: number;
  minimumEvidenceForVerified: number;
};

export type TrustStateDecision = {
  stateDecisionId: string; decisionContractId: string; enterpriseId: string; domainKey: string; subjectId: string;
  priorState: TrustState; nextState: TrustState; recommendationId: string; policyId: string; policyVersion: string;
  confidence: number; evidenceSnapshotHash: string; decisionInputHash: string; decisionHash: string; decidedAt: string; reasonCodes: string[];
  evidence: EvidenceObject[];
};
