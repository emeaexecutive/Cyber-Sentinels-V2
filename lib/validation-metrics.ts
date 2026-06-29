import type {
  BenchmarkObservation,
  BenchmarkObservationKind,
  ExplainableMetric,
} from "@/lib/benchmarking/types";

export const VALIDATION_METRICS_BOUNDARY = {
  deterministic: true,
  operationalCoverageNotAccuracy: true,
  biometricCertainty: false,
  autonomousTruthClaim: false,
} as const;

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function observationsFor(
  observations: BenchmarkObservation[],
  kind: BenchmarkObservationKind
) {
  return observations.filter((observation) => observation.kind === kind);
}

function metric(input: {
  id: string;
  label: string;
  observations: BenchmarkObservation[];
  denominator?: number | null;
  whatHappened: string;
  whyTrustChanged: string;
  boundary: string;
}): ExplainableMetric {
  const denominator = input.denominator ?? null;
  return {
    id: input.id,
    label: input.label,
    value: input.observations.length,
    denominator,
    displayValue:
      denominator === null
        ? String(input.observations.length)
        : `${input.observations.length} / ${denominator}`,
    whatHappened: input.whatHappened,
    evidenceContributed: unique(
      input.observations.flatMap((observation) => observation.evidenceReferences)
    ),
    governanceAction:
      unique(input.observations.map((observation) => observation.governanceAction)).join(
        "; "
      ) || "No linked governance action in this measurement window.",
    whyTrustChanged: input.whyTrustChanged,
    boundary: input.boundary,
  };
}

export function buildValidationMetrics(
  observations: BenchmarkObservation[]
): ExplainableMetric[] {
  const provider = observationsFor(observations, "provider_verification");
  const providerSuccess = provider.filter(
    (observation) => observation.outcome === "observed_success"
  );
  const governance = observationsFor(observations, "governance_escalation");
  const replay = observationsFor(observations, "replay_reconstruction");
  const replayCompleted = replay.filter(
    (observation) => observation.outcome === "completed"
  );
  const sessionFailures = observationsFor(
    observations,
    "session_integrity_failure"
  );
  const degradation = observationsFor(observations, "trust_degradation");
  const falsePositives = observationsFor(observations, "false_positive_review");
  const falseNegatives = observationsFor(
    observations,
    "false_negative_investigation"
  );
  const completions = observationsFor(observations, "workflow_completion");
  const qualityCompletions = completions.filter(
    (observation) =>
      observation.outcome === "completed" &&
      observation.evidenceReferences.length > 0 &&
      Boolean(observation.governanceAction)
  );

  return [
    metric({
      id: "provider-success",
      label: "Provider verification success",
      observations: providerSuccess,
      denominator: provider.length,
      whatHappened: `${providerSuccess.length} provider-backed workflow result(s) were retained as successful across ${provider.length} observed provider result(s).`,
      whyTrustChanged:
        "Provider state can strengthen or weaken workflow evidence, while governance remains authoritative.",
      boundary: "Observed workflow statuses; not provider accuracy or biometric certainty.",
    }),
    metric({
      id: "governance-escalations",
      label: "Governance escalations",
      observations: governance,
      whatHappened: `${governance.length} workflow escalation event(s) required accountable review.`,
      whyTrustChanged:
        "Escalation records where thresholds or evidence gaps changed workflow routing.",
      boundary: "Escalation is review context, not an accusation.",
    }),
    metric({
      id: "replay-reconstructions",
      label: "Replay reconstructions",
      observations: replayCompleted,
      denominator: replay.length,
      whatHappened: `${replayCompleted.length} replay reconstruction(s) completed across ${replay.length} retained replay attempt(s).`,
      whyTrustChanged:
        "Replay continuity determines whether evidence and governance history remain reconstructable.",
      boundary: "Measures reconstruction coverage, not truth.",
    }),
    metric({
      id: "session-failures",
      label: "Session integrity failures",
      observations: sessionFailures,
      whatHappened: `${sessionFailures.length} session continuity or integrity failure event(s) were retained.`,
      whyTrustChanged:
        "Session integrity changes can route a workflow to review without invalidating identity evidence.",
      boundary: "Failure is a workflow state requiring review, not proof of fraud.",
    }),
    metric({
      id: "trust-degradation",
      label: "Trust degradation events",
      observations: degradation,
      whatHappened: `${degradation.length} evidence-linked negative trust movement event(s) were observed.`,
      whyTrustChanged:
        "A recorded score or posture movement shows operational change over time.",
      boundary: "Deterministic trend count; not a universal judgment about a person.",
    }),
    metric({
      id: "false-positive-reviews",
      label: "False positive reviews",
      observations: falsePositives,
      whatHappened: `${falsePositives.length} reviewer-confirmed false-positive outcome(s) were retained.`,
      whyTrustChanged:
        "Reviewer correction provides evidence for threshold and workflow-quality improvement.",
      boundary: "Count only; no rate is claimed without a defined denominator.",
    }),
    metric({
      id: "false-negative-investigations",
      label: "False negative investigations",
      observations: falseNegatives,
      whatHappened: `${falseNegatives.length} explicit missed-signal investigation(s) were retained.`,
      whyTrustChanged:
        "Investigations identify gaps that require evidence and governance review.",
      boundary: "Investigation count; not a detection accuracy claim.",
    }),
    metric({
      id: "workflow-completion-quality",
      label: "Workflow completion quality",
      observations: qualityCompletions,
      denominator: completions.length,
      whatHappened: `${qualityCompletions.length} completed workflow(s) retained both evidence and governance context across ${completions.length} completion event(s).`,
      whyTrustChanged:
        "Evidence and reviewer continuity make completed workflows more defensible and replayable.",
      boundary: "Operational completeness coverage, not outcome correctness.",
    }),
  ];
}
