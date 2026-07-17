import type { SupabaseClient } from "@supabase/supabase-js";

export type OriOperatingMode = "off" | "shadow" | "advisory";
export type OriRiskBand = "LOW" | "MODERATE" | "HIGH" | "UNKNOWN";
export type OriRecommendation =
  | "NO_ADDITIONAL_ACTION"
  | "STEP_UP"
  | "HUMAN_REVIEW"
  | "ABSTAIN";
export type OriModelStatus = "DRAFT" | "SHADOW" | "APPROVED" | "RETIRED" | "DISABLED";
export type OriFeatureSensitivity = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
export type OriConfidenceBand = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_EVIDENCE";
export type OriComparisonCategory =
  | "AGREED_LOW_RISK"
  | "AGREED_REVIEW"
  | "ORI_MORE_CAUTIONARY"
  | "ORI_LESS_CAUTIONARY"
  | "ORI_ABSTAINED"
  | "AUTHORITATIVE_DECISION_UNAVAILABLE"
  | "NOT_COMPARABLE";

export type OriFeatureDefinition = {
  id: string;
  name: string;
  version: string;
  schemaVersion: string;
  description: string;
  dataType: "boolean" | "integer" | "number" | "category";
  source: string;
  sensitivity: OriFeatureSensitivity;
  allowedValues?: readonly string[];
  minimum?: number;
  maximum?: number;
  required: boolean;
  defaultBehavior: "REJECT" | "ABSTAIN" | "DEFAULT_SAFE";
  normalization: string;
  retentionImplication: string;
  limitations: readonly string[];
  active: boolean;
  firstSupportedModelVersion: string;
  lastSupportedModelVersion?: string;
  createdAt: string;
  updatedAt: string;
};

export type OriFeatureValue = {
  featureId: string;
  schemaVersion: string;
  value: boolean | number | string;
  sourceEvidenceIds: string[];
  sourceTenantId: string;
  sourceTrustSessionId: string;
};

export type OriModelMetadata = {
  modelId: string;
  modelName: string;
  modelVersion: string;
  scope: "GLOBAL_SHADOW";
  algorithmFamily: "LOGISTIC_REGRESSION";
  featureSchemaVersion: string;
  datasetVersion: string;
  thresholdVersion: string;
  trainedAt: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  artifactHash: string;
  status: OriModelStatus;
  limitations: string[];
};

export type OriModelArtifact = OriModelMetadata & {
  intercept: number;
  coefficients: Readonly<Record<string, number>>;
  normalizationAssumptions: readonly string[];
};

export type OriInferenceInput = {
  tenantId: string;
  trustSessionId: string;
  correlationId: string;
  featureSchemaVersion: string;
  features: OriFeatureValue[];
};

export type OriContribution = {
  featureId: string;
  direction: "RISK_INCREASING" | "RISK_REDUCING";
  contribution: number;
  explanation: string;
};

export type OriInferenceOutput = {
  inferenceId: string;
  modelId: string;
  modelVersion: string;
  featureSchemaVersion: string;
  datasetVersion: string;
  thresholdVersion: string;
  score: number;
  riskBand: OriRiskBand;
  recommendation: OriRecommendation;
  abstain: boolean;
  confidenceBand: OriConfidenceBand;
  contributions: OriContribution[];
  missingFeatureIds: string[];
  evidenceCoverage: number;
  limitations: string[];
  artifactHashVerified: boolean;
  executionDurationMs: number;
  inferredAt: string;
};

export type OriNormalizedEvidence = {
  tenantId: string;
  trustSessionId: string;
  correlationId: string;
  sourceEvidenceIds: string[];
  identityConfidence?: number | null;
  proofOfHuman?: "verified" | "failed" | "unknown" | null;
  evidenceLastSeenAt?: string | null;
  intentRisk?: number | null;
  governanceHistory?: Array<"approved" | "review" | "escalated" | "blocked">;
  replayAvailable: boolean;
  now?: Date;
};

export type OriAuthoritativeDecision =
  | "allow"
  | "review"
  | "step_up"
  | "escalate"
  | "block"
  | "insufficient_evidence"
  | "insufficient evidence"
  | null;

export type OriShadowEvaluation = {
  state: "DISABLED" | "COMPLETED" | "ABSTAINED" | "FAILED";
  mode: OriOperatingMode;
  authoritativeDecision: OriAuthoritativeDecision;
  authoritativeDecisionUnchanged: true;
  inference: OriInferenceOutput | null;
  comparison: OriComparisonCategory;
  persistence: "NOT_ATTEMPTED" | "PERSISTED" | "FAILED";
  error?: "SCOPE_UNAVAILABLE" | "PERSISTENCE_FAILED" | "INFERENCE_FAILED" | "TIMEOUT";
};

export type OriPersistenceClient = Pick<SupabaseClient, "from">;

export type OriInferenceRecord = {
  inferenceId: string;
  tenantId: string;
  trustSessionId: string;
  correlationId: string;
  modelId: string;
  modelVersion: string;
  featureSchemaVersion: string;
  datasetVersion: string;
  thresholdVersion: string;
  score: number;
  riskBand: OriRiskBand;
  recommendation: OriRecommendation;
  abstain: boolean;
  confidenceBand: OriConfidenceBand;
  missingFeatureIds: string[];
  evidenceCoverage: number;
  authoritativeDecision: OriAuthoritativeDecision;
  comparisonCategory: OriComparisonCategory;
  synthetic: boolean;
  expectedClass?: "CAUTION" | "NO_CAUTION" | null;
  reviewerOutcome?: "CORRECT" | "TOO_CAUTIOUS" | "NOT_CAUTIOUS_ENOUGH" | "NOT_USEFUL" | null;
};

export type OriValidationMetrics = {
  validationStatus: "ML Validation Incomplete" | "REVIEWED_VALIDATION_AVAILABLE";
  totalCount: number;
  eligibleReviewedCount: number;
  syntheticCount: number;
  abstentionRate: number | null;
  recommendationDistribution: Record<OriRecommendation, number>;
  comparisonDistribution: Record<OriComparisonCategory, number>;
  reviewerAgreement: number | null;
  precision: number | null;
  recall: number | null;
  falsePositiveRate: number | null;
  falseNegativeRate: number | null;
  averageEvidenceCoverage: number | null;
  calibrationStatus: "INSUFFICIENT_REVIEWED_GROUND_TRUTH" | "ELIGIBLE_FOR_REVIEWED_CALIBRATION";
  limitations: string[];
};
