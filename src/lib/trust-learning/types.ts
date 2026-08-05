export const enterpriseTrustPatternTypes = [
  "repeated_authority_expiry",
  "repeated_scope_excess",
  "repeated_delegation_depth_issue",
  "repeated_action_limit_exhaustion",
  "authority_reissued_after_same_failure",
  "child_activity_after_parent_revocation",
  "recurring_provider_unavailability",
  "recurring_provider_contradiction",
  "recurring_provider_correction",
  "provider_confirmation_not_independently_supported",
  "provider_latency_affecting_review",
  "recurring_evidence_staleness",
  "repeated_missing_mandatory_evidence",
  "recurring_integrity_failure",
  "repeated_identity_or_runtime_conflict",
  "recurring_attribution_dispute",
  "repeated_human_review",
  "repeated_denial",
  "repeated_relay_cancellation",
  "repeated_environment_mismatch",
  "repeated_corrective_action",
  "recurring_incident_pattern",
  "actions_without_confirmed_outcome",
  "repeated_failed_workflow",
  "repeated_restoration_success",
  "repeated_restoration_failure",
  "repeated_cost_without_confirmed_outcome",
  "repeated_consumption_after_revocation",
] as const;

export type EnterpriseTrustPatternType = (typeof enterpriseTrustPatternTypes)[number];
export type PatternMateriality = "low" | "moderate" | "high" | "critical";
export type EvidenceStrength = "weak" | "partial" | "strong";
export type ConfidenceClassification = "low" | "medium" | "high";

export type CanonicalLearningEvent = {
  eventId: string;
  enterpriseId: string;
  eventType: string;
  occurredAt: string;
  subjectType: string;
  subjectReference: string;
  workflowReference?: string | null;
  authorityReference?: string | null;
  policyReference?: string | null;
  providerReference?: string | null;
  incidentReference?: string | null;
  decisionReference?: string | null;
  evidenceReferences: string[];
  materiality?: PatternMateriality | "none";
  correctedEventReference?: string | null;
  outcome?: string | null;
};

export type EnterpriseTrustPattern = {
  patternId: string;
  enterpriseId: string;
  patternType: EnterpriseTrustPatternType;
  subjectTypes: string[];
  subjectReferences: string[];
  workflowReferences: string[];
  authorityReferences: string[];
  policyReferences: string[];
  providerReferences: string[];
  incidentReferences: string[];
  decisionReferences: string[];
  evidenceReferences: string[];
  supportingEventReferences: string[];
  supportingEventCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
  recurrenceWindow: { days: number; start: string; end: string };
  materiality: PatternMateriality;
  evidenceStrength: EvidenceStrength;
  confidenceClassification: ConfidenceClassification;
  uncertainty: string[];
  limitations: string[];
  status: "active" | "corrected" | "superseded";
  reviewerState: "pending" | "accepted" | "partially_accepted" | "rejected" | "corrected";
  canonicalDigest: string;
  supersedesPatternId: string | null;
  createdAt: string;
  updatedAt: string;
};

export const aiOutputClassifications = [
  "ai_draft",
  "evidence_retrieval_result",
  "semantic_similarity_result",
  "reviewer_assistance",
  "translated_summary",
  "unverified_suggestion",
] as const;
export type AiOutputClassification = (typeof aiOutputClassifications)[number];

export type EvidenceSource = {
  reference: string;
  summary: string;
  sourceVersion: string;
  classification: "observed_evidence" | "derived_pattern" | "reviewer_outcome";
  sensitive?: boolean;
  contradiction?: boolean;
};

export type ModelOperation =
  | "draft_explanation"
  | "summarize_supporting_evidence"
  | "cluster_semantically_similar_cases"
  | "retrieve_relevant_history"
  | "draft_review_questions"
  | "draft_recommended_evidence"
  | "translate_technical_summary_for_role";

export type ModelAdapterRequest = {
  operation: ModelOperation;
  correlationId: string;
  promptTemplateVersion: string;
  evidence: EvidenceSource[];
  instructions: string;
};

export type ModelDraftStatement = { text: string; evidenceReferences: string[]; material: boolean };
export type ModelAdapterResult = {
  status: "generated" | "not_configured";
  providerId: string;
  modelId: string;
  modelVersion: string;
  promptTemplateVersion: string;
  requestDigest: string;
  redactionState: "redacted";
  evidenceReferencesSupplied: string[];
  statements: ModelDraftStatement[];
  outputClassification: AiOutputClassification;
  limitations: string[];
  generatedAt: string;
  correlationId: string;
  reviewState: "pending" | "not_applicable";
};

export interface TrustIntelligenceModelAdapter {
  readonly providerId: string;
  readonly modelId: string;
  readonly modelVersion: string;
  generate(request: ModelAdapterRequest): Promise<ModelAdapterResult>;
}

export type GroundedNarrative = {
  mode: "ai_assisted" | "deterministic_fallback";
  statements: ModelDraftStatement[];
  rejectedStatements: ModelDraftStatement[];
  contradictions: string[];
  missingEvidenceVisible: boolean;
  evidenceReferences: string[];
  sourceVersions: string[];
  limitations: string[];
  reviewerState: "pending";
  canonicalDecisionMutationCount: 0;
  digest: string;
  model: ModelAdapterResult;
};

export type ApprovedTrustAction = {
  actionType: "step_up_verification" | "request_additional_evidence" | "human_review" | "provider_recheck" | "pause_workflow";
  policyReference: string;
  description: string;
};

export type TrustRecommendation = {
  approvedActionType: ApprovedTrustAction["actionType"];
  rankingBasis: string;
  evidenceReferences: string[];
  policyReference: string;
  uncertainty: string[];
  reviewerRequired: true;
  aiGenerated: boolean;
  modelReference: string | null;
  executable: false;
  digest: string;
};

export type HistoricalTrustForecast = {
  statement: string;
  comparisonPopulation: string;
  sampleSize: number;
  matchingCaseCount: number;
  timeWindow: { start: string; end: string };
  evidenceCoverage: EvidenceStrength;
  confidenceClassification: ConfidenceClassification;
  limitations: string[];
  noCausalClaim: true;
  futureMisconductPrediction: false;
  digest: string;
};

export type TrustLearningSnapshot = {
  enterpriseId: string;
  capturedAt: string;
  trustObjects: Array<{ reference: string; authorityReference?: string; providerReferences?: string[]; evidenceReferences?: string[]; workflowReferences?: string[] }>;
  authorities: Array<{ reference: string; expiresAt?: string | null; parentReference?: string | null; active: boolean }>;
  workflows: Array<{ reference: string; authorityReferences: string[]; providerReferences: string[]; evidenceReferences: string[]; decision: "allow" | "review" | "deny" }>;
  incidents: Array<{ reference: string; resolved: boolean }>;
};

export type TrustSimulationResult = {
  simulationType: "authority_expiry" | "provider_outage" | "delegated_agent_impact" | "economic_limit";
  assumptions: string[];
  affectedObjects: string[];
  affectedWorkflows: string[];
  changedDecisions: Array<{ workflowReference: string; from: string; to: "review" | "deny" }>;
  uncertainty: string[];
  sourceReferences: string[];
  canonicalStateMutationCount: 0;
  snapshotDigest: string;
  simulationDigest: string;
};

export const resilienceStates = ["resilient", "partially_resilient", "single_source_dependency", "evidence_gap", "authority_gap", "provider_dependency", "recovery_required", "unknown"] as const;
export type ResilienceState = (typeof resilienceStates)[number];
export type TrustResilienceAssessment = {
  state: ResilienceState;
  providerReference: string | null;
  independentEvidenceReferences: string[];
  affectedObjects: string[];
  affectedWorkflows: string[];
  authorityReconstructable: boolean;
  replayAvailable: boolean;
  businessOutcomeEstablished: boolean;
  unresolvedIncidentReferences: string[];
  limitations: string[];
  sourceReferences: string[];
  digest: string;
};

export const reviewerFeedbackLabels = ["accepted", "partially_accepted", "rejected", "unsupported", "misleading", "missing_evidence", "incorrect_similarity", "useful_recommendation", "not_useful", "corrected"] as const;
export type ReviewerFeedbackLabel = (typeof reviewerFeedbackLabels)[number];
export type TrustLearningFeedback = {
  feedbackId: string;
  enterpriseId: string;
  reviewerReference: string;
  reviewerRole: string;
  outputReference: string;
  sourceVersion: string;
  label: ReviewerFeedbackLabel;
  reason: string;
  correction: string | null;
  createdAt: string;
  automaticRetrainingTriggered: false;
  digest: string;
};
