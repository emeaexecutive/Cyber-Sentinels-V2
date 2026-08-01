export const enterpriseSubjectClasses = [
  "human", "ai_agent", "machine_identity", "device", "organization",
  "workflow", "application", "API", "model", "document",
  "infrastructure_resource", "provider", "external_system",
] as const;

export type EnterpriseSubjectClass = (typeof enterpriseSubjectClasses)[number];
export const fabricTrustStates = ["verified", "degraded", "contested", "suspended", "revoked"] as const;
export type FabricTrustState = (typeof fabricTrustStates)[number];
export type FabricEvidenceCompleteness = "complete" | "partial" | "insufficient" | "unknown";
export type FabricReference = { type: string; id: string; version?: string };
export type FabricSubject = { type: EnterpriseSubjectClass; id: string; displayName: string };

export type EnterpriseTrustObject = {
  enterpriseId: string;
  subject: FabricSubject;
  identityState: FabricTrustState;
  authorityState: FabricTrustState;
  environmentState: FabricTrustState;
  scopeState: FabricTrustState;
  evidenceCompleteness: FabricEvidenceCompleteness;
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
  contradictions: Array<{ id: string; state: FabricTrustState; reasonCode: string; evidenceReferences: FabricReference[] }>;
  incidents: Array<{ id: string; state: FabricTrustState; reasonCodes: string[]; evidenceReferences: FabricReference[] }>;
  reviewerDecisions: Array<{ id: string; outcome: string; reviewRequired: boolean; evidenceReferences: FabricReference[] }>;
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
  recommendedOperationalActions: string[];
  reasonCodes: string[];
  evidenceReferences: FabricReference[];
  replayReference: FabricReference | null;
  trustMemoryReference: FabricReference | null;
  legalDecisionReference: FabricReference | null;
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
  humanReviewRequired: boolean;
  createdAt: string;
  supersededDecisionId: string | null;
  correlationId: string;
  legalDecisionReference: FabricReference | null;
  deterministicDigest: string;
};

export const timelineCategories = [
  "IDENTITY", "AUTHORITY", "ENVIRONMENT", "SCOPE", "PROVIDER", "POLICY",
  "TRUST_STATE", "INCIDENT", "REVIEW", "LEGAL", "REGULATOR", "CORRECTIVE_ACTION",
] as const;
export type TimelineCategory = (typeof timelineCategories)[number];
export type EnterpriseTrustTimelineItem = {
  id: string; category: TimelineCategory; source: string; sourceType: string; eventType: string;
  timestamp: string; timestampConfidence: "confirmed" | "high" | "medium" | "low" | "unknown";
  evidenceStrength: string; integrityState: "verified" | "unverified" | "invalid" | "unknown";
  enterpriseId: string; subject: FabricSubject; correlationId: string;
  evidenceReferences: FabricReference[]; supersedesItemId: string | null; uncertainty: string[]; summary: string;
};

export const trustContractOutcomes = ["satisfied", "satisfied_with_degraded_evidence", "review_required", "paused", "breached", "revoked"] as const;
export type TrustContractOutcome = (typeof trustContractOutcomes)[number];
export type TrustContract = {
  contractId: string; enterpriseId: string; subject: FabricSubject; workflow: { id: string; objective: string };
  authorizedObjective: string; requiredIdentityState: FabricTrustState; requiredAuthority: string[];
  requiredEnvironmentState: FabricTrustState; permittedScope: string[]; permittedProviders: string[];
  requiredEvidenceTypes: string[]; maximumEvidenceAgeSeconds: number; monitoringRequirements: string[];
  humanReviewThresholds: string[]; contradictionPolicy: "review" | "pause" | "breach";
  incidentThreshold: "material" | "critical" | "emergency"; expiresAt: string;
  revocationState: "active" | "revoked"; issuer: string; approver: string; policyVersion: string;
  evidenceReferences: FabricReference[]; issuedAt: string; supersedesContractId?: string | null;
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
