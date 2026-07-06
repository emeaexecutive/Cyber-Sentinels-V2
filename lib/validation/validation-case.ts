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
  reviewerOutcome?: DetectionExpectedOutcome;
  reviewerId?: string;
  governanceOverride?: {
    outcome: DetectionExpectedOutcome;
    reviewerId: string;
    reason: string;
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
