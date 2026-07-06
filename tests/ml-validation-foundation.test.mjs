import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  calculateConfusionMatrix,
  calculatePrecisionRecall,
  runValidationBenchmark,
} from "../lib/validation/benchmark-harness.ts";
import { realityDefenderProvider } from "../lib/detection/providers/reality-defender.ts";
import { explainTrustScore } from "../lib/detection/detection-engine.ts";

const positive = { caseId: "p", expected: "positive", actual: "positive", source: "heuristic_baseline", confidence: 0.8, evidence: [], limitations: [] };
const negative = { caseId: "n", expected: "negative", actual: "negative", source: "heuristic_baseline", confidence: 0.8, evidence: [], limitations: [] };

test("benchmark returns explicit no-dataset warning", async () => {
  const result = await runValidationBenchmark({ cases: [] });
  assert.equal(result.message, "No validation dataset available yet.");
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

test("missing credentials return awaiting_credentials without a provider call", async () => {
  const previous = process.env.REALITY_DEFENDER_API_KEY;
  delete process.env.REALITY_DEFENDER_API_KEY;
  const result = await realityDefenderProvider.runDetection({ id: "case", label: "deepfake", expectedOutcome: "positive", description: "test", signals: {} });
  assert.equal(result.source, "awaiting_credentials");
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
