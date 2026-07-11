import type { TrustTransparencyReport } from "../trust-transparency";
import type { TrustDecision } from "../trust/decision-engine";
import type { ReviewedOutcomeRecord } from "../governance/reviewed-outcomes";
import type { TrustMemoryEvent } from "../trust-memory/trust-memory";
import type { EvidenceGraph } from "../evidence-graph/evidence-graph";
import { runEvidenceGraphQueries } from "../evidence-graph/query.ts";

export type ExplainableTrustDecision = "ALLOW" | "REVIEW" | "ESCALATE" | "BLOCK";

export type TrustExplanationInput = {
  workflow: {
    subjectType: string;
    subjectId: string;
  };
  decision: TrustDecision | ExplainableTrustDecision;
  reason: string;
  confidence: number;
  evidence: string[];
  providers: Array<{
    provider: string;
    state: string;
    summary: string;
    evidenceReferences: string[];
  }>;
  runtimeSignals: string[];
  governancePolicy: {
    policyId: string;
    policyName: string;
    outcome: string;
    rationale: string;
  };
  reviewedOutcomes: ReviewedOutcomeRecord[];
  trustMemoryEvents: TrustMemoryEvent[];
  evidenceGraph: EvidenceGraph;
  replayReference: string | null;
  transparencyReport?: TrustTransparencyReport;
};

export type TrustExplanationTimelineEvent = {
  id: string;
  label: string;
  detail: string;
  timestamp: string;
  source: string;
  decisionImpact: "supports" | "review" | "escalates" | "blocks" | "context";
};

export type TrustExplanation = {
  schemaVersion: 1;
  release: "0.6";
  question: "Why was this trusted?";
  answer: "Explained" | "Not enough evidence";
  decision: ExplainableTrustDecision;
  confidence: number;
  workflow: TrustExplanationInput["workflow"];
  why: string[];
  evidence: string[];
  providers: TrustExplanationInput["providers"];
  runtimeSignals: string[];
  governancePolicy: TrustExplanationInput["governancePolicy"];
  reviewedOutcomes: Array<{
    caseId: string;
    outcomeType: string;
    reviewerId: string | null;
    calibrationEligible: boolean;
    evidenceReferences: string[];
  }>;
  trustMemoryEvents: Array<{
    id: string;
    eventKind: string;
    stateBefore: string;
    stateAfter: string;
    reason: string;
    replayRefs: string[];
  }>;
  evidenceGraphRelationships: Array<{
    id: string;
    relationship: string;
    source: string;
    replayReference: string | null;
    confidence: number;
  }>;
  timeline: TrustExplanationTimelineEvent[];
  replayReference: string | null;
  boundary: string;
};

function normalizeDecision(decision: TrustDecision | ExplainableTrustDecision): ExplainableTrustDecision {
  const value = String(decision).toLowerCase();
  if (value === "allow") return "ALLOW";
  if (value === "escalate") return "ESCALATE";
  if (value === "block") return "BLOCK";
  return "REVIEW";
}

function boundedConfidence(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function eventTime(value?: string | null) {
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function decisionImpact(decision: ExplainableTrustDecision): TrustExplanationTimelineEvent["decisionImpact"] {
  if (decision === "ALLOW") return "supports";
  if (decision === "ESCALATE") return "escalates";
  if (decision === "BLOCK") return "blocks";
  return "review";
}

export function buildTrustExplanation(input: TrustExplanationInput): TrustExplanation {
  const decision = normalizeDecision(input.decision);
  const graphQueries = runEvidenceGraphQueries(input.evidenceGraph);
  const graphRelationships = graphQueries.explainTrust.supportingRelationships.length
    ? graphQueries.explainTrust.supportingRelationships
    : input.evidenceGraph.relationships.slice(0, 12);
  const evidence = [...new Set([
    ...input.evidence,
    ...(input.transparencyReport?.decisionExplanation.evidenceContributed ?? []),
    ...input.providers.flatMap((provider) => provider.evidenceReferences),
  ])].filter(Boolean);
  const why = [
    input.reason,
    input.transparencyReport?.decisionExplanation.whyTrustShifted,
    input.governancePolicy.rationale,
    graphQueries.explainTrust.explanation,
  ].filter((item): item is string => Boolean(item));
  const timeline: TrustExplanationTimelineEvent[] = [
    ...input.providers.map((provider, index) => ({
      id: `provider-${index}`,
      label: `${provider.provider} evidence`,
      detail: `${provider.state}: ${provider.summary}`,
      timestamp: eventTime(),
      source: "provider",
      decisionImpact: provider.state === "failed" ? "escalates" as const : "supports" as const,
    })),
    ...input.runtimeSignals.map((signal, index) => ({
      id: `runtime-${index}`,
      label: "Runtime signal",
      detail: signal,
      timestamp: eventTime(),
      source: "runtime",
      decisionImpact: "context" as const,
    })),
    ...input.reviewedOutcomes.slice(0, 8).map((outcome) => ({
      id: `reviewed-${outcome.caseId}`,
      label: "Reviewed outcome",
      detail: `${outcome.outcomeType}; calibration eligible: ${outcome.calibrationContribution.eligible}`,
      timestamp: eventTime(),
      source: "reviewed_outcome",
      decisionImpact: outcome.falsePositive || outcome.falseNegative ? "review" as const : "supports" as const,
    })),
    ...input.trustMemoryEvents.slice(0, 8).map((event) => ({
      id: event.id,
      label: `Trust Memory: ${event.event_kind}`,
      detail: `${event.trust_state_before} -> ${event.trust_state_after}. ${event.reason}`,
      timestamp: eventTime(event.created_at),
      source: "trust_memory",
      decisionImpact: event.trust_delta < 0 ? "review" as const : "supports" as const,
    })),
    {
      id: "decision",
      label: `Decision: ${decision}`,
      detail: input.reason,
      timestamp: eventTime(),
      source: "trust_engine",
      decisionImpact: decisionImpact(decision),
    },
  ].sort((left, right) => left.timestamp.localeCompare(right.timestamp));

  return {
    schemaVersion: 1,
    release: "0.6",
    question: "Why was this trusted?",
    answer: evidence.length || graphRelationships.length || input.trustMemoryEvents.length ? "Explained" : "Not enough evidence",
    decision,
    confidence: boundedConfidence(input.confidence),
    workflow: input.workflow,
    why,
    evidence,
    providers: input.providers,
    runtimeSignals: input.runtimeSignals,
    governancePolicy: input.governancePolicy,
    reviewedOutcomes: input.reviewedOutcomes.slice(0, 12).map((outcome) => ({
      caseId: outcome.caseId,
      outcomeType: outcome.outcomeType,
      reviewerId: outcome.reviewerId,
      calibrationEligible: outcome.calibrationContribution.eligible,
      evidenceReferences: outcome.replayLinkage.evidenceReferences,
    })),
    trustMemoryEvents: input.trustMemoryEvents.slice(0, 12).map((event) => ({
      id: event.id,
      eventKind: event.event_kind,
      stateBefore: event.trust_state_before,
      stateAfter: event.trust_state_after,
      reason: event.reason,
      replayRefs: event.replay_refs,
    })),
    evidenceGraphRelationships: graphRelationships.map((relationship) => ({
      id: relationship.id,
      relationship: relationship.type,
      source: relationship.source,
      replayReference: relationship.replayReference,
      confidence: relationship.confidence,
    })),
    timeline,
    replayReference: input.replayReference,
    boundary:
      "Trust Explanation explains recorded evidence, provider signals, runtime signals, governance, reviewed outcomes, Trust Memory and Evidence Graph relationships. It is not autonomous truth, biometric certainty or legal advice.",
  };
}

export function buildDemoTrustExplanation(graph: EvidenceGraph): TrustExplanation {
  return buildTrustExplanation({
    workflow: { subjectType: "workflow", subjectId: "workflow-vendor-access" },
    decision: "ALLOW",
    reason: "Provider evidence, replay continuity, governance approval and Trust Memory all support the workflow decision.",
    confidence: 0.82,
    evidence: ["evidence-provider-hopae", "verification_receipt:demo", "replay-demo-001"],
    providers: [
      {
        provider: "Hopae Connect",
        state: "verified",
        summary: "Provider evidence was normalized and linked to replay.",
        evidenceReferences: ["evidence-provider-hopae", "replay-demo-001"],
      },
    ],
    runtimeSignals: ["Runtime posture remained stable.", "No credential anomaly was attached to the decision."],
    governancePolicy: {
      policyId: "governed-workflow-review",
      policyName: "Governed workflow review",
      outcome: "approved",
      rationale: "Governance approved the workflow after evidence and replay review.",
    },
    reviewedOutcomes: [],
    trustMemoryEvents: [],
    evidenceGraph: graph,
    replayReference: "replay-demo-001",
  });
}
