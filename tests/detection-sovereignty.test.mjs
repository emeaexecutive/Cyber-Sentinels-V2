import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  calculateTrustScoreSource,
  getDetectionEngineStatus,
  runHeuristicDetection,
} from "../lib/detection/detection-engine.ts";

test("real ML remains false without implemented model inference", () => {
  assert.equal(getDetectionEngineStatus().real_ml_enabled, false);
});

test("missing detection credentials are Awaiting Credentials", () => {
  const previous = process.env.REALITY_DEFENDER_API_KEY;
  delete process.env.REALITY_DEFENDER_API_KEY;
  const provider = getDetectionEngineStatus().providers.find(({ id }) => id === "reality_defender");
  assert.equal(provider?.runtime_state, "Awaiting Credentials");
  if (previous) process.env.REALITY_DEFENDER_API_KEY = previous;
});

test("heuristic output is explicitly labelled and never a final verdict", () => {
  const [signal] = runHeuristicDetection({ missingProvenance: true });
  assert.equal(signal.source, "Heuristic rule-based signal");
  assert.equal(signal.is_final_verdict, false);
  assert.equal(calculateTrustScoreSource({ heuristicSignals: 1 }), "Heuristic Rules");
});

test("detection status endpoint is admin protected and returns engine status", async () => {
  const source = await readFile(new URL("../app/api/detection/status/route.ts", import.meta.url), "utf8");
  assert.match(source, /requireAdminApiAccess/);
  assert.match(source, /getDetectionEngineStatus/);
  assert.match(source, /cache-control/);
});

test("restricted data is blocked and sensitive data is redacted before provider use", async () => {
  const policy = await readFile(new URL("../lib/ai/provider-policy.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/ai-governance/analyze/route.ts", import.meta.url), "utf8");
  assert.match(policy, /input\.classification === "restricted"/);
  assert.match(policy, /allowed: false/);
  assert.match(policy, /redacted-email/);
  assert.match(policy, /redacted-verification-id/);
  assert.match(route, /redactForAIProvider\(loaded\.context\)/);
});

test("admin blocking preserves evidence, updates posture and avoids deletion", async () => {
  const enforcement = await readFile(new URL("../lib/admin/fake-actors.ts", import.meta.url), "utf8");
  assert.match(enforcement, /evidence_preserved: true/);
  assert.match(enforcement, /governance_actions/);
  assert.match(enforcement, /trust_posture_update_required: true/);
  assert.match(enforcement, /trustPostureUpdated: true/);
  assert.doesNotMatch(enforcement, /\.delete\(/);
});
