import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  calculateConfusionMatrix,
  calculatePrecisionRecall,
  calculateReviewerAgreement,
  exportValidationBenchmark,
  runValidationBenchmark,
} from "../lib/validation/benchmark-harness.ts";
import { realityDefenderProvider } from "../lib/detection/providers/reality-defender.ts";
import { providerStatusLabel } from "../lib/detection/providers/types.ts";
import { explainTrustScore } from "../lib/detection/detection-engine.ts";
import { evaluateRuntimeTrust } from "../lib/runtime/runtime-trust-engine.ts";
import { fuseTrustSignals } from "../lib/detection/signal-fusion.ts";
import { buildExplainableTrustGraph } from "../lib/trust/trust-graph.ts";

const positive = { caseId: "p", expected: "positive", actual: "positive", source: "heuristic_baseline", confidence: 0.8, evidence: [], limitations: [] };
const negative = { caseId: "n", expected: "negative", actual: "negative", source: "heuristic_baseline", confidence: 0.8, evidence: [], limitations: [] };

test("benchmark returns explicit no-dataset warning", async () => {
  const result = await runValidationBenchmark({ cases: [] });
  assert.equal(result.message, "Validation incomplete — insufficient reviewed dataset.");
  assert.equal(result.metrics.precision, null);
});

test("confusion matrix and precision recall are calculated", () => {
  const matrix = calculateConfusionMatrix([
    positive,
    negative,
    { ...negative, caseId: "fp", actual: "positive" },
    { ...positive, caseId: "fn", actual: "negative" },
  ]);
  assert.deepEqual(matrix, { truePositives: 1, falsePositives: 1, trueNegatives: 1, falseNegatives: 1, reviewOnly: 0 });
  assert.deepEqual(calculatePrecisionRecall(matrix), { precision: 0.5, recall: 0.5, f1: 0.5 });
});

test("reviewer agreement and benchmark export remain auditable", async () => {
  const cases = [
    { id: "reviewed", label: "suspicious", expectedOutcome: "positive", reviewerOutcome: "positive", reviewerId: "reviewer-1", description: "controlled anomaly", signals: { provenanceConflict: true, impossibleWorkflowVelocity: true, agentRuntimeAnomaly: true } },
  ];
  const benchmark = await runValidationBenchmark({ cases });
  const agreement = calculateReviewerAgreement(cases, benchmark.results);
  assert.deepEqual(agreement, { reviewedCases: 1, agreements: 1, disagreements: 0, agreementRate: 1 });
  const exported = JSON.parse(exportValidationBenchmark(benchmark));
  assert.equal(exported.audit.schemaVersion, 1);
  assert.deepEqual(exported.audit.caseIds, ["reviewed"]);
  assert.deepEqual(exported.falseNegativeCaseIds, []);
});

test("missing credentials return awaiting_credentials without a provider call", async () => {
  const previous = process.env.REALITY_DEFENDER_API_KEY;
  delete process.env.REALITY_DEFENDER_API_KEY;
  const result = await realityDefenderProvider.runDetection({ id: "case", label: "deepfake", expectedOutcome: "positive", description: "test", signals: {} });
  assert.equal(result.source, "awaiting_credentials");
  assert.equal(providerStatusLabel(realityDefenderProvider.status()), "Awaiting Credentials");
  if (previous) process.env.REALITY_DEFENDER_API_KEY = previous;
});

test("restricted data is rejected before configured provider execution", async () => {
  const previous = process.env.REALITY_DEFENDER_API_KEY;
  process.env.REALITY_DEFENDER_API_KEY = "test-only";
  await assert.rejects(
    realityDefenderProvider.runDetection({ id: "restricted", label: "unknown", expectedOutcome: "review", description: "test", signals: {}, dataClassification: "restricted" }),
    /must not enter provider calls/
  );
  if (previous) process.env.REALITY_DEFENDER_API_KEY = previous;
  else delete process.env.REALITY_DEFENDER_API_KEY;
});

test("trust score source labels and required explanation fields are preserved", () => {
  const explanation = explainTrustScore({ source: "baseline_model_assisted", confidence: 2, evidence: ["signal"], limitations: ["not trained ML"] });
  assert.equal(explanation.source, "baseline_model_assisted");
  assert.equal(explanation.confidence, 1);
  assert.deepEqual(Object.keys(explanation), ["source", "confidence", "evidence", "limitations"]);
});

test("status and adapter source do not claim real ML", async () => {
  const status = await readFile(new URL("../app/api/ml/status/route.ts", import.meta.url), "utf8");
  const baseline = await readFile(new URL("../lib/detection/baseline-model.ts", import.meta.url), "utf8");
  assert.match(status, /realMlInferenceActive: false/);
  assert.match(baseline, /not trained machine learning/i);
  assert.doesNotMatch(baseline, /trained ML/);
});

test("replay and sovereignty contracts preserve operational continuity", async () => {
  const replay = await readFile(new URL("../lib/trust-replay/replay.ts", import.meta.url), "utf8");
  const policy = await readFile(new URL("../lib/ai/provider-policy.ts", import.meta.url), "utf8");
  for (const field of ["actor", "workflow", "evidenceState", "trustEvolution", "authorizationLineage", "governanceState", "operationalOutcome"]) {
    assert.match(replay, new RegExp(field));
  }
  assert.match(policy, /enterprise_owned_operational_memory: true/);
  assert.match(policy, /provider_interaction_tracking_required: true/);
});

test("session integrity separates emulator and tampered-app review signals", async () => {
  const model = await readFile(new URL("../lib/session-integrity/model.ts", import.meta.url), "utf8");
  assert.match(model, /category: "emulator_risk"/);
  assert.match(model, /category: "tampered_app_risk"/);
  assert.match(model, /does not prove tampering/);
  assert.match(model, /not a forensic conclusion/);
  assert.match(model, /requires_manual_review: emulatorFlagged/);
  assert.match(model, /requires_manual_review: tamperedAppFlagged/);
});

test("control-plane positioning reuses existing routes and preserves ML boundaries", async () => {
  const positioning = await readFile(new URL("../docs/AI_TRUST_CONTROL_PLANE_POSITIONING.md", import.meta.url), "utf8");
  assert.match(positioning, /Trust infrastructure for humans, AI agents, machine identities and regulated workflows/);
  assert.match(positioning, /Named concepts do not require duplicate routes/);
  assert.match(positioning, /baseline_model_assisted/);
  assert.match(positioning, /not trained enterprise AI detection/);
});

test("runtime trust intelligence remains explainable and escalation-aware", () => {
  const result = evaluateRuntimeTrust({
    previousScore: 90,
    signals: { authorizationAnomaly: true, impossibleVelocity: true },
    evidenceReferences: ["event:1"],
  });
  assert.equal(result.source, "Runtime Intelligence");
  assert.equal(result.escalationRequired, true);
  assert.deepEqual(result.escalationReasons, ["impossibleVelocity", "authorizationAnomaly"]);
  assert.ok(result.weightedSignals.every((signal) => signal.contribution > 0));
  assert.match(result.limitations.join(" "), /not trained machine learning/i);
});

test("signal fusion returns bounded recommendations without certainty claims", () => {
  const result = fuseTrustSignals({
    signals: [
      {
        id: "runtime-1",
        source: "Runtime Intelligence",
        risk: 0.9,
        confidence: 0.7,
        evidence: ["authorization anomaly"],
      },
    ],
  });
  assert.equal(result.recommendation, "block");
  assert.equal(result.confidenceBand, "medium");
  assert.match(result.limitations.join(" "), /not a certainty/i);
});

test("explainable trust graph reports transitions and missing linkage", () => {
  const graph = buildExplainableTrustGraph({
    nodes: [{ id: "actor:1", type: "actor", label: "Agent" }],
    edges: [{
      id: "edge:1",
      from: "actor:1",
      to: "workflow:missing",
      relation: "acted_in",
      explanation: "Agent acted in workflow.",
    }],
    transitions: [{
      id: "transition:1",
      fromScore: 80,
      toScore: 55,
      reason: "Authorization changed.",
      source: "Runtime Intelligence",
      occurredAt: "2026-01-01T00:00:00.000Z",
      evidenceReferences: ["event:1"],
    }],
  });
  assert.equal(graph.linkageCoverage, 0);
  assert.deepEqual(graph.missingLinks[0].missingNodeIds, ["workflow:missing"]);
  assert.match(graph.explanation[0].change, /80 to 55/);
});
