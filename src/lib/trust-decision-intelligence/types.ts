import type { TrustIntegrity } from "../trust-core/types.ts";

export const trustDecisionTypes = [
  "ALLOW", "REVIEW", "DENY", "ESCALATE", "SUSPEND", "RESTORE",
  "EXPIRE", "DELEGATE", "REVOKE", "APPROVE", "REJECT", "OBSERVE",
] as const;

export type TrustDecisionType = (typeof trustDecisionTypes)[number];

export const trustDecisionHealthStates = [
  "STABLE", "CHANGED", "CONTRADICTED", "RECOVERED",
  "INCOMPLETE", "PENDING", "EXPIRED", "SUPERSEDED",
] as const;

export type TrustDecisionHealth = (typeof trustDecisionHealthStates)[number];

export type CanonicalSystem =
  | "TRUST_FABRIC"
  | "TRUST_OBJECT"
  | "ENTERPRISE_DECISION_HISTORY"
  | "REPLAY"
  | "TRUST_MEMORY"
  | "EVIDENCE_GRAPH"
  | "TRUST_JOURNEY"
  | "TRUST_DECISION_INTELLIGENCE"
  | "AUTHORITY_LINEAGE"
  | "TRUST_STATE"
  | "TRUST_POLICY";

export type CanonicalReference = {
  system: CanonicalSystem;
  id: string;
  version?: string;
  uri?: string;
};

export type CanonicalSnapshotReference = CanonicalReference & {
  capturedAt: string;
  contentHash: string;
};

export type DecisionActor = {
  id: string;
  type: "HUMAN" | "AI_AGENT" | "SERVICE" | "WORKFLOW";
  displayName?: string;
};

export type SupportingEvidence = {
  evidenceId: string;
  evidenceType: "OBSERVATION" | "DOCUMENT" | "PROVIDER_RESULT" | "POLICY_RESULT" | "AUTHORITY_RESULT" | "REVIEW" | "OUTCOME";
  source: string;
  observedAt: string;
  summary: string;
  canonicalReference: CanonicalReference;
};

export type CitedStatement = {
  text: string;
  evidenceIds: string[];
};

export type KnownUnknown = {
  unknownId: string;
  description: string;
  impact: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  resolutionState: "OPEN" | "RESOLVED" | "ACCEPTED";
  evidenceIds: string[];
};

export type AIParticipation = {
  participant: DecisionActor & { type: "AI_AGENT" };
  provider: string;
  model?: string;
  actions: Array<"SUMMARIZE" | "CLUSTER" | "EXPLAIN" | "RECOMMEND" | "RETRIEVE" | "TRANSLATE">;
  outputReference: CanonicalReference;
  authoritative: false;
  limitations: string[];
};

export type ProviderParticipation = {
  providerId: string;
  providerName: string;
  purpose: string;
  resultReference: CanonicalReference;
  status: "USED" | "IGNORED" | "UNAVAILABLE" | "TIMED_OUT";
  authoritative: false;
  limitations: string[];
};

export type HumanReview = {
  reviewer: DecisionActor & { type: "HUMAN" };
  reviewedAt: string;
  disposition: "CONFIRMED" | "CORRECTED" | "ESCALATED" | "PENDING";
  rationale: CitedStatement[];
  reviewReference: CanonicalReference;
};

export type DecisionExplanation = {
  why: CitedStatement[];
  whichEvidence: string[];
  whichAuthority: CanonicalSnapshotReference;
  whichPolicy: CanonicalSnapshotReference;
  whichProviders: string[];
  whichHuman: string | null;
  whichAI: string[];
  uncertainty: string[];
  assumptions: CitedStatement[];
  whatChangedAfterwards: CitedStatement[];
};

export type DecisionEvolutionStage =
  | "ORIGINAL_DECISION"
  | "SUBSEQUENT_EVIDENCE"
  | "CORRECTION"
  | "REVIEWER_FEEDBACK"
  | "RECOVERY"
  | "FINAL_ENTERPRISE_OUTCOME";

export type DecisionEvolutionEntry = {
  evolutionId: string;
  stage: DecisionEvolutionStage;
  occurredAt: string;
  summary: CitedStatement;
  resultingDecisionType?: TrustDecisionType;
  resultingTrustState?: string;
  contradictsOriginal?: boolean;
  reference?: CanonicalReference;
};

export type ConfidenceClassification = {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  rationale: CitedStatement[];
};

export type CanonicalTrustDecision = TrustIntegrity & {
  schemaVersion: "1.0";
  decisionId: string;
  enterpriseId: string;
  decisionType: TrustDecisionType;
  decisionTime: string;
  decisionOwner: DecisionActor;
  authoritySnapshot: CanonicalSnapshotReference;
  policySnapshot: CanonicalSnapshotReference;
  evidenceSnapshot: CanonicalSnapshotReference;
  trustState: { before: string; atDecision: string; confidence: number };
  trustObjectReference: CanonicalReference;
  decisionHistoryReference: CanonicalReference;
  journeyReference: CanonicalReference;
  replayReference: CanonicalReference;
  trustMemoryReference: CanonicalReference;
  evidenceGraphReference: CanonicalReference;
  authorityLineageReference: CanonicalReference;
  businessContext: { process: string; objective: string; impact: CitedStatement[] };
  operationalContext: { workflowId: string; environment: string; correlationId: string; impact: CitedStatement[] };
  aiParticipation: AIParticipation[];
  providerParticipation: ProviderParticipation[];
  humanReviewer: HumanReview | null;
  confidenceClassification: ConfidenceClassification;
  supportingEvidence: SupportingEvidence[];
  knownUnknowns: KnownUnknown[];
  explanation: DecisionExplanation;
  decisionNarrative: CitedStatement[];
  decisionOutcome: {
    state: "PENDING" | "EFFECTIVE" | "FINAL";
    effect: CitedStatement[];
    effectiveAt: string;
    expiresAt?: string;
    finalEnterpriseOutcome?: CitedStatement[];
  };
  recoveryReference: CanonicalReference | null;
  supersededDecision: CanonicalReference | null;
  evolution: DecisionEvolutionEntry[];
  contentHash: string;
};

export type TrustDecisionInput = Omit<
  CanonicalTrustDecision,
  "schemaVersion" | "decisionId" | "canonicalization" | "hashAlgorithm" | "contentHash" | "evolution"
> & {
  decisionId?: string;
  evolution?: DecisionEvolutionEntry[];
};

export type ExecutiveAudience = "BOARD" | "CEO" | "CISO" | "AUDIT" | "LEGAL" | "RISK" | "OPERATIONS" | "FINANCE";

export type ExecutiveDecisionReport = {
  audience: ExecutiveAudience;
  decisionId: string;
  health: TrustDecisionHealth;
  whatHappened: CitedStatement[];
  why: CitedStatement[];
  businessImpact: CitedStatement[];
  operationalImpact: CitedStatement[];
  remainingUncertainty: KnownUnknown[];
  recommendedNextActions: CitedStatement[];
  replayReference: CanonicalReference;
  generatedFromEvidenceOnly: true;
};
