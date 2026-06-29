export type BenchmarkObservationKind =
  | "provider_verification"
  | "governance_escalation"
  | "replay_reconstruction"
  | "session_integrity_failure"
  | "trust_degradation"
  | "false_positive_review"
  | "false_negative_investigation"
  | "workflow_completion"
  | "candidate_provenance"
  | "recruiter_verification"
  | "proxy_candidate_review"
  | "media_mismatch_review";

export type BenchmarkOutcome =
  | "observed_success"
  | "observed_failure"
  | "completed"
  | "pending"
  | "review_required"
  | "resolved";

export type BenchmarkObservation = {
  id: string;
  workflowId: string;
  workflowType: string;
  kind: BenchmarkObservationKind;
  outcome: BenchmarkOutcome;
  occurredAt: string;
  provider: string | null;
  evidenceReferences: string[];
  governanceAction: string | null;
  explanation: string;
  trustDelta: number | null;
  simulated: boolean;
};

export type ExplainableMetric = {
  id: string;
  label: string;
  value: number;
  denominator: number | null;
  displayValue: string;
  whatHappened: string;
  evidenceContributed: string[];
  governanceAction: string;
  whyTrustChanged: string;
  boundary: string;
};

export type ProviderBenchmark = {
  provider: string;
  observedWorkflows: number;
  observedSuccesses: number;
  observedFailures: number;
  reviewRequired: number;
  evidenceCoverage: number;
  explanation: string;
};

export type WorkflowRiskBenchmark = {
  workflowType: string;
  observations: number;
  escalations: number;
  anomalies: number;
  completed: number;
  completionQuality: number;
  explanation: string;
};
