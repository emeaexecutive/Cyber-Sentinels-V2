import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildReleaseValidationMaturity,
  runValidationBenchmark,
} from "../lib/validation/benchmark-harness.ts";
import { buildReleaseCandidateDemo } from "../lib/core/trust-fabric.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Release 1 validation exposes honest capability states without fabricating metrics", async () => {
  const empty = await runValidationBenchmark({ cases: [] });
  assert.equal(empty.metrics.precision, null);
  assert.equal(empty.metrics.recall, null);
  assert.equal(empty.metrics.f1, null);
  assert.deepEqual(
    new Set(empty.releaseMaturity.map((item) => item.state)),
    new Set(["Awaiting Dataset"])
  );

  const awaitingReview = buildReleaseValidationMaturity({
    caseCount: 4,
    reviewedCaseCount: 0,
    providerResultCount: 1,
    calibrationComplete: false,
    simulationOnly: false,
  });
  assert.equal(awaitingReview.find((item) => item.id === "reviewed_outcome_statistics").state, "Awaiting Review");
  assert.equal(awaitingReview.find((item) => item.id === "provider_agreement_analysis").state, "Awaiting Review");

  const simulated = buildReleaseValidationMaturity({
    caseCount: 30,
    reviewedCaseCount: 30,
    providerResultCount: 30,
    calibrationComplete: true,
    simulationOnly: true,
  });
  assert.ok(simulated.every((item) => item.state === "Simulated"));
});

test("every Trust Fabric decision exposes the nine release explanation elements", () => {
  const demo = buildReleaseCandidateDemo();
  const explanation = demo.decision.explainability;
  assert.ok(explanation.why.length > 0);
  assert.ok(explanation.evidenceUsed.length > 0);
  assert.equal(explanation.authoritySummary.decision, "ALLOW");
  assert.equal(explanation.authorityEvaluated.decision, "ALLOW");
  assert.equal(explanation.policyApplied.version, "financial-approval/1.1");
  assert.ok(explanation.confidenceExplanation.explanation.length > 0);
  assert.equal(explanation.providerParticipation.length, 2);
  assert.ok(explanation.replayReference);
  assert.ok(explanation.trustMemoryUpdate.reference);
  assert.ok(explanation.nextRecommendedAction);
});

test("the release candidate demo follows the exact seven-minute flow and reality states", () => {
  const demo = buildReleaseCandidateDemo();
  assert.equal(demo.durationMinutes, 7);
  assert.deepEqual(demo.steps.map((step) => step.label), [
    "Human",
    "AI Agent",
    "Machine Identity",
    "Authority",
    "Trust Decision",
    "Replay",
    "Evidence Graph",
    "Trust Memory™",
    "Governance",
    "Enterprise Dashboard",
  ]);
  assert.deepEqual(new Set(demo.statesShown), new Set(["Live", "Configured", "Simulated", "Awaiting Credentials"]));
  assert.match(demo.boundary, /not.*provider health|not.*SLA/i);
});

test("provider maturity uses the five approved states and health-gated production readiness", async () => {
  const source = await read("lib/providers/provider-readiness.ts");
  for (const state of ["Production Ready", "Configured", "Awaiting Credentials", "Prototype", "Deprecated"]) {
    assert.match(source, new RegExp(state));
  }
  assert.doesNotMatch(source, /\| "Not Started"/);
  for (const condition of ["lastSuccessfulCheck", "normalizedResultImplemented", "timeoutHandlingImplemented", "auditLoggingImplemented"]) {
    assert.match(source, new RegExp(condition));
  }
  assert.match(source, /healthSummaries/);
  assert.match(source, /normalizationAudit/);
});

test("performance coverage includes every requested path without speculative optimization", async () => {
  const [profiler, health, report] = await Promise.all([
    read("lib/performance/runtime-profiler.ts"),
    read("lib/core/platform-health.ts"),
    read("docs/PERFORMANCE_REVIEW_RELEASE_1.md"),
  ]);
  for (const stage of ["lifecycle_orchestration_latency", "parallel_orchestration_latency", "database_query_latency", "replay_latency", "evidence_graph_latency", "trust_memory_latency", "queue_latency"]) {
    assert.match(`${profiler}\n${health}`, new RegExp(stage));
  }
  assert.match(profiler, /!isProductionBuildPhase\(\)/);
  assert.match(report, /no speculative caching, index, queue, or concurrency optimization/i);
});

test("security hardening removes the shared hash fallback and gates sensitive APIs", async () => {
  const [security, stepUp, decision, demoSeed] = await Promise.all([
    read("lib/security.ts"),
    read("app/api/step-up/route.ts"),
    read("app/api/trust/decision/route.ts"),
    read("app/api/demo/seed/route.ts"),
  ]);
  assert.match(security, /randomBytes\(32\)/);
  assert.doesNotMatch(security, /SECURITY_HASH_SECRET \|\| "cyber-sentinels"/);
  assert.match(stepUp, /auth\.getUser\(\)/);
  assert.match(stepUp, /checkRequestRateLimit/);
  assert.match(decision, /validateTrustApiKey/);
  assert.match(decision, /checkRequestRateLimit/);
  assert.match(demoSeed, /process\.env\.NODE_ENV === "production"/);
  assert.match(demoSeed, /status: 404/);
  assert.match(demoSeed, /process\.env\.ENABLE_DEMO_SEED !== "true"/);
});

test("Release 1 evidence documents and scorecard fields are present", async () => {
  const files = [
    "docs/RELEASE_1_READINESS_SCORECARD.md",
    "docs/SECURITY_REVIEW_RELEASE_1.md",
    "docs/PROVIDER_MATURITY_RELEASE_1.md",
    "docs/PERFORMANCE_REVIEW_RELEASE_1.md",
    "docs/ENTERPRISE_UX_RELEASE_1.md",
    "docs/INVESTOR_READINESS_RELEASE_1.md",
    "docs/SPRINT_11_5_ACCEPTANCE.md",
    "docs/demos/RELEASE_1_RELEASE_CANDIDATE_DEMO.md",
  ];
  const contents = await Promise.all(files.map(read));
  const scorecard = contents[0];
  for (const field of ["Current", "Target", "Blockers", "Evidence", "Next milestone"]) {
    assert.match(scorecard, new RegExp(field));
  }
  for (const area of ["Architecture", "Enterprise UX", "ML Validation", "Provider Integrations", "Runtime Performance", "Security", "Governance", "Documentation", "Demo", "Investor Readiness"]) {
    assert.match(scorecard, new RegExp(area));
  }
});
