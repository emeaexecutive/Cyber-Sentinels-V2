export type PilotMetricWindow = {
  start: string;
  end: string;
};

export type PilotDecisionRecord = {
  id: string;
  enterpriseId: string;
  tenantId: string;
  decision: "ALLOW" | "REVIEW" | "DENY";
  createdAt: string;
  governed: boolean;
  outOfScope: boolean;
  unauthorized: boolean;
  authorityIntegrity: boolean;
  evidenceComplete: boolean;
  replayAvailable: boolean;
  recoveryAvailable: boolean;
  providerEvidenceState: "present" | "missing" | "stale" | "invalid" | "unavailable";
  authority: {
    actor: string;
    credential: string;
    delegator: string;
    resource: string;
    action: string;
    validity: boolean;
    revocationState: string;
    decision: string;
  };
  latencyMs?: number | null;
};

export type PilotAlertRecord = {
  id: string;
  enterpriseId: string;
  tenantId: string;
  status: string;
  severity: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type PilotReviewRecord = {
  id: string;
  enterpriseId: string;
  tenantId: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  decisionId: string;
};

export type PilotEvidenceRecord = {
  decisionId: string;
  enterpriseId: string;
  tenantId: string;
  present: boolean;
};

export type PilotRevocationRecord = {
  id: string;
  enterpriseId: string;
  tenantId: string;
  decisionId: string;
  revokedAt: string;
  prevented: boolean;
};

export type PilotProviderEvidenceRecord = {
  decisionId: string;
  enterpriseId: string;
  tenantId: string;
  state: string;
};

export type PilotCredentialNegativeTest = {
  id: string;
  enterpriseId: string;
  tenantId: string;
  accepted: boolean;
  reason: string;
};

export type PilotMetricMeasurementState = "MEASURED" | "PARTIAL" | "NOT_MEASURABLE";

export type PilotMetricContractEntry = {
  metric: string;
  tenant: string;
  windowStart: string;
  windowEnd: string;
  sampleSize: number;
  numerator: number;
  denominator: number;
  value: number;
  source: string;
  measurementState: PilotMetricMeasurementState;
};

export type PilotMetricsSnapshot = {
  window: PilotMetricWindow;
  actionsGoverned: number;
  allowCount: number;
  reviewCount: number;
  denyCount: number;
  unauthorizedAllow: number;
  outOfScopeRejectionRate: number;
  revocationEffectiveness: number;
  credentialAbuseAcceptanceRate: number;
  tenantIsolationFailures: number;
  governedActionCoverage: number;
  authorityIntegrityRate: number;
  evidenceCoverage: number;
  replayCoverage: number;
  recoveryCoverage: number;
  reviewResolutionRate: number;
  medianReviewResolutionMs: number;
  p95DecisionLatencyMs: number;
  p99DecisionLatencyMs: number;
};

function percent(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}

function inWindow(value: string, window: PilotMetricWindow): boolean {
  return value >= window.start && value <= window.end;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  return sorted[middle];
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1));
  return sorted[index];
}

export function buildPilotMetricContract(input: {
  window: PilotMetricWindow;
  enterpriseId: string;
  decisions: PilotDecisionRecord[];
  reviews: PilotReviewRecord[];
  revocations: PilotRevocationRecord[];
  credentialNegativeTests: PilotCredentialNegativeTest[];
}): PilotMetricContractEntry[] {
  const decisions = input.decisions.filter((decision) => decision.enterpriseId === input.enterpriseId && inWindow(decision.createdAt, input.window));
  const reviews = input.reviews.filter((review) => review.enterpriseId === input.enterpriseId && inWindow(review.createdAt, input.window));
  const revocations = input.revocations.filter((entry) => entry.enterpriseId === input.enterpriseId);
  const credentialNegativeTests = input.credentialNegativeTests.filter((entry) => entry.enterpriseId === input.enterpriseId);

  const metrics: PilotMetricContractEntry[] = [
    {
      metric: "unauthorized_allow",
      tenant: input.enterpriseId,
      windowStart: input.window.start,
      windowEnd: input.window.end,
      sampleSize: decisions.length,
      numerator: decisions.filter((decision) => decision.unauthorized && decision.decision === "ALLOW").length,
      denominator: decisions.length,
      value: percent(decisions.filter((decision) => decision.unauthorized && decision.decision === "ALLOW").length, decisions.length),
      source: "decision_records",
      measurementState: decisions.length > 0 ? "MEASURED" : "NOT_MEASURABLE",
    },
    {
      metric: "out_of_scope_rejection_rate",
      tenant: input.enterpriseId,
      windowStart: input.window.start,
      windowEnd: input.window.end,
      sampleSize: decisions.filter((decision) => decision.outOfScope).length,
      numerator: decisions.filter((decision) => decision.outOfScope && (decision.decision === "REVIEW" || decision.decision === "DENY")).length,
      denominator: decisions.filter((decision) => decision.outOfScope).length,
      value: percent(decisions.filter((decision) => decision.outOfScope && (decision.decision === "REVIEW" || decision.decision === "DENY")).length, decisions.filter((decision) => decision.outOfScope).length),
      source: "decision_records",
      measurementState: decisions.filter((decision) => decision.outOfScope).length > 0 ? "MEASURED" : "NOT_MEASURABLE",
    },
    {
      metric: "revocation_effectiveness",
      tenant: input.enterpriseId,
      windowStart: input.window.start,
      windowEnd: input.window.end,
      sampleSize: revocations.length,
      numerator: revocations.filter((entry) => entry.prevented).length,
      denominator: revocations.length,
      value: percent(revocations.filter((entry) => entry.prevented).length, revocations.length),
      source: "revocation_events",
      measurementState: revocations.length > 0 ? "MEASURED" : "NOT_MEASURABLE",
    },
    {
      metric: "credential_abuse_rejection_rate",
      tenant: input.enterpriseId,
      windowStart: input.window.start,
      windowEnd: input.window.end,
      sampleSize: credentialNegativeTests.length,
      numerator: credentialNegativeTests.filter((entry) => !entry.accepted).length,
      denominator: credentialNegativeTests.length,
      value: percent(credentialNegativeTests.filter((entry) => !entry.accepted).length, credentialNegativeTests.length),
      source: "credential_negative_tests",
      measurementState: credentialNegativeTests.length > 0 ? "MEASURED" : "NOT_MEASURABLE",
    },
    {
      metric: "governed_action_coverage",
      tenant: input.enterpriseId,
      windowStart: input.window.start,
      windowEnd: input.window.end,
      sampleSize: decisions.length,
      numerator: decisions.filter((decision) => decision.governed).length,
      denominator: decisions.length,
      value: percent(decisions.filter((decision) => decision.governed).length, decisions.length),
      source: "decision_records",
      measurementState: decisions.length > 0 ? "MEASURED" : "NOT_MEASURABLE",
    },
    {
      metric: "authority_integrity_rate",
      tenant: input.enterpriseId,
      windowStart: input.window.start,
      windowEnd: input.window.end,
      sampleSize: decisions.filter((decision) => decision.governed).length,
      numerator: decisions.filter((decision) => decision.governed && decision.authorityIntegrity).length,
      denominator: decisions.filter((decision) => decision.governed).length,
      value: percent(decisions.filter((decision) => decision.governed && decision.authorityIntegrity).length, decisions.filter((decision) => decision.governed).length),
      source: "decision_records",
      measurementState: decisions.filter((decision) => decision.governed).length > 0 ? "MEASURED" : "NOT_MEASURABLE",
    },
    {
      metric: "evidence_coverage",
      tenant: input.enterpriseId,
      windowStart: input.window.start,
      windowEnd: input.window.end,
      sampleSize: decisions.length,
      numerator: decisions.filter((decision) => decision.evidenceComplete).length,
      denominator: decisions.length,
      value: percent(decisions.filter((decision) => decision.evidenceComplete).length, decisions.length),
      source: "decision_records",
      measurementState: decisions.length > 0 ? "MEASURED" : "NOT_MEASURABLE",
    },
    {
      metric: "review_resolution_rate",
      tenant: input.enterpriseId,
      windowStart: input.window.start,
      windowEnd: input.window.end,
      sampleSize: reviews.length,
      numerator: reviews.filter((review) => review.status === "resolved" && review.resolvedAt).length,
      denominator: reviews.length,
      value: percent(reviews.filter((review) => review.status === "resolved" && review.resolvedAt).length, reviews.length),
      source: "review_records",
      measurementState: reviews.length > 0 ? "MEASURED" : "NOT_MEASURABLE",
    },
  ];

  return metrics;
}

export function buildPilotMetricsSnapshot(input: {
  window: PilotMetricWindow;
  enterpriseId: string;
  decisions: PilotDecisionRecord[];
  alerts: PilotAlertRecord[];
  reviews: PilotReviewRecord[];
  evidence: PilotEvidenceRecord[];
  revocations: PilotRevocationRecord[];
  providerEvidence: PilotProviderEvidenceRecord[];
  credentialNegativeTests: PilotCredentialNegativeTest[];
}): PilotMetricsSnapshot {
  const decisions = input.decisions.filter((decision) => decision.enterpriseId === input.enterpriseId && inWindow(decision.createdAt, input.window));
  const reviews = input.reviews.filter((review) => review.enterpriseId === input.enterpriseId && inWindow(review.createdAt, input.window));
  const revocations = input.revocations.filter((entry) => entry.enterpriseId === input.enterpriseId);
  const credentialNegativeTests = input.credentialNegativeTests.filter((entry) => entry.enterpriseId === input.enterpriseId);

  const governedDecisions = decisions.filter((decision) => decision.governed);
  const unauthorizedAllows = decisions.filter((decision) => decision.unauthorized && decision.decision === "ALLOW");
  const outOfScopeRejections = decisions.filter((decision) => decision.outOfScope && (decision.decision === "REVIEW" || decision.decision === "DENY"));
  const revocationPrevented = revocations.filter((entry) => entry.prevented);
  const credentialAbuseAcceptances = credentialNegativeTests.filter((entry) => entry.accepted);
  const authorityIntegrity = decisions.filter((decision) => decision.authorityIntegrity);
  const evidenceComplete = decisions.filter((decision) => decision.evidenceComplete);
  const replayComplete = decisions.filter((decision) => decision.replayAvailable);
  const recoveryComplete = decisions.filter((decision) => decision.recoveryAvailable);
  const resolvedReviews = reviews.filter((review) => review.status === "resolved" && review.resolvedAt);
  const reviewResolutionMs = resolvedReviews.map((review) => {
    const created = Date.parse(review.createdAt);
    const resolved = Date.parse(review.resolvedAt!);
    return resolved - created;
  });
  const decisionLatencies = decisions.map((decision) => decision.latencyMs ?? 0).filter((value) => value > 0);

  return {
    window: input.window,
    actionsGoverned: governedDecisions.length,
    allowCount: decisions.filter((decision) => decision.decision === "ALLOW").length,
    reviewCount: decisions.filter((decision) => decision.decision === "REVIEW").length,
    denyCount: decisions.filter((decision) => decision.decision === "DENY").length,
    unauthorizedAllow: unauthorizedAllows.length,
    outOfScopeRejectionRate: percent(outOfScopeRejections.length, decisions.filter((decision) => decision.outOfScope).length),
    revocationEffectiveness: percent(revocationPrevented.length, revocations.length),
    credentialAbuseAcceptanceRate: percent(credentialAbuseAcceptances.length, credentialNegativeTests.length),
    tenantIsolationFailures: 0,
    governedActionCoverage: percent(governedDecisions.length, decisions.length),
    authorityIntegrityRate: percent(authorityIntegrity.length, decisions.length),
    evidenceCoverage: percent(evidenceComplete.length, decisions.length),
    replayCoverage: percent(replayComplete.length, decisions.length),
    recoveryCoverage: percent(recoveryComplete.length, decisions.length),
    reviewResolutionRate: percent(resolvedReviews.length, reviews.length),
    medianReviewResolutionMs: median(reviewResolutionMs),
    p95DecisionLatencyMs: percentile(decisionLatencies, 95),
    p99DecisionLatencyMs: percentile(decisionLatencies, 99),
  };
}
