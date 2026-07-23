import type { EvidenceObject } from "../trust-architecture/evidence.ts";
import type { ProviderHealthState } from "../consensus/types.ts";
import type { TrustState, TrustStateRecommendation } from "../trust-state/types.ts";

export const driftSeverities = ["informational", "low", "medium", "high", "critical"] as const;
export const alertStates = ["open", "acknowledged", "investigating", "resolved", "dismissed"] as const;
export type DriftSeverity = (typeof driftSeverities)[number];
export type ContinuousAlertState = (typeof alertStates)[number];
export type EvidenceFreshness = "CURRENT" | "DEGRADED" | "STALE" | "EXPIRED" | "UNAVAILABLE";
export type TransitionType = "INITIAL" | "UNCHANGED" | "DEGRADED" | "RESTORED" | "RECALCULATED";

export type ContinuousTrustPolicy = {
  policyId: string;
  policyVersion: string;
  trustedScore: number;
  verifiedScore: number;
  challengedScore: number;
  blockedScore: number;
  minimumEvidenceForTrusted: number;
  minimumEvidenceForVerified: number;
  defaultFreshnessSeconds: number;
  freshnessByEvidenceType: Record<string, number>;
  evaluationIntervalSeconds: number;
  scoreDriftThreshold: number;
  confidenceDriftThreshold: number;
  allowRecoveryFromBlocked: boolean;
};

export type RuntimeProviderHealth = {
  providerKey: string;
  state: ProviderHealthState;
  observedAt: string;
  latencyMs: number | null;
  errorRate: number | null;
  circuitOpen: boolean;
  reasonCodes: string[];
};

export type PreviousRuntimeState = {
  state: TrustState;
  score: number | null;
  confidence: number;
  evidenceFreshness: EvidenceFreshness | null;
  policyVersion: string | null;
  riskFlags: string[];
  stateDecisionId: string | null;
};

export type DriftFinding = {
  driftId: string;
  driftType: string;
  severity: DriftSeverity;
  ruleId: string;
  reasonCode: string;
  evidenceReferences: string[];
  priorValue: string | number | null;
  currentValue: string | number | null;
  detectedAt: string;
};

export type RuntimeAlertDecision = {
  alertId: string;
  alertType: string;
  severity: DriftSeverity;
  state: "open";
  driftId: string;
  evidenceReferences: string[];
  remediationGuidance: string;
};

export type ContinuousTrustAssessment = {
  assessmentId: string;
  enterpriseId: string;
  domainKey: string;
  subjectId: string;
  subjectType: string;
  evaluatedAt: string;
  nextEvaluationAt: string;
  score: number;
  confidence: number;
  evidenceFreshness: EvidenceFreshness;
  riskFlags: string[];
  reasonCodes: string[];
  transitionType: TransitionType;
  policyId: string;
  policyVersion: string;
  sourceEventId: string | null;
  evidenceSnapshotHash: string;
  evidenceReferences: string[];
  recommendation: TrustStateRecommendation;
  drift: DriftFinding[];
  alerts: RuntimeAlertDecision[];
  assessmentHash: string;
};

export type ContinuousTrustInput = {
  enterpriseId: string;
  domainKey: string;
  subjectId: string;
  subjectType: string;
  evaluatedAt: string;
  sourceEventId?: string | null;
  evidence: EvidenceObject[];
  providerHealth: RuntimeProviderHealth[];
  previous: PreviousRuntimeState | null;
  policy: ContinuousTrustPolicy;
};

export const defaultContinuousTrustPolicy: ContinuousTrustPolicy = {
  policyId: "continuous-trust-default",
  policyVersion: "1.0.0",
  trustedScore: 65,
  verifiedScore: 85,
  challengedScore: 40,
  blockedScore: 20,
  minimumEvidenceForTrusted: 1,
  minimumEvidenceForVerified: 2,
  defaultFreshnessSeconds: 86_400,
  freshnessByEvidenceType: {},
  evaluationIntervalSeconds: 900,
  scoreDriftThreshold: 10,
  confidenceDriftThreshold: 15,
  allowRecoveryFromBlocked: true,
};
