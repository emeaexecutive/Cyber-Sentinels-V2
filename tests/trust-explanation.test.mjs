import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDemoTrustExplanation,
  buildTrustExplanation,
} from "../lib/trust-explanation/explanation.ts";

function demoGraph() {
  return {
    nodes: [
      { id: "human:demo", type: "human", label: "Enterprise reviewer", metadata: {} },
      { id: "workflow:demo", type: "workflow", label: "Vendor access workflow", metadata: {} },
      { id: "evidence:demo", type: "evidence", label: "Provider evidence", metadata: {} },
      { id: "replay:demo", type: "replay_event", label: "Replay event", metadata: {} },
    ],
    relationships: [
      {
        id: "rel-supports",
        from: "evidence:demo",
        to: "workflow:demo",
        type: "supports",
        timestamp: "2026-07-10T10:00:00.000Z",
        confidence: 0.82,
        source: "test",
        replayReference: "replay-demo-001",
      },
      {
        id: "rel-reviewed",
        from: "human:demo",
        to: "workflow:demo",
        type: "reviewed",
        timestamp: "2026-07-10T10:01:00.000Z",
        confidence: 0.88,
        source: "test",
        replayReference: "replay-demo-001",
      },
    ],
    generatedAt: "2026-07-10T10:02:00.000Z",
    boundary: "Test graph with no secrets.",
    acceptanceCriteria: [],
  };
}

test("demo trust explanation answers the enterprise why question", () => {
  const graph = demoGraph();
  const explanation = buildDemoTrustExplanation(graph);

  assert.equal(explanation.release, "0.6");
  assert.equal(explanation.answer, "Explained");
  assert.equal(explanation.decision, "ALLOW");
  assert.ok(explanation.why.some((item) => /Provider evidence/i.test(item)));
  assert.ok(explanation.evidence.includes("replay-demo-001"));
  assert.ok(explanation.providers.length >= 1);
  assert.ok(explanation.evidenceGraphRelationships.length >= 1);
  assert.ok(explanation.timeline.some((event) => event.label === "Decision: ALLOW"));
});

test("step up and insufficient evidence normalize to review for enterprise explanation", () => {
  const graph = demoGraph();
  const explanation = buildTrustExplanation({
    workflow: { subjectType: "workflow", subjectId: "workflow-review" },
    decision: "step_up",
    reason: "Evidence requires stronger verification.",
    confidence: 0.55,
    evidence: ["evidence-1"],
    providers: [],
    runtimeSignals: ["Runtime checkpoint opened."],
    governancePolicy: {
      policyId: "review-policy",
      policyName: "Review policy",
      outcome: "review",
      rationale: "Step-up decisions require accountable review.",
    },
    reviewedOutcomes: [],
    trustMemoryEvents: [],
    evidenceGraph: graph,
    replayReference: "replay-1",
  });

  assert.equal(explanation.decision, "REVIEW");
  assert.equal(explanation.answer, "Explained");
  assert.ok(explanation.runtimeSignals.includes("Runtime checkpoint opened."));
});

test("blocked explanations preserve governance and graph context", () => {
  const graph = demoGraph();
  const explanation = buildTrustExplanation({
    workflow: { subjectType: "workflow", subjectId: "workflow-blocked" },
    decision: "block",
    reason: "Prior blocking evidence requires the action to stop.",
    confidence: 0.91,
    evidence: ["evidence-block"],
    providers: [{ provider: "External verification source", state: "failed", summary: "Provider failed.", evidenceReferences: ["evidence-block"] }],
    runtimeSignals: ["Credential anomaly attached."],
    governancePolicy: {
      policyId: "block-policy",
      policyName: "Block policy",
      outcome: "blocked",
      rationale: "Critical risk requires preservation and stop.",
    },
    reviewedOutcomes: [],
    trustMemoryEvents: [],
    evidenceGraph: graph,
    replayReference: "replay-block",
  });

  assert.equal(explanation.decision, "BLOCK");
  assert.equal(explanation.governancePolicy.outcome, "blocked");
  assert.ok(explanation.timeline.some((event) => event.decisionImpact === "blocks"));
  assert.ok(explanation.boundary.includes("not autonomous truth"));
});
