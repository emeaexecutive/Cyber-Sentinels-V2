import type {
  BenchmarkObservation,
  ProviderBenchmark,
  WorkflowRiskBenchmark,
} from "@/lib/benchmarking/types";

export type BenchmarkSummary = {
  providerComparison: ProviderBenchmark[];
  workflowRiskComparison: WorkflowRiskBenchmark[];
  replayContinuityScore: number;
  governanceResponseCoverage: number;
  anomalyFrequency: number;
  sessionIntegrityTrend: "improving" | "stable" | "degrading" | "insufficient_evidence";
  boundary: string;
};

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function groupBy<T>(values: T[], key: (value: T) => string) {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const group = key(value);
    groups.set(group, [...(groups.get(group) ?? []), value]);
  }
  return groups;
}

function time(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function compareProviders(
  observations: BenchmarkObservation[]
): ProviderBenchmark[] {
  const providerObservations = observations.filter(
    (observation) =>
      observation.kind === "provider_verification" && observation.provider
  );
  return [...groupBy(providerObservations, (item) => item.provider ?? "Unknown").entries()]
    .map(([provider, rows]) => ({
      provider,
      observedWorkflows: rows.length,
      observedSuccesses: rows.filter(
        (row) => row.outcome === "observed_success"
      ).length,
      observedFailures: rows.filter(
        (row) => row.outcome === "observed_failure"
      ).length,
      reviewRequired: rows.filter(
        (row) => row.outcome === "review_required"
      ).length,
      evidenceCoverage: percent(
        rows.filter((row) => row.evidenceReferences.length > 0).length,
        rows.length
      ),
      explanation:
        "Compares observed provider workflow states and evidence coverage. It does not compare biometric or detection accuracy.",
    }))
    .sort(
      (left, right) =>
        right.observedWorkflows - left.observedWorkflows ||
        left.provider.localeCompare(right.provider)
    );
}

export function compareWorkflowRisk(
  observations: BenchmarkObservation[]
): WorkflowRiskBenchmark[] {
  return [...groupBy(observations, (item) => item.workflowType || "unknown").entries()]
    .map(([workflowType, rows]) => {
      const completions = rows.filter(
        (row) => row.kind === "workflow_completion"
      );
      const qualityCompletions = completions.filter(
        (row) =>
          row.outcome === "completed" &&
          row.evidenceReferences.length > 0 &&
          Boolean(row.governanceAction)
      );
      return {
        workflowType,
        observations: rows.length,
        escalations: rows.filter(
          (row) => row.kind === "governance_escalation"
        ).length,
        anomalies: rows.filter((row) =>
          [
            "session_integrity_failure",
            "trust_degradation",
            "proxy_candidate_review",
            "media_mismatch_review",
          ].includes(row.kind)
        ).length,
        completed: completions.length,
        completionQuality: percent(qualityCompletions.length, completions.length),
        explanation:
          "Operational comparison of retained events, escalation and completion coverage; not a ranking of people.",
      };
    })
    .sort((left, right) => right.observations - left.observations);
}

export function buildBenchmarkSummary(
  observations: BenchmarkObservation[]
): BenchmarkSummary {
  const replay = observations.filter(
    (observation) => observation.kind === "replay_reconstruction"
  );
  const governance = observations.filter(
    (observation) => observation.kind === "governance_escalation"
  );
  const anomalies = observations.filter((observation) =>
    ["session_integrity_failure", "trust_degradation"].includes(
      observation.kind
    )
  );
  const sessions = observations
    .filter((observation) => observation.kind === "session_integrity_failure")
    .sort((left, right) => time(left.occurredAt) - time(right.occurredAt));
  const midpoint = Math.ceil(sessions.length / 2);
  const earlierValues = sessions
    .slice(0, midpoint)
    .map((item) => item.trustDelta)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const laterValues = sessions
    .slice(midpoint)
    .map((item) => item.trustDelta)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const average = (values: number[]) =>
    values.length
      ? values.reduce((total, value) => total + value, 0) / values.length
      : null;
  const earlier = average(earlierValues);
  const later = average(laterValues);
  const sessionIntegrityTrend =
    earlier === null || later === null
      ? "insufficient_evidence"
      : later > earlier + 2
        ? "improving"
        : later < earlier - 2
          ? "degrading"
          : "stable";

  return {
    providerComparison: compareProviders(observations),
    workflowRiskComparison: compareWorkflowRisk(observations),
    replayContinuityScore: percent(
      replay.filter(
        (observation) =>
          observation.outcome === "completed" &&
          observation.evidenceReferences.length > 0
      ).length,
      replay.length
    ),
    governanceResponseCoverage: percent(
      governance.filter((observation) => observation.governanceAction).length,
      governance.length
    ),
    anomalyFrequency: observations.length
      ? Math.round((anomalies.length / observations.length) * 100)
      : 0,
    sessionIntegrityTrend,
    boundary:
      "Benchmark results describe retained workflow coverage and review outcomes. They are not model-accuracy, fraud-detection or identity-certainty claims.",
  };
}

export type * from "@/lib/benchmarking/types";
