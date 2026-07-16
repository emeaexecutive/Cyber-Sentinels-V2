export type ValidationLabel =
  | "real"
  | "synthetic"
  | "deepfake"
  | "forged"
  | "injected"
  | "suspicious"
  | "clean"
  | "unknown";

export type DetectionExpectedOutcome = "positive" | "negative" | "review";
export type DetectionSource =
  | "provider_api"
  | "heuristic_baseline"
  | "baseline_model_assisted"
  | "runtime_intelligence"
  | "demo_data"
  | "not_implemented"
  | "awaiting_credentials";

export type ValidationCase = {
  id: string;
  label: ValidationLabel;
  expectedOutcome: DetectionExpectedOutcome;
  description: string;
  signals: Record<string, boolean | number | string | null | undefined>;
  dataClassification?: "public" | "internal" | "confidential" | "restricted";
  sampleReference?: string;
  datasetMetadata?: {
    label: ValidationLabel;
    source: "synthetic" | "consented_test" | "public_benchmark" | "internal_fixture";
    reviewer?: string;
    confidence?: number;
    providerAgreement?: "agreed" | "disagreed" | "not_compared" | "awaiting_credentials";
    governanceOutcome?: "approved" | "escalated" | "blocked" | "more_evidence_required" | "pending";
    notes?: string;
    reviewTimestamp?: string;
    datasetVersion?: string;
    benchmarkVersion?: string;
    reviewStatus?: "pending" | "reviewed" | "disputed" | "excluded" | "approved";
    workflow?: string;
    signalType?: string;
    providerId?: string;
    rulesetVersion?: string;
    sourceProvenance?: string;
    usageBoundary?: string;
    evidenceReferences?: string[];
  };
  reviewerOutcome?: DetectionExpectedOutcome;
  reviewerId?: string;
  reviewerNotes?: string;
  governanceOverride?: {
    outcome: DetectionExpectedOutcome;
    reviewerId: string;
    reason: string;
  };
  intent?: {
    actorType?: "human" | "agent" | "NHI" | "workflow";
    actionType?: string;
    declaredIntent?: string;
    expectedPermission?: string;
    actualPermission?: string;
  };
};

export type ValidationResult = {
  caseId: string;
  expected: DetectionExpectedOutcome;
  actual: DetectionExpectedOutcome;
  source: DetectionSource;
  confidence: number;
  evidence: string[];
  limitations: string[];
  providerName?: string;
  providerAudit?: {
    providerName: string;
    state: "provider_api" | "not_implemented" | "awaiting_credentials";
    credentialsChecked: boolean;
    providerCallMade: boolean;
    degradedMode: boolean;
    latencyMs?: number;
  };
};

export type ConfusionMatrix = {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  reviewOnly: number;
};

export type PrecisionRecallMetrics = {
  precision: number | null;
  recall: number | null;
  f1: number | null;
};

export type ReviewerAgreement = {
  reviewedCases: number;
  agreements: number;
  disagreements: number;
  agreementRate: number | null;
};
