import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getOperationalPerformanceProfile,
  recordRuntimeProfile,
} from "../lib/performance/runtime-profiler.ts";
import { loadValidationCases, runValidationBenchmark } from "../lib/validation/benchmark-harness.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("validation loader excludes metadata schemas and metrics remain gated", async () => {
  const cases = await loadValidationCases();
  const benchmark = await runValidationBenchmark();
  assert.equal(cases.length, 0);
  assert.equal(benchmark.datasetCoverageReport.datasetVersion, "validation-dataset-v1");
  assert.equal(benchmark.groundTruth.validation.reviewedSamples, 0);
  assert.equal(benchmark.groundTruth.validation.minimumReviewedSamples, 30);
  assert.equal(benchmark.groundTruth.validation.precision.value, null);
  assert.equal(benchmark.groundTruth.validation.recall.value, null);
  assert.equal(benchmark.groundTruth.validation.unknownRate.value, null);
  assert.equal(benchmark.calibrationStatus.complete, false);
});

test("Validation Center preserves RC4 proof fields and adds RC5 evidence boundaries", async () => {
  const [page, engine] = await Promise.all([
    read("app/dashboard/validation/page.tsx"),
    read("lib/core/ml-validation-engine.ts"),
  ]);
  for (const label of ["Dataset version", "Ground truth availability", "Human-reviewed outcomes", "Provider evidence", "Synthetic test coverage", "Precision", "Recall", "False positives", "False negatives", "Calibration status", "Unknown rate"]) {
    assert.match(page, new RegExp(label));
  }
  assert.match(page, /Calibration Incomplete/i);
  for (const source of ["Deterministic rules", "Heuristic logic", "Provider evidence", "ML inference", "Human-reviewed outcome", "Simulated evidence"]) {
    assert.match(engine, new RegExp(source));
  }
});

test("provider-facing maturity is constrained to the five RC5 operations states", async () => {
  const [readiness, admin, api, hopae] = await Promise.all([
    read("lib/providers/provider-readiness.ts"),
    read("app/admin/provider-status/page.tsx"),
    read("app/api/providers/route.ts"),
    read("lib/providers/hopae-rc1-server.ts"),
  ]);
  const stateBlock = readiness.match(/export type ProviderOperationsState =([\s\S]*?);/)?.[1] ?? "";
  assert.deepEqual(
    [...stateBlock.matchAll(/\| "([^"]+)"/g)].map((match) => match[1]),
    ["Production", "Sandbox", "Awaiting Credentials", "Prototype", "Disabled"]
  );
  assert.match(readiness, /provider\.id === "hopae_connect"[\s\S]*?"production_candidate"/);
  assert.match(admin, /Provider Operations/);
  assert.doesNotMatch(admin, /Test Connection/);
  assert.match(api, /Adapter maturity uses only Production, Sandbox, Awaiting Credentials, Prototype and Disabled/);
  assert.match(hopae, /config\.environment === "production" \? "Live" : "Test Mode"/);
});

test("operational performance profile preserves six RC4 paths and adds three RC5 paths", () => {
  const samples = [
    ["replay_latency", 20, {}],
    ["evidence_graph_latency", 25, {}],
    ["trust_latency", 30, {}],
    ["provider_latency", 50, {}],
    ["provider_latency", 8100, { timeout: true }],
    ["database_query_latency", 100, {}],
    ["database_query_latency", 300, {}],
    ["queue_latency", 200, {}],
    ["governance_queue_latency", 600, {}],
  ];
  for (const [stage, latencyMs, metadata] of samples) {
    recordRuntimeProfile({ stage, latencyMs, ok: metadata.timeout !== true, degraded: metadata.timeout === true, metadata });
  }
  const profile = getOperationalPerformanceProfile();
  for (const label of ["Replay", "Evidence Graph", "Trust Decision", "Provider calls", "Database", "Queues", "Provider normalization", "Trust profile generation", "Queue throughput"]) {
    assert.ok(profile.some((item) => item.label === label), label);
  }
  const provider = profile.find((item) => item.id === "provider_calls");
  assert.equal(provider.averageLatencyMs, 4075);
  assert.equal(provider.p95LatencyMs, 8100);
  assert.equal(provider.timeoutCount, 1);
  assert.equal(provider.slowOperationCount, 1);
  const database = profile.find((item) => item.id === "database");
  assert.equal(database.averageLatencyMs, 200);
  assert.equal(database.p95LatencyMs, 300);
  assert.equal(database.slowOperationCount, 1);
});

test("homepage is outcome-led with three sections, one CTA, one graph and one comparison", async () => {
  const source = await read("app/page.tsx");
  assert.equal((source.match(/<section/g) ?? []).length, 3);
  assert.equal((source.match(/<Link/g) ?? []).length, 1);
  assert.equal((source.match(/<LifecycleDiagram/g) ?? []).length, 1);
  assert.equal((source.match(/<ComparisonCard/g) ?? []).length, 1);
  for (const outcome of ["evidence-backed decisions", "continuous authorization", "replayable operations", "Know whether a critical action should proceed"]) {
    assert.match(source, new RegExp(outcome));
  }
});

test("demo presents one linear nine-stage operational trust journey", async () => {
  const source = await read("app/demo/trust-execution-flow/page.tsx");
  const labels = [...source.matchAll(/\["([^"]+)", "(?:Test|Awaiting Credentials)"/g)].map((match) => match[1]);
  assert.deepEqual(labels, ["Identity verified", "Authority resolved", "Provider evidence collected", "Trust evaluated", "Decision made", "Replay generated", "Trust Memory™ updated", "Evidence Graph refreshed", "Executive trust report produced"]);
  assert.match(source, /No manual explanation/);
  assert.doesNotMatch(source, /buildRegulatedAiAgentDemo\("allow"\)|buildRegulatedAiAgentDemo\("block"\)/);
});

test("Release Readiness Dashboard contains eight evidence-linked categories", async () => {
  const [model, page] = await Promise.all([
    read("lib/enterprise-readiness.ts"),
    read("app/enterprise/readiness/page.tsx"),
  ]);
  for (const id of ["architecture", "validation", "security", "performance", "provider", "documentation", "demo", "pilot"]) {
    assert.match(model, new RegExp(`id: "${id}"`));
  }
  const indicators = model.match(/readinessIndicators: \[[\s\S]*?\n    \],\n    safeguards:/)?.[0] ?? "";
  assert.equal((indicators.match(/evidenceHref:/g) ?? []).length, 8);
  assert.match(page, /Eight evidence-linked release gates/);
  assert.match(page, /Average, p95 and exception evidence/);
});

test("security ingress and isolation controls remain explicit", async () => {
  const [stripe, ats, providerCallback, middleware, security] = await Promise.all([
    read("app/api/stripe/webhook/route.ts"),
    read("app/api/integrations/ats/webhook/route.ts"),
    read("app/api/providers/route.ts"),
    read("middleware.ts"),
    read("lib/security.ts"),
  ]);
  assert.match(stripe, /checkRequestRateLimit/);
  assert.match(stripe, /maxWebhookBytes/);
  assert.match(stripe, /stripe\.webhooks\.constructEvent/);
  assert.match(ats, /verifyATSWebhookSignature/);
  assert.match(providerCallback, /x-hopae-signature/);
  assert.match(middleware, /isAllowlisted/);
  assert.match(middleware, /isEmailVerified/);
  assert.match(security, /processHashSecret/);
});

test("all required RC4 documents exist and preserve evidence boundaries", async () => {
  const paths = [
    "docs/RC4_VALIDATION.md",
    "docs/RC4_PROVIDER_REALITY.md",
    "docs/RC4_PERFORMANCE.md",
    "docs/RC4_SECURITY.md",
    "docs/RC4_ENTERPRISE_STORY.md",
    "docs/RC4_RELEASE_SCORECARD.md",
    "docs/SPRINT_13_4_ACCEPTANCE.md",
  ];
  const contents = await Promise.all(paths.map(read));
  assert.equal(contents.length, 7);
  assert.match(contents[0], /0\/30/);
  assert.match(contents[1], /production-candidate provider path/i);
  assert.match(contents[2], /process-local/i);
  assert.match(contents[3], /distributed abuse-control guarantee/i);
  assert.match(contents[5], /Ready.*Review.*Blocked/s);
});
