import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getTrustFabricObservabilitySnapshot,
  recordRuntimeProfile,
} from "../lib/performance/runtime-profiler.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Enterprise Readiness is protected and renders the canonical operational model", async () => {
  const source = await read("app/enterprise/readiness/page.tsx");
  assert.match(source, /requireAdminPageAccess/);
  assert.match(source, /model\.operational\.components/);
  assert.match(source, /model\.operational\.metrics\.metrics/);
  assert.match(source, /model\.operational\.providerClassifications/);
});

test("operational readiness uses only the five approved statuses across eleven components", async () => {
  const source = await read("lib/enterprise-readiness.ts");
  for (const status of ["Healthy", "Degraded", "Awaiting Configuration", "Unavailable", "Unknown"]) {
    assert.match(source, new RegExp(`\\| \\"${status}\\"|\\[\\"${status}\\"`));
  }
  for (const component of ["Authentication", "Provider Connectivity", "Trust Engine", "Replay", "Evidence Graph", "Trust Memory", "Runtime", "Queue Health", "Validation Coverage", "API Health", "Build Version"]) {
    assert.match(source, new RegExp(component));
  }
  assert.match(source, /Configured credentials are not a successful provider health check/);
  assert.match(source, /API Health remains Unknown without a deployment health probe/);
});

test("observability exposes all eight metrics and preserves absent measurements", () => {
  const initial = getTrustFabricObservabilitySnapshot({ governancePending: 0, replayPending: 0 });
  assert.deepEqual(initial.metrics.map((metric) => metric.label), [
    "Trust Decision latency",
    "Replay latency",
    "Provider latency",
    "Queue depth",
    "Error rate",
    "Decision throughput",
    "Authority validation time",
    "Evidence write time",
  ]);
  const trustLatency = initial.metrics.find((metric) => metric.id === "trust_decision_latency");
  if (trustLatency.sampleCount === 0) {
    assert.equal(trustLatency.value, null);
    assert.equal(trustLatency.status, "awaiting_data");
  }

  recordRuntimeProfile({ stage: "parallel_orchestration_latency", latencyMs: 12, ok: true, degraded: false, metadata: { label: "test" } });
  recordRuntimeProfile({ stage: "trust_latency", latencyMs: 8, ok: true, degraded: false, metadata: { label: "test" } });
  const measured = getTrustFabricObservabilitySnapshot({ governancePending: 0, replayPending: 0 });
  assert.equal(measured.metrics.find((metric) => metric.id === "trust_decision_latency").value, 8);
  assert.equal(measured.metrics.find((metric) => metric.id === "decision_throughput").value, 1);
});

test("provider lifecycle and Trust Memory evolution use the approved explicit labels", async () => {
  const [providers, memory] = await Promise.all([
    read("lib/providers/provider-readiness.ts"),
    read("lib/trust-memory/trust-memory.ts"),
  ]);
  for (const label of ["Production Ready", "Configured", "Awaiting Credentials", "Prototype", "Deprecated"]) {
    assert.match(providers, new RegExp(`\\"${label}\\"`));
  }
  for (const label of ["Trust Increased", "Trust Reduced", "Trust Challenged", "Trust Restored", "Trust Expired", "Trust Revoked", "Trust Delegated", "Trust Reviewed", "Trust Confirmed"]) {
    assert.match(memory, new RegExp(label));
  }
  for (const field of ["created_at", "reason", "actor_id", "evidence_refs", "authority_refs"]) {
    assert.match(memory, new RegExp(field));
  }
});

test("Sprint 11.4 operational documents and demo are present", async () => {
  const files = [
    "docs/ENTERPRISE_PILOT_GUIDE.md",
    "docs/INVESTOR_TECHNICAL_OVERVIEW.md",
    "docs/ENTERPRISE_READINESS.md",
    "docs/PERFORMANCE_PROFILE.md",
    "docs/OBSERVABILITY.md",
    "docs/TRUST_DECISION_EXPLAINABILITY.md",
    "docs/SPRINT_11_4_ACCEPTANCE.md",
    "docs/demos/ENTERPRISE_OPERATIONAL_READINESS_DEMO.md",
  ];
  await Promise.all(files.map(read));
});

test("public clarity remains governed by the complete inventory and canonical ownership map", async () => {
  const [inventory, ownership, storytelling] = await Promise.all([
    read("docs/PUBLIC_SURFACE_ROUTE_INVENTORY.md"),
    read("docs/CONTENT_OWNERSHIP_MAP.md"),
    read("tests/enterprise-storytelling.test.mjs"),
  ]);
  assert.match(inventory, /covers every Next\.js page route/);
  assert.match(ownership, /One concept has one explanatory home/);
  assert.match(storytelling, /one purpose and one primary CTA/);
});
