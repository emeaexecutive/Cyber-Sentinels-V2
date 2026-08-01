import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { publicEndpointContracts } from "../lib/api/public-endpoint-inventory.ts";
import { buildEvidenceGraphDemo, validateEvidenceGraphContinuity } from "../lib/evidence-graph/evidence-graph.ts";
import { buildEvidenceCoverage } from "../lib/evidence-graph/query.ts";
import { getOperationalPerformanceProfile, recordQueueThroughput } from "../lib/performance/runtime-profiler.ts";
import { normalizeProviderSignal } from "../lib/providers/signals.ts";
import { evaluateTrustDecision } from "../lib/trust/decision-engine.ts";
import { buildRc2LivingTrustDemo } from "../lib/trust/living-trust-profile.ts";
import { buildWhyTrustChanged, demoTrustMemoryEvents, validateTrustMemoryIntegrity } from "../lib/trust-memory/trust-memory.ts";
import { buildOperationalReplay } from "../lib/core/replay-engine.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Trust Memory explains why trust changed without a second history service", () => {
  const explanation = buildWhyTrustChanged(demoTrustMemoryEvents[0]);
  assert.equal(explanation.previousPosture, "unverified");
  assert.equal(explanation.newPosture, "verified");
  assert.ok(explanation.evidenceResponsible.length >= 5);
  assert.ok(explanation.authorityImpact[0].startsWith("authority:"));
  assert.ok(explanation.policyApplied[0].startsWith("policy:"));
  assert.ok(explanation.replayLink);
  assert.equal(explanation.reassessment.state, "scheduled");
  const integrity = validateTrustMemoryIntegrity(demoTrustMemoryEvents.map((event) => ({ ...event, tenant_id: "demo" })), { tenantId: "demo" });
  assert.equal(integrity.checks.evidenceSourcesAttributable, true);
  assert.equal(integrity.checks.policyHistoryTraceable, true);
  assert.equal(integrity.checks.reassessmentTraceable, true);
});

test("Evidence Graph reports coverage, provenance, freshness and graph health", () => {
  const graph = buildEvidenceGraphDemo();
  const coverage = buildEvidenceCoverage(graph);
  assert.ok(coverage.assessments.length > 0);
  assert.ok(coverage.assessments.some((assessment) => assessment.counts.Verified > 0));
  assert.ok(graph.relationships.some((edge) => edge.providerProvenance === "Hopae Connect"));
  assert.ok(graph.relationships.every((edge) => edge.relationshipStrength));
  assert.ok(graph.relationships.every((edge) => edge.freshness));
  assert.equal(typeof coverage.graphHealth.orphanedNodes, "number");
  assert.equal(validateEvidenceGraphContinuity(graph).findings.missingEdges.length, 0);
});

test("Validation Center exposes RC5 metrics with explicit evidence states", async () => {
  const source = await read("app/dashboard/validation/page.tsx");
  for (const label of ["Ground truth availability", "Provider evidence", "Human-reviewed outcomes", "Synthetic test coverage", "Unknown rate", "Precision", "Recall", "Calibration status"]) assert.match(source, new RegExp(label));
  for (const state of ["Live", "Test", "Estimated", "Unavailable"]) assert.match(source, new RegExp(`\\"${state}\\"`));
  assert.match(source, /Calibration incomplete - insufficient reviewed ground truth\./);
});

test("Provider Operations uses the five RC5 classifications and normalized health fields", async () => {
  const [readiness, page] = await Promise.all([read("lib/providers/provider-readiness.ts"), read("app/admin/provider-status/page.tsx")]);
  const stateBlock = readiness.match(/export type ProviderOperationsState =([\s\S]*?);/)?.[1] ?? "";
  for (const state of ["Production", "Sandbox", "Awaiting Credentials", "Prototype", "Disabled"]) assert.match(stateBlock, new RegExp(`\\"${state}\\"`));
  for (const field of ["Availability", "Latency", "Last successful connection", "Credential state", "Supported signals", "Confidence", "Error rate", "Retry state"]) assert.match(page, new RegExp(field));
  assert.match(readiness, /export function providerRealityState/);
});

test("homepage contains one hero, one visual, one comparison and two bounded CTAs", async () => {
  const source = await read("app/page.tsx");
  assert.equal((source.match(/<section/g) ?? []).length, 3);
  assert.equal((source.match(/<Link\s/g) ?? []).length, 2);
  assert.equal((source.match(/<LifecycleDiagram/g) ?? []).length, 1);
  assert.equal((source.match(/<ComparisonCard/g) ?? []).length, 1);
  for (const phrase of ["Enterprise Trust Infrastructure", "identity, authority, environment, evidence and operational scope", "Authority Lineage", "Environment Attestation", "Scope Continuity", "Trust Memory", "Enterprise Trust Fabric"]) assert.match(source, new RegExp(phrase, "i"));
});

test("public API contract is versioned, traceable, paginated and duplicate registry POST is removed", async () => {
  assert.ok(publicEndpointContracts.length >= 12);
  for (const endpoint of publicEndpointContracts) {
    assert.ok(endpoint.requestSchema);
    assert.ok(endpoint.responseSchema);
    assert.ok(endpoint.authentication);
    assert.ok(endpoint.pagination);
    assert.ok(endpoint.audit);
  }
  const [contracts, registry, docs] = await Promise.all([read("lib/api/public-contracts.ts"), read("app/api/registry/search/route.ts"), read("app/api-docs/page.tsx")]);
  for (const field of ["version", "trace_id", "audit_id", "timestamp", "next_cursor"]) assert.match(contracts, new RegExp(field));
  assert.doesNotMatch(registry, /export async function POST/);
  assert.match(docs, /publicEndpointContracts/);
});

test("RC5 performance diagnostics measure all requested operation classes", () => {
  const iterations = 30;
  for (let index = 0; index < iterations; index += 1) {
    evaluateTrustDecision({ identityConfidence: 0.9, humanAuthority: "active", permissionScope: "matched", sessionIntegrity: 0.9 });
    normalizeProviderSignal({ providerId: "hopae_connect", providerVerificationState: "pending", identityConfidence: 70, evidenceReferences: [`evidence:${index}`] });
    buildEvidenceGraphDemo();
    buildRc2LivingTrustDemo();
    buildOperationalReplay({ subjectType: "workflow", subjectId: "rc5", asOf: "2026-07-16T00:00:00.000Z", evidence: [], signals: [], decisions: [], auditLogs: [], relationships: [], aiSummaries: [], timelineEvents: [] });
  }
  const queueStartedAt = performance.now();
  const queue = Array.from({ length: 10_000 }, (_, index) => index).map((value) => value + 1);
  recordQueueThroughput({ itemsProcessed: queue.length, durationMs: performance.now() - queueStartedAt, queue: "rc5-controlled" });
  const profiles = getOperationalPerformanceProfile();
  for (const id of ["trust_decision", "evidence_graph", "replay", "provider_normalization", "trust_profile_generation", "queue_throughput"]) {
    const profile = profiles.find((item) => item.id === id);
    assert.equal(profile?.status, "measured", id);
    assert.ok((profile?.sampleCount ?? 0) > 0, id);
    assert.notEqual(profile?.averageLatencyMs, null, id);
    assert.notEqual(profile?.p95LatencyMs, null, id);
  }
  console.log(`RC5_OPERATIONAL_BENCHMARK=${JSON.stringify(profiles.filter((profile) => ["trust_decision", "evidence_graph", "replay", "provider_normalization", "trust_profile_generation", "queue_throughput"].includes(profile.id)))}`);
});

test("enterprise demo uses the canonical eight-question contract and redirects the legacy route", async () => {
  const [source, legacyRoute] = await Promise.all([
    read("app/demo/page.tsx"),
    read("app/demo/trust-execution-flow/page.tsx"),
  ]);
  const questions = ["Who or what acted?", "What authority existed?", "What environment was declared and observed?", "What scope was permitted?", "What evidence supported the decision?", "What changed the trust state?", "What happened next?", "How can it be replayed?"];
  for (const question of questions) assert.match(source, new RegExp(question.replace(/[?]/g, "\\?")));
  assert.match(legacyRoute, /redirect\("\/demo"\)/);
});

test("all RC5 documents and the downloadable proof-pack contract exist", async () => {
  const paths = ["docs/TRUST_MEMORY_RC5.md", "docs/EVIDENCE_GRAPH_RC5.md", "docs/VALIDATION_CENTER.md", "docs/PROVIDER_OPERATIONS.md", "docs/ENTERPRISE_PROOF_PACK.md", "docs/UX_SIMPLIFICATION.md", "docs/API_MATURITY.md", "docs/SPRINT_14_1_ACCEPTANCE.md", "docs/releases/RC5.md"];
  await Promise.all(paths.map(read));
  const route = await read("app/docs/[slug]/route.ts");
  assert.match(route, /ENTERPRISE_PROOF_PACK\.md/);
  assert.match(route, /Content-Disposition/);
});
