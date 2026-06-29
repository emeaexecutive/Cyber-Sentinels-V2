import type {
  BenchmarkObservation,
  BenchmarkObservationKind,
} from "@/lib/benchmarking/types";

export type NetworkSignalSource =
  | "provider-backed"
  | "governance-derived"
  | "replay-derived"
  | "simulated"
  | "aggregated";

export type NetworkRiskCategory =
  | "repeated_anomaly_patterns"
  | "provider_degradation"
  | "workflow_interruptions"
  | "session_integrity_instability"
  | "replay_divergence"
  | "governance_escalation_density";

export type NetworkIntelligenceSignal = {
  id: NetworkRiskCategory;
  label: string;
  count: number | null;
  suppressed: boolean;
  trend: "increasing" | "stable" | "decreasing" | "insufficient_evidence";
  whatChanged: string;
  whyItMatters: string;
  evidenceCategory: string;
  sourceClasses: NetworkSignalSource[];
  advisory: string;
};

export type NetworkIntelligenceSummary = {
  generatedAt: string;
  observationCount: number;
  minimumCohortSize: number;
  workflowCategoryCount: number;
  signals: NetworkIntelligenceSignal[];
  providerReliability: Array<{
    provider: string;
    observations: number;
    failures: number;
    reviewRequired: number;
    summary: string;
  }>;
  boundaries: {
    aggregatedOnly: true;
    identitiesExcluded: true;
    rawBiometricsExcluded: true;
    crossOrganizationIdentitySharing: false;
    publicIdentityScoring: false;
    automaticAccusation: false;
  };
};

type SignalDefinition = {
  id: NetworkRiskCategory;
  label: string;
  kinds: BenchmarkObservationKind[];
  failureOnly?: boolean;
  whyItMatters: string;
  evidenceCategory: string;
  sourceClasses: NetworkSignalSource[];
  advisory: string;
};

const definitions: SignalDefinition[] = [
  {
    id: "repeated_anomaly_patterns",
    label: "Repeated workflow anomalies",
    kinds: ["proxy_candidate_review", "media_mismatch_review", "trust_degradation"],
    whyItMatters:
      "Repeated categories can justify shared defensive guidance without identifying a person or organization.",
    evidenceCategory: "workflow anomaly categories",
    sourceClasses: ["governance-derived", "aggregated"],
    advisory: "Review workflow controls and preserve evidence before changing access or outcomes.",
  },
  {
    id: "provider_degradation",
    label: "Provider instability",
    kinds: ["provider_verification"],
    failureOnly: true,
    whyItMatters:
      "Provider degradation can weaken evidence continuity across workflows without determining identity truth.",
    evidenceCategory: "normalized provider outcomes",
    sourceClasses: ["provider-backed", "aggregated"],
    advisory: "Use fallback verification and route unstable provider evidence to human review.",
  },
  {
    id: "workflow_interruptions",
    label: "Workflow interruption trends",
    kinds: ["workflow_completion"],
    failureOnly: true,
    whyItMatters:
      "Interruption trends help operators distinguish isolated failures from recurring workflow friction.",
    evidenceCategory: "workflow completion outcomes",
    sourceClasses: ["governance-derived", "aggregated"],
    advisory: "Inspect workflow chronology before changing policy thresholds.",
  },
  {
    id: "session_integrity_instability",
    label: "Session integrity anomaly clusters",
    kinds: ["session_integrity_failure"],
    whyItMatters:
      "Aggregated session categories support control review without sharing behavioral or biometric profiles.",
    evidenceCategory: "session integrity outcomes",
    sourceClasses: ["governance-derived", "aggregated"],
    advisory: "Require session evidence and named review for affected high-assurance workflows.",
  },
  {
    id: "replay_divergence",
    label: "Replay anomaly frequency",
    kinds: ["replay_reconstruction"],
    failureOnly: true,
    whyItMatters:
      "Chronology divergence can reduce confidence in later reconstruction and governance defensibility.",
    evidenceCategory: "canonical replay outcomes",
    sourceClasses: ["replay-derived", "aggregated"],
    advisory: "Preserve source chronology and review divergence before relying on a replay summary.",
  },
  {
    id: "governance_escalation_density",
    label: "Governance escalation density",
    kinds: ["governance_escalation"],
    whyItMatters:
      "Escalation density shows where human oversight is being used without treating review as proof of wrongdoing.",
    evidenceCategory: "governance routing outcomes",
    sourceClasses: ["governance-derived", "aggregated"],
    advisory: "Check reviewer capacity, ownership and resolution continuity.",
  },
];

function isAdverse(observation: BenchmarkObservation) {
  return ["observed_failure", "review_required", "pending"].includes(
    observation.outcome
  );
}

function trendFor(observations: BenchmarkObservation[]) {
  if (observations.length < 4) return "insufficient_evidence" as const;
  const ordered = [...observations].sort(
    (left, right) =>
      new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()
  );
  const split = Math.floor(ordered.length / 2);
  const prior = ordered.slice(0, split).filter(isAdverse).length;
  const recent = ordered.slice(split).filter(isAdverse).length;
  if (recent === prior) return "stable" as const;
  return recent > prior ? ("increasing" as const) : ("decreasing" as const);
}

export function aggregateNetworkIntelligence(
  source: BenchmarkObservation[],
  options: { minimumCohortSize?: number; simulated?: boolean } = {}
): NetworkIntelligenceSummary {
  const minimumCohortSize = Math.max(3, options.minimumCohortSize ?? 3);
  const observations = source.filter(
    (item) => item.simulated === Boolean(options.simulated)
  );
  const simulationSources: NetworkSignalSource[] = options.simulated
    ? ["simulated"]
    : [];

  const signals = definitions.map((definition): NetworkIntelligenceSignal => {
    const matched = observations.filter(
      (item) =>
        definition.kinds.includes(item.kind) &&
        (!definition.failureOnly || isAdverse(item))
    );
    const suppressed = matched.length > 0 && matched.length < minimumCohortSize;
    const visibleCount = suppressed ? null : matched.length;
    return {
      id: definition.id,
      label: definition.label,
      count: visibleCount,
      suppressed,
      trend: suppressed ? "insufficient_evidence" : trendFor(matched),
      whatChanged: suppressed
        ? `A small cohort was observed and suppressed below the minimum aggregation threshold of ${minimumCohortSize}.`
        : `${matched.length} aggregated ${definition.evidenceCategory} observation(s) were retained in this authorized window.`,
      whyItMatters: definition.whyItMatters,
      evidenceCategory: definition.evidenceCategory,
      sourceClasses: [
        ...definition.sourceClasses,
        ...simulationSources,
      ],
      advisory: definition.advisory,
    };
  });

  const byProvider = new Map<string, BenchmarkObservation[]>();
  observations
    .filter((item) => item.provider)
    .forEach((item) => {
      const provider = String(item.provider);
      byProvider.set(provider, [...(byProvider.get(provider) ?? []), item]);
    });
  const providerReliability = [...byProvider.entries()]
    .filter(([, items]) => items.length >= minimumCohortSize)
    .map(([provider, items]) => {
      const failures = items.filter((item) => item.outcome === "observed_failure").length;
      const reviewRequired = items.filter((item) => item.outcome === "review_required").length;
      return {
        provider,
        observations: items.length,
        failures,
        reviewRequired,
        summary: `${items.length} normalized workflow observations; ${failures} failure outcome(s) and ${reviewRequired} review-required outcome(s). This is operational history, not an accuracy rating.`,
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    observationCount: observations.length,
    minimumCohortSize,
    workflowCategoryCount: new Set(
      observations.map((item) => item.workflowType).filter(Boolean)
    ).size,
    signals,
    providerReliability,
    boundaries: {
      aggregatedOnly: true,
      identitiesExcluded: true,
      rawBiometricsExcluded: true,
      crossOrganizationIdentitySharing: false,
      publicIdentityScoring: false,
      automaticAccusation: false,
    },
  };
}
