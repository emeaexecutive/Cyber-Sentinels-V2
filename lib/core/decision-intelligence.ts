import type {
  ExplainableTrustDecision,
  TrustExplanation,
} from "../trust-explanation/explanation.ts";
import type { ProviderReadinessCheck } from "../providers/provider-readiness.ts";
import type { ReviewedOutcomeRecord } from "../governance/reviewed-outcomes.ts";
import type { TrustMemoryEvent } from "../trust-memory/trust-memory.ts";

export type DecisionProviderStatus =
  | "Used"
  | "Ignored"
  | "Unavailable"
  | "Timed Out"
  | "Awaiting Credentials";

export type DecisionIntelligenceTimelineStage =
  | "Event"
  | "Evidence"
  | "Decision"
  | "Governance"
  | "Trust Memory"
  | "Final Outcome";

export type DecisionIntelligenceInput = {
  explanation: TrustExplanation;
  providerReadiness?: ProviderReadinessCheck[];
  reviewedOutcomes?: ReviewedOutcomeRecord[];
  trustMemoryEvents?: TrustMemoryEvent[];
  generatedAt?: string;
};

export type DecisionProviderInput = {
  provider: string;
  status: DecisionProviderStatus;
  summary: string;
  evidenceReferences: string[];
  limitations: string[];
};

export type DecisionIntelligence = {
  schemaVersion: 1;
  release: "0.7";
  decision: ExplainableTrustDecision;
  confidence: number;
  decision_summary: string;
  primary_reasons: string[];
  supporting_evidence: string[];
  runtime_factors: string[];
  provider_inputs: DecisionProviderInput[];
  governance_inputs: Array<{
    policy: string;
    status: string;
    rationale: string;
  }>;
  trust_memory_inputs: Array<{
    id: string;
    contribution: string;
    improves_future_explanations: boolean;
    improves_future_confidence: boolean;
    improves_future_governance_recommendations: boolean;
    policy_auto_changed: false;
  }>;
  evidence_graph_inputs: Array<{
    relationship: string;
    source: string;
    confidence: number | null;
    replayReference: string | null;
  }>;
  limitations: string[];
  recommended_next_action: string;
  enterprise_card: {
    decision: ExplainableTrustDecision;
    confidence_label: string;
    top_reasons: string[];
    evidence_count: number;
    replay_available: boolean;
    governance_status: string;
    human_review_status: string;
    next_recommended_action: string;
  };
  timeline: Array<{
    id: string;
    stage: DecisionIntelligenceTimelineStage;
    label: string;
    detail: string;
    timestamp: string;
  }>;
  alternative_outcomes: Array<{
    outcome: ExplainableTrustDecision;
    why_not: string;
  }>;
  boundary: string;
};

function now() {
  return new Date().toISOString();
}

function clean(value: unknown, fallback = "Not recorded") {
  const text = String(value ?? "").trim();
  return text ? text.replaceAll("_", " ") : fallback;
}

function confidenceLabel(confidence: number) {
  const percent = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  return `${percent}%`;
}

function providerStatus(check: ProviderReadinessCheck, used: boolean): DecisionProviderStatus {
  if (used) return "Used";
  if (check.runtimeState === "Awaiting Credentials") return "Awaiting Credentials";
  if (check.runtimeState === "Disabled") return "Unavailable";
  if (check.timeoutHandlingImplemented && check.health === "blocked") return "Timed Out";
  return "Ignored";
}

function recommendedAction(decision: ExplainableTrustDecision, hasReplay: boolean, governanceStatus: string) {
  if (decision === "BLOCK") return "Keep the workflow stopped, preserve replay and assign governance owner.";
  if (decision === "ESCALATE") return "Route to senior governance review with evidence and provider limitations attached.";
  if (decision === "REVIEW") return "Assign human review, request missing evidence and keep replay open.";
  if (!hasReplay) return "Allow only after replay evidence is attached to the decision record.";
  if (/pending|review|escalat/i.test(governanceStatus)) return "Allow conditionally while governance review remains visible.";
  return "Proceed with the allowed workflow and retain the decision package for audit.";
}

function whyNotOutcome(decision: ExplainableTrustDecision, outcome: ExplainableTrustDecision) {
  if (decision === outcome) return "";
  if (outcome === "ALLOW") return "The record still contains review, governance or limitation context that prevents treating the decision as unconditional.";
  if (outcome === "REVIEW") return "The available evidence and governance state already justify a clearer enterprise action than ordinary review.";
  if (outcome === "ESCALATE") return "No senior escalation trigger is stronger than the selected outcome in the available record.";
  return "Blocking requires stronger stop evidence than the current provider, governance and Trust Memory context shows.";
}

function reviewedOutcomeInputs(records: ReviewedOutcomeRecord[]) {
  return records.slice(0, 8).map((record) => ({
    id: record.caseId,
    contribution: record.calibrationContribution.reason,
    improves_future_explanations: Boolean(record.reviewedOutcome || record.reviewerId || record.governanceOverride),
    improves_future_confidence: record.calibrationContribution.eligible,
    improves_future_governance_recommendations: Boolean(record.governanceOutcome || record.governanceOverride || record.confirmedEscalation),
    policy_auto_changed: false as const,
  }));
}

export function buildDecisionIntelligence(input: DecisionIntelligenceInput): DecisionIntelligence {
  const { explanation } = input;
  const generatedAt = input.generatedAt ?? now();
  const usedProviderNames = new Set(explanation.providers.map((provider) => provider.provider.toLowerCase()));
  const providerInputs: DecisionProviderInput[] = [
    ...explanation.providers.map((provider) => ({
      provider: provider.provider,
      status: "Used" as const,
      summary: provider.summary,
      evidenceReferences: provider.evidenceReferences,
      limitations: provider.state.toLowerCase().includes("failed")
        ? ["Provider returned a failed state and must remain review context."]
        : ["Provider output is evidence, not a final decision."],
    })),
    ...(input.providerReadiness ?? [])
      .filter((check) => !usedProviderNames.has(check.name.toLowerCase()))
      .slice(0, 6)
      .map((check) => ({
        provider: check.name,
        status: providerStatus(check, false),
        summary: check.evidence,
        evidenceReferences: [],
        limitations: [...check.limitations, check.blocker].filter(Boolean).slice(0, 4),
      })),
  ];
  const governanceStatus = clean(explanation.governancePolicy.outcome, "not recorded");
  const replayAvailable = Boolean(explanation.replayReference || explanation.evidence.some((item) => /replay/i.test(item)));
  const recommended = recommendedAction(explanation.decision, replayAvailable, governanceStatus);
  const reviewedInputs = reviewedOutcomeInputs(input.reviewedOutcomes ?? []);
  const memoryInputs = explanation.trustMemoryEvents.map((event) => ({
    id: event.id,
    contribution: `${event.eventKind}: ${event.stateBefore} -> ${event.stateAfter}. ${event.reason}`,
    improves_future_explanations: true,
    improves_future_confidence: true,
    improves_future_governance_recommendations: /review|governance|approved|blocked|restored/i.test(event.eventKind),
    policy_auto_changed: false as const,
  }));
  const trustMemoryInputs = [...memoryInputs, ...reviewedInputs].slice(0, 12);
  const timeline = [
    {
      id: "event",
      stage: "Event" as const,
      label: `${explanation.workflow.subjectType} event recorded`,
      detail: explanation.workflow.subjectId,
      timestamp: generatedAt,
    },
    {
      id: "evidence",
      stage: "Evidence" as const,
      label: `${explanation.evidence.length} evidence reference(s) attached`,
      detail: explanation.evidence.slice(0, 4).join(", ") || "Evidence not yet attached.",
      timestamp: generatedAt,
    },
    {
      id: "decision",
      stage: "Decision" as const,
      label: `Decision: ${explanation.decision}`,
      detail: explanation.why[0] ?? "Decision reason not recorded.",
      timestamp: generatedAt,
    },
    {
      id: "governance",
      stage: "Governance" as const,
      label: explanation.governancePolicy.policyName,
      detail: `${governanceStatus}: ${explanation.governancePolicy.rationale}`,
      timestamp: generatedAt,
    },
    {
      id: "trust-memory",
      stage: "Trust Memory" as const,
      label: `${trustMemoryInputs.length} contribution(s) retained`,
      detail: trustMemoryInputs[0]?.contribution ?? "No reviewed Trust Memory contribution yet.",
      timestamp: generatedAt,
    },
    {
      id: "final-outcome",
      stage: "Final Outcome" as const,
      label: explanation.decision,
      detail: recommended,
      timestamp: generatedAt,
    },
  ];
  const limitations = [
    explanation.boundary,
    "Reviewed outcomes improve future explanations, confidence and recommendations only inside guarded calibration context.",
    "Reviewed outcomes do not automatically change enterprise policy.",
    ...providerInputs.flatMap((provider) => provider.limitations).slice(0, 8),
  ];

  return {
    schemaVersion: 1,
    release: "0.7",
    decision: explanation.decision,
    confidence: explanation.confidence,
    decision_summary: `${explanation.decision} with ${confidenceLabel(explanation.confidence)} confidence because ${explanation.why[0] ?? "recorded evidence supports the selected enterprise action."}`,
    primary_reasons: explanation.why.slice(0, 6),
    supporting_evidence: explanation.evidence,
    runtime_factors: explanation.runtimeSignals,
    provider_inputs: providerInputs,
    governance_inputs: [{
      policy: explanation.governancePolicy.policyName,
      status: governanceStatus,
      rationale: explanation.governancePolicy.rationale,
    }],
    trust_memory_inputs: trustMemoryInputs,
    evidence_graph_inputs: explanation.evidenceGraphRelationships.map((relationship) => ({
      relationship: relationship.relationship,
      source: relationship.source,
      confidence: relationship.confidence,
      replayReference: relationship.replayReference,
    })),
    limitations: [...new Set(limitations)].slice(0, 12),
    recommended_next_action: recommended,
    enterprise_card: {
      decision: explanation.decision,
      confidence_label: confidenceLabel(explanation.confidence),
      top_reasons: explanation.why.slice(0, 3),
      evidence_count: explanation.evidence.length,
      replay_available: replayAvailable,
      governance_status: governanceStatus,
      human_review_status: trustMemoryInputs.length || /review|approved|blocked|escalat/i.test(governanceStatus)
        ? "Review context available"
        : "No reviewed outcome yet",
      next_recommended_action: recommended,
    },
    timeline,
    alternative_outcomes: (["ALLOW", "REVIEW", "ESCALATE", "BLOCK"] as const)
      .filter((outcome) => outcome !== explanation.decision)
      .map((outcome) => ({ outcome, why_not: whyNotOutcome(explanation.decision, outcome) })),
    boundary:
      "Decision Intelligence turns existing trust evidence into an enterprise decision record. It does not expose raw algorithm output, hide provider limitations or automatically change policy.",
  };
}
