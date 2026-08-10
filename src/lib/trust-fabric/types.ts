export const enterpriseSubjectClasses = [
  "human", "ai_agent", "machine_identity", "device", "organization",
  "workflow", "application", "api", "model", "document",
  "infrastructure_resource", "provider", "external_system",
] as const;

export type EnterpriseSubjectClass = (typeof enterpriseSubjectClasses)[number];
export const fabricTrustStates = ["verified", "degraded", "contested", "suspended", "revoked"] as const;
export type FabricTrustState = (typeof fabricTrustStates)[number];
export type FabricEvidenceCompleteness = "complete" | "partial" | "insufficient" | "unknown";
export type FabricReference = { type: string; id: string; version?: string };
export type FabricSubject = { type: EnterpriseSubjectClass; id: string; displayName: string };
export const evidenceClassifications = [
  "asserted", "configured", "observed", "independently_attested", "cryptographically_attested", "derived",
] as const;
export type EvidenceClassification = (typeof evidenceClassifications)[number];
export type FabricEvidenceRecord = {
  sourceIdentity: string;
  sourceType: string;
  sourceAuthority: string;
  evidenceStrength: string;
  evidenceClassification: EvidenceClassification;
  observedAt: string;
  receivedAt: string;
  freshness: "current" | "stale" | "expired" | "unknown";
  confidence: number | null;
  integrityStatus: "verified" | "unverified" | "invalid" | "unknown";
  evidenceReference: FabricReference;
  enterpriseId: string;
  subject: FabricSubject;
  correlationId: string;
  supersedesEvidenceReference: FabricReference | null;
  derivedFromEvidenceReferences: FabricReference[];
};
export type FabricContradiction = { id: string; state: FabricTrustState; reasonCode: string; evidenceReferences: FabricReference[] };
export type FabricIncident = { id: string; state: FabricTrustState; reasonCodes: string[]; evidenceReferences: FabricReference[] };
export type FabricReview = { id: string; outcome: string; reviewRequired: boolean; evidenceReferences: FabricReference[] };
export type FabricCorrectiveAction = { id: string; state: string; evidenceReferences: FabricReference[] };

export type EnterpriseTrustObject = {
  enterpriseId: string;
  subjectType: EnterpriseSubjectClass;
  subjectId: string;
  displayIdentity: string;
  subject: FabricSubject;
  identityState: FabricTrustState;
  authorityState: FabricTrustState;
  environmentState: FabricTrustState;
  scopeState: FabricTrustState;
  evidenceCompleteness: FabricEvidenceCompleteness;
  trustState: FabricTrustState;
  providerState: ProviderRuntimeState;
  activeContradictions: FabricContradiction[];
  activeIncidents: FabricIncident[];
  activeReviews: FabricReview[];
  correctiveActions: FabricCorrectiveAction[];
  trustDnaReference: FabricReference | null;
  continuousTrustReference: FabricReference | null;
  policyId: string;
  canonicalDigest: string;
  /** Compatibility aliases retained for existing consumers during reconciliation. */
  currentTrustState: FabricTrustState;
  trustDnaProfileReference: FabricReference | null;
  continuousTrustStateReference: FabricReference | null;
  contradictionSummary: { count: number; highestState: FabricTrustState | null; references: FabricReference[] };
  activeReviewSummary: { count: number; required: boolean; references: FabricReference[] };
  incidentSummary: { count: number; highestState: FabricTrustState | null; references: FabricReference[] };
  replayReference: FabricReference | null;
  trustMemoryReference: FabricReference | null;
  evidenceGraphNodeReference: FabricReference | null;
  lastEvaluatedAt: string;
  policyVersion: string;
  correlationId: string;
};

export type ComposedDecision = {
  state: FabricTrustState;
  reasonCodes: string[];
  evidenceReferences: FabricReference[];
  decisionReference?: FabricReference | null;
};

export type TrustFabricEvaluationInput = {
  enterpriseId: string;
  subject: FabricSubject;
  workflow?: { id: string; objective: string } | null;
  identity: ComposedDecision;
  authority: ComposedDecision;
  environment: ComposedDecision & { consistent: boolean };
  scope: ComposedDecision & { continuous: boolean };
  providers: Array<ComposedDecision & { providerId: string }>;
  policy: { id: string; version: string };
  continuousTrust: ComposedDecision;
  evidenceCompleteness: FabricEvidenceCompleteness;
  contradictions: FabricContradiction[];
  incidents: FabricIncident[];
  reviewerDecisions: FabricReview[];
  correctiveActions?: FabricCorrectiveAction[];
  legalDecisionReference?: FabricReference | null;
  trustDnaProfileReference?: FabricReference | null;
  replayReference?: FabricReference | null;
  trustMemoryReference?: FabricReference | null;
  evidenceGraphNodeReference?: FabricReference | null;
  evaluatedAt: string;
  correlationId: string;
};

export type TrustFabricEvaluation = {
  trustObject: EnterpriseTrustObject;
  currentTrustState: FabricTrustState;
  authorityState: FabricTrustState;
  environmentConsistency: "consistent" | "inconsistent";
  scopeContinuityState: FabricTrustState;
  evidenceCompleteness: FabricEvidenceCompleteness;
  activeContradictions: TrustFabricEvaluationInput["contradictions"];
  activeIncidents: TrustFabricEvaluationInput["incidents"];
  requiredReviews: TrustFabricEvaluationInput["reviewerDecisions"];
  providerState: ProviderRuntimeState;
  incidentSummary: EnterpriseTrustObject["incidentSummary"];
  correctiveActions: FabricCorrectiveAction[];
  recommendedOperationalActions: string[];
  reasonCodes: string[];
  evidenceReferences: FabricReference[];
  replayReference: FabricReference | null;
  trustMemoryReference: FabricReference | null;
  legalDecisionReference: FabricReference | null;
  deterministicDigest: string;
};

export const fabricDecisionTypes = [
  "identity", "authority", "environment", "scope", "provider",
  "continuous_trust", "incident", "reviewer", "regulatory_screening", "legal_reference",
] as const;
export type FabricDecisionType = (typeof fabricDecisionTypes)[number];

export type TrustFabricDecisionEnvelope = {
  decisionId: string;
  enterpriseId: string;
  subject: FabricSubject;
  workflow: { id: string; objective: string } | null;
  workflowId: string | null;
  decisionType: FabricDecisionType;
  outcome: string;
  trustState: FabricTrustState;
  reasonCodes: string[];
  evidenceReferences: FabricReference[];
  policyId: string;
  policyVersion: string;
  evaluator: string;
  evaluatorVersion: string;
  actorOrSystemAuthority: string;
  actorAuthority: string;
  humanReviewRequired: boolean;
  createdAt: string;
  supersededDecisionId: string | null;
  correlationId: string;
  legalDecisionReference: FabricReference | null;
  deterministicDigest: string;
  canonicalDigest: string;
};

export const timelineCategories = [
  "IDENTITY", "AUTHORITY", "ENVIRONMENT", "SCOPE", "PROVIDER", "POLICY",
  "TRUST_STATE", "INCIDENT", "REVIEW", "LEGAL", "REGULATOR", "CORRECTIVE_ACTION",
] as const;
export type TimelineCategory = (typeof timelineCategories)[number];
export type EnterpriseTrustTimelineItem = {
  id: string; category: TimelineCategory; source: string; sourceType: string; eventType: string;
  sourceAuthority: string;
  timestamp: string; timestampConfidence: "confirmed" | "high" | "medium" | "low" | "unknown";
  evidenceStrength: string; integrityState: "verified" | "unverified" | "invalid" | "unknown";
  enterpriseId: string; subject: FabricSubject; correlationId: string;
  evidenceReferences: FabricReference[]; supersedesItemId: string | null; uncertainty: string[];
  replayClassification: string; summary: string;
};

export const trustContractOutcomes = ["satisfied", "satisfied_with_degraded_evidence", "review_required", "paused", "breached", "revoked"] as const;
export type TrustContractOutcome = (typeof trustContractOutcomes)[number];
export type TrustContract = {
  contractId: string; enterpriseId: string; subject: FabricSubject; workflow: { id: string; objective: string };
  subjectType: EnterpriseSubjectClass; subjectId: string; workflowId: string;
  authorizedObjective: string; requiredIdentityState: FabricTrustState; requiredAuthority: string[];
  requiredEnvironmentState: FabricTrustState; permittedScope: string[]; permittedProviders: string[];
  requiredEvidenceTypes: string[]; maximumEvidenceAgeSeconds: number; monitoringRequirements: string[];
  humanReviewThresholds: string[]; contradictionPolicy: "review" | "pause" | "breach";
  incidentThreshold: "material" | "critical" | "emergency"; expiresAt: string; revokedAt: string | null;
  revocationState: "active" | "revoked"; issuer: string; approver: string; policyId: string; policyVersion: string;
  evidenceReferences: FabricReference[]; issuedAt: string; supersedesContractId?: string | null;
  /** Native delegated-authority fields retained in the canonical Trust Contract. */
  authorityScope?: {
    permittedActions: string[]; permittedTools: string[]; permittedTargets: string[]; environments: string[];
    dataBoundary: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
    financialLimit: number | null; executionLimit: number | null;
  };
  canDelegate?: boolean;
  maximumDelegationDepth?: number;
  authorityVersion?: string;
};
export type TrustContractEvaluationInput = {
  contract: TrustContract; evaluatedAt: string; identityState: FabricTrustState; authorityState: FabricTrustState;
  effectiveAuthority: string[]; environmentState: FabricTrustState; scopeState: FabricTrustState;
  requestedScope: string[]; activeProviders: string[]; evidence: Array<{ type: string; observedAt: string; reference: FabricReference }>;
  monitoring: string[]; contradictions: string[]; highestIncidentSeverity: "none" | "material" | "critical" | "emergency";
  humanReviewRequired: boolean; correlationId: string;
};
export type TrustContractEvaluation = {
  evaluationId: string; contractId: string; enterpriseId: string; outcome: TrustContractOutcome;
  trustState: FabricTrustState; reasonCodes: string[]; evidenceReferences: FabricReference[];
  evaluatedAt: string; correlationId: string; deterministicDigest: string;
};

export const providerRuntimeStates = ["available", "degraded", "unavailable", "contradicted", "unknown"] as const;
export type ProviderRuntimeState = (typeof providerRuntimeStates)[number];
export const replayAvailabilityStates = ["ready", "empty", "evidence_missing", "source_unavailable", "generation_failed", "access_denied"] as const;
export type ReplayAvailabilityState = (typeof replayAvailabilityStates)[number];
