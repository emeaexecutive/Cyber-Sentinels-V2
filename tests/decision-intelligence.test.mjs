import assert from "node:assert/strict";
import test from "node:test";
import { buildDecisionIntelligence } from "../lib/core/decision-intelligence.ts";
import {
  buildDemoTrustExplanation,
  buildTrustExplanation,
} from "../lib/trust-explanation/explanation.ts";

function demoGraph() {
  return {
    nodes: [
      { id: "human:demo", type: "human", label: "Enterprise reviewer", summary: "Reviewer", metadata: {} },
      { id: "ai_agent:demo", type: "ai_agent", label: "Contract agent", summary: "Agent", metadata: {} },
      { id: "workflow:demo", type: "workflow", label: "Vendor workflow", summary: "Workflow", metadata: {} },
      { id: "evidence:demo", type: "evidence", label: "Provider evidence", summary: "Evidence", metadata: {} },
    ],
    relationships: [
      {
        id: "rel-supports",
        from: "evidence:demo",
        to: "workflow:demo",
        type: "supports",
        timestamp: "2026-07-11T10:00:00.000Z",
        confidence: 0.82,
        source: "test",
        replayReference: "replay-demo-001",
      },
    ],
    generatedAt: "2026-07-11T10:01:00.000Z",
    boundary: "Test graph with no secrets.",
    acceptanceCriteria: [],
  };
}

const providerReadiness = [
  {
    id: "verification-hopae",
    name: "Hopae Connect",
    category: "identity",
    runtimeState: "Live",
    credentialPresent: true,
    healthCheckAvailable: true,
    testModeAvailable: true,
    productionModeAvailable: true,
    normalizedResultImplemented: true,
    timeoutHandlingImplemented: true,
    retryLogicImplemented: false,
    auditLoggingImplemented: true,
    health: "degraded",
    latency: { measured: false, p95Ms: null, timeoutMs: 250 },
    supportedFeatures: ["identity"],
    limitations: ["Provider output is evidence, not a final decision."],
    evidence: "Hopae Connect normalized provider evidence.",
    blocker: "Requires reviewed pilot evidence.",
    nextAction: "Validate in replay.",
  },
  {
    id: "verification-veriff",
    name: "Veriff",
    category: "identity",
    runtimeState: "Awaiting Credentials",
    credentialPresent: false,
    healthCheckAvailable: false,
    testModeAvailable: true,
    productionModeAvailable: false,
    normalizedResultImplemented: true,
    timeoutHandlingImplemented: true,
    retryLogicImplemented: false,
    auditLoggingImplemented: true,
    health: "blocked",
    latency: { measured: false, p95Ms: null, timeoutMs: 250 },
    supportedFeatures: ["identity"],
    limitations: ["Credentials are not configured."],
    evidence: "Veriff is registered but not callable.",
    blocker: "Missing credentials.",
    nextAction: "Complete credential review.",
  },
];

test("decision intelligence creates the enterprise decision contract", () => {
  const explanation = buildDemoTrustExplanation(demoGraph());
  const intelligence = buildDecisionIntelligence({ explanation, providerReadiness });

  assert.equal(intelligence.release, "0.7");
  assert.equal(intelligence.decision, "ALLOW");
  assert.ok(intelligence.decision_summary.includes("ALLOW"));
  assert.ok(intelligence.primary_reasons.length >= 1);
  assert.ok(intelligence.supporting_evidence.includes("replay-demo-001"));
  assert.ok(intelligence.provider_inputs.some((provider) => provider.status === "Used"));
  assert.ok(intelligence.provider_inputs.some((provider) => provider.status === "Awaiting Credentials"));
  assert.ok(intelligence.evidence_graph_inputs.length >= 1);
  assert.equal(intelligence.enterprise_card.replay_available, true);
  assert.ok(intelligence.alternative_outcomes.some((outcome) => outcome.outcome === "BLOCK"));
});

test("reviewed outcomes improve future context without changing policy automatically", () => {
  const explanation = buildTrustExplanation({
    workflow: { subjectType: "workflow", subjectId: "workflow-review" },
    decision: "review",
    reason: "Reviewer context is required before continuing.",
    confidence: 0.61,
    evidence: ["evidence-review"],
    providers: [],
    runtimeSignals: ["Runtime posture changed."],
    governancePolicy: {
      policyId: "review-policy",
      policyName: "Review policy",
      outcome: "in_review",
      rationale: "Governance requires human review.",
    },
    reviewedOutcomes: [],
    trustMemoryEvents: [],
    evidenceGraph: demoGraph(),
    replayReference: "replay-review",
  });
  const intelligence = buildDecisionIntelligence({
    explanation,
    reviewedOutcomes: [
      {
        caseId: "case-1",
        expected: "review",
        actual: "review",
        originalSystemDecision: "review",
        reviewedOutcome: "review",
        reviewerDecision: "review",
        reviewerId: "reviewer-1",
        reviewerNotes: "Needs more evidence.",
        overrideReason: null,
        falsePositive: false,
        falseNegative: false,
        confirmedEscalation: true,
        evidenceQuality: "reviewed",
        outcomeType: "review_only",
        escalationOutcome: "escalated",
        governanceOverride: null,
        replayLinkage: { sampleReference: "replay-review", evidenceReferences: ["evidence-review"] },
        replayLink: "/trust-replay?sample=replay-review",
        reviewLifecycle: "reviewed",
        reviewConfidence: 0.8,
        governanceOutcome: "escalated",
        calibrationContribution: {
          eligible: true,
          reason: "Reviewed outcome has enough evidence to contribute to dataset-scoped calibration.",
          contributesToFalsePositiveRate: false,
          contributesToFalseNegativeRate: false,
          contributesToReviewerAgreement: true,
        },
        calibrationImpact: {
          shouldUpdateThreshold: false,
          shouldAddProviderComparison: true,
          notes: [],
        },
      },
    ],
  });

  assert.ok(intelligence.trust_memory_inputs.some((item) => item.improves_future_explanations));
  assert.ok(intelligence.trust_memory_inputs.some((item) => item.improves_future_confidence));
  assert.ok(intelligence.trust_memory_inputs.some((item) => item.improves_future_governance_recommendations));
  assert.ok(intelligence.trust_memory_inputs.every((item) => item.policy_auto_changed === false));
  assert.ok(intelligence.recommended_next_action.includes("review"));
});
