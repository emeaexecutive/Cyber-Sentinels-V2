import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import {
  SENTINEL_ALLOWED_OPERATIONS,
  SENTINEL_ATTENTION_STATES,
  SENTINEL_PROHIBITED_OPERATIONS,
  SENTINEL_ROLES,
  SENTINEL_ROLE_DEFINITIONS,
  assertSentinelActionAllowed,
  createSentinelInvestigation,
  createSentinelOperations,
  createSentinelTrustBrief,
  transitionSentinelLifecycle,
} from "../lib/trust-fabric/sentinel-agents.ts";
import { createAgentAlphaTrustTwinDemo } from "../lib/trust-fabric/trust-twin.ts";

const demo = createAgentAlphaTrustTwinDemo();
const enterpriseId = demo.baseline.enterpriseId;

function projectedOperations() {
  return createSentinelOperations({ enterpriseId, twins: [demo.baseline], simulations: [demo.projected], generatedAt: "2026-08-24T09:20:00.000Z" });
}

test("one reusable architecture exposes exactly seven role configurations", () => {
  const operations = projectedOperations();
  assert.deepEqual(SENTINEL_ROLES, ["AUTHORITY", "IDENTITY", "RUNTIME", "EVIDENCE", "DEPLOYMENT", "WORKFORCE", "ROBOTICS"]);
  assert.equal(Object.keys(SENTINEL_ROLE_DEFINITIONS).length, 7);
  assert.deepEqual(SENTINEL_ATTENTION_STATES, ["NORMAL", "WATCHING", "INVESTIGATING", "ESCALATED", "PAUSED"]);
  assert.equal(operations.sentinels.length, 7);
  assert.equal(new Set(operations.sentinels.map((item) => item.identity.runtimeReference)).size, 1);
  for (const sentinel of operations.sentinels) {
    assert.equal(sentinel.identity.entityType, "SOFTWARE_AGENT");
    assert.equal(sentinel.identity.implicitTrust, false);
    assert.equal(sentinel.observableByTrustFabric, true);
    assert.ok(sentinel.identity.observedBySentinelIds.length > 0);
    assert.deepEqual(sentinel.authorityScope, SENTINEL_ALLOWED_OPERATIONS);
    assert.deepEqual(sentinel.identity.deniedOperations, SENTINEL_PROHIBITED_OPERATIONS);
    assert.ok(Number.isFinite(Date.parse(sentinel.createdAt)));
    assert.ok(Number.isFinite(Date.parse(sentinel.updatedAt)));
  }
});

test("Agent Alpha proactive investigation has the exact forecast, budget, and reach proof", () => {
  const operations = projectedOperations();
  const brief = operations.trustBriefs[0];
  assert.equal(brief.currentPressure.value, 81);
  assert.equal(brief.currentBudget.remaining, 19);
  assert.equal(brief.consequenceReach.systemCount, 19);
  assert.equal(brief.attention, "INVESTIGATING");
  assert.equal(operations.weather.state, "DETERIORATING");
  assert.equal(operations.attentionQueue[0].priority, "HIGH");
  assert.ok(brief.hypothesis.requiredProof.includes("VERIFY_RUNTIME"));
  assert.ok(brief.hypothesis.requiredProof.includes("VERIFY_DESTINATION"));
  assert.ok(brief.minimumPreventativeControl.length > 0);
});

test("preventative controls restore Agent Alpha to stable 22 pressure and 78 budget", () => {
  const brief = createSentinelTrustBrief({ enterpriseId, currentTwin: demo.projected.projectedTwin, simulation: demo.controlled, evaluatedAt: "2026-08-24T09:40:00.000Z" });
  assert.equal(brief.currentForecast, "STABLE");
  assert.equal(brief.currentPressure.value, 22);
  assert.equal(brief.currentBudget.remaining, 78);
  assert.equal(brief.trustGaps[0].status, "RESOLVED");
  assert.equal(demo.controlled.executionPerformed, false);
  assert.ok(brief.trustMemoryEvents.some((item) => item.eventType === "SENTINEL_PREVENTATIVE_CONTROL_SUCCEEDED"));
});

test("the actual unauthorized write remains a canonical denial that the Sentinel did not decide", () => {
  const brief = projectedOperations().trustBriefs[0];
  assert.deepEqual(demo.canonicalRuntimeRequest, { action: "write_repository", decision: "DENY", reasonCode: "AUTHORITY_SCOPE_INVALID", executionPerformed: false });
  assert.equal(brief.canonicalDecision, null);
  assert.equal(brief.canonicalAuthority, "UNCHANGED");
  assert.equal(brief.canonicalBoundary.decisionAuthority, "CANONICAL_TRUST_FABRIC_ONLY");
  assert.equal(brief.canonicalBoundary.sentinelCanDeny, false);
});

test("one material change is correlated into one explainable investigation, not duplicate alerts", () => {
  const investigation = createSentinelInvestigation({ enterpriseId, currentTwin: demo.baseline, simulation: demo.projected, evaluatedAt: "2026-08-24T09:20:00.000Z" });
  assert.equal(investigation.performed, true);
  assert.equal(investigation.observation.material, true);
  assert.equal(investigation.observation.deduplicated, false);
  assert.equal(investigation.hypothesis.classification, "HYPOTHESIS_NOT_FACT");
  assert.ok(investigation.hypothesis.supporting.length > 0);
  assert.ok(investigation.hypothesis.contradicting.length > 0);
  assert.ok(investigation.hypothesis.requiredProof.length > 0);
  assert.match(investigation.reason, /Proposed|proof gap|authority/i);
});

test("stable low-cost observations are deterministic and do not start an investigation", () => {
  const investigation = createSentinelInvestigation({ enterpriseId, currentTwin: demo.baseline, evaluatedAt: "2026-08-24T09:05:00.000Z" });
  assert.equal(investigation.attention, "NORMAL");
  assert.equal(investigation.performed, false);
  assert.equal(investigation.observation.deduplicated, true);
  assert.equal(investigation.costControl.expensiveAiInvoked, false);
  assert.equal(investigation.costControl.deterministicConditionsFirst, true);
  assert.equal(investigation.hypothesis.canChangeCanonicalDecision, false);
});

test("authority escalation, policy mutation, evidence fabrication, external write, and cross-tenant retrieval all fail", () => {
  const sentinel = projectedOperations().sentinels[0];
  assert.throws(() => assertSentinelActionAllowed({ enterpriseId, sentinel, operation: "GRANT_AUTHORITY", targetEnterpriseId: enterpriseId }), /AUTHORITY_ESCALATION_DENIED/);
  assert.throws(() => assertSentinelActionAllowed({ enterpriseId, sentinel, operation: "MODIFY_POLICY", targetEnterpriseId: enterpriseId }), /POLICY_MODIFICATION_DENIED/);
  assert.throws(() => assertSentinelActionAllowed({ enterpriseId, sentinel, operation: "FABRICATE_EVIDENCE", targetEnterpriseId: enterpriseId }), /EVIDENCE_FABRICATION_DENIED/);
  assert.throws(() => assertSentinelActionAllowed({ enterpriseId, sentinel, operation: "EXTERNAL_WRITE", targetEnterpriseId: enterpriseId }), /EXTERNAL_WRITE_DENIED/);
  for (const operation of ["CANONICAL_ALLOW", "CANONICAL_REVIEW", "CANONICAL_DENY"]) {
    assert.throws(() => assertSentinelActionAllowed({ enterpriseId, sentinel, operation, targetEnterpriseId: enterpriseId }), /CANONICAL_ACTION_DENIED/);
  }
  assert.throws(() => assertSentinelActionAllowed({ enterpriseId, sentinel, operation: "READ_TRUST_TWIN", targetEnterpriseId: "other-tenant" }), /CROSS_TENANT_ACCESS_DENIED/);
  assert.deepEqual(assertSentinelActionAllowed({ enterpriseId, sentinel, operation: "RUN_COUNTERFACTUAL", targetEnterpriseId: enterpriseId }), { allowed: true, operation: "RUN_COUNTERFACTUAL", evidenceOnly: true, canonicalDecisionCreated: false, externalWritePerformed: false });
});

test("admin pause and resume reuse operational-entity lifecycle without destructive kill or canonical interruption", () => {
  const sentinel = projectedOperations().sentinels[0];
  const paused = transitionSentinelLifecycle({ enterpriseId, sentinel, requestedState: "PAUSED", actorRole: "admin", occurredAt: "2026-08-24T09:30:00.000Z" });
  assert.equal(paused.operationalEntityLifecycleState, "suspended");
  assert.equal(paused.canonicalSystemAffected, false);
  assert.equal(paused.destructiveKillPerformed, false);
  assert.throws(() => transitionSentinelLifecycle({ enterpriseId, sentinel, requestedState: "PAUSED", actorRole: "observer", occurredAt: "2026-08-24T09:30:00.000Z" }), /ADMIN_REQUIRED/);
  const resumedSentinel = { ...sentinel, currentState: "PAUSED" };
  const resumed = transitionSentinelLifecycle({ enterpriseId, sentinel: resumedSentinel, requestedState: "ACTIVE", actorRole: "owner", occurredAt: "2026-08-24T09:31:00.000Z" });
  assert.equal(resumed.operationalEntityLifecycleState, "active");
  assert.equal(resumed.canonicalSystemAffected, false);
});

test("PAUSED is a first-class attention state that stops investigation but never canonical evaluation", () => {
  const active = projectedOperations();
  const role = active.trustBriefs[0].sentinelRole;
  const paused = createSentinelOperations({
    enterpriseId,
    twins: [demo.baseline],
    simulations: [demo.projected],
    lifecycleStates: { [role]: "PAUSED" },
    generatedAt: "2026-08-24T09:30:00.000Z",
  });
  const sentinel = paused.sentinels.find((item) => item.role === role);
  assert.equal(sentinel.currentState, "PAUSED");
  assert.equal(sentinel.attention, "PAUSED");
  assert.equal(paused.trustBriefs[0].attention, "PAUSED");
  assert.equal(paused.canonicalSystemOperationalWhenPaused, true);
  const investigation = createSentinelInvestigation({ enterpriseId, currentTwin: demo.baseline, simulation: demo.projected, lifecycleState: "PAUSED", evaluatedAt: "2026-08-24T09:30:00.000Z" });
  assert.equal(investigation.performed, false);
  assert.deepEqual(investigation.approvedOperations, []);
  assert.match(investigation.reason, /canonical Trust Fabric remains operational/);
});

test("Sentinel disagreement is preserved for canonical evidence resolution, never voting", () => {
  const operations = projectedOperations();
  assert.equal(operations.disagreements[0].assessments.length, 3);
  assert.equal(operations.disagreements[0].canonicalResolutionMethod, "EVIDENCE_NOT_SENTINEL_VOTING");
  assert.equal(operations.sentinels.every((item) => item.recommendationIsCanonicalDecision === false), true);
});

test("graph, replay, memory, and learning records retain boundaries and no autonomous training", () => {
  const brief = projectedOperations().trustBriefs[0];
  for (const nodeType of ["SENTINEL", "OBSERVATION", "HYPOTHESIS", "SIMULATION", "RECOMMENDATION", "CANONICAL_DECISION"]) assert.ok(brief.graphProjection.nodes.some((item) => item.nodeType === nodeType));
  for (const existingNodeType of ["TRUST_CONDITION", "EVIDENCE", "TRUST_GAP", "FORECAST"]) assert.ok(brief.graphProjection.nodes.some((item) => item.nodeType === existingNodeType));
  assert.ok(brief.graphProjection.edges.some((item) => item.fromNodeType === "OBSERVATION" && item.toNodeType === "TRUST_CONDITION"));
  assert.ok(brief.graphProjection.edges.some((item) => item.fromNodeType === "TRUST_CONDITION" && item.toNodeType === "HYPOTHESIS"));
  assert.ok(brief.graphProjection.edges.some((item) => item.fromNodeType === "HYPOTHESIS" && item.toNodeType === "EVIDENCE"));
  assert.ok(brief.graphProjection.edges.some((item) => item.fromNodeType === "FORECAST" && item.toNodeType === "SIMULATION"));
  assert.ok(brief.graphProjection.edges.some((item) => item.fromNodeType === "RECOMMENDATION" && item.toNodeType === "CANONICAL_DECISION"));
  const canonicalNode = brief.graphProjection.nodes.find((item) => item.nodeType === "CANONICAL_DECISION");
  assert.equal(canonicalNode.metadata.status, "PENDING");
  assert.equal(canonicalNode.metadata.decision, null);
  assert.ok(brief.replayEvents.some((item) => item.eventType === "SENTINEL_INVESTIGATION_PERFORMED"));
  assert.ok(brief.trustMemoryEvents.some((item) => item.eventType === "SENTINEL_CRITICAL_TRUST_GAP_DISCOVERED"));
  assert.equal(brief.learningEpisode.modelTrainingPerformed, false);
  assert.equal(brief.learningEpisode.onlinePolicyLearning, false);
  assert.equal(brief.learningEpisode.canonicalDecision, null);
});

test("Trust Brief preserves pre-action context and separates facts, conditions, hypotheses, recommendations, and decisions", () => {
  const brief = projectedOperations().trustBriefs[0];
  assert.equal(brief.preActionContext.actor, demo.baseline.entityId);
  assert.equal(brief.preActionContext.delegatedHuman, demo.baseline.owner);
  assert.equal(brief.preActionContext.counterfactualReference, demo.projected.simulationId);
  assert.equal(brief.preActionContext.aiDeploymentTrustGate, "EXISTING_FORECAST_GATE");
  assert.ok(brief.hypothesis.recommendedControl.length > 0);
  assert.deepEqual(new Set(brief.explainability.map((item) => item.classification)), new Set(["OBSERVED_FACT", "DERIVED_CONDITION", "HYPOTHESIS", "RECOMMENDATION", "CANONICAL_DECISION"]));
  assert.equal(brief.explainability.find((item) => item.classification === "CANONICAL_DECISION").statement, "PENDING_CANONICAL_EVALUATION");
});

test("Sentinel monitoring records structured result metadata without chain-of-thought", () => {
  const operations = projectedOperations();
  const evidence = operations.operationalEvidence.find((item) => item.sentinelId === operations.trustBriefs[0].sentinelId);
  assert.equal(evidence.chainOfThoughtStored, false);
  assert.equal(evidence.structuredResultMetadataOnly, true);
  assert.ok(evidence.toolsUsed.length > 0);
  assert.ok(evidence.investigationReferences.length > 0);
  assert.deepEqual(evidence.counterfactualReferences, [demo.projected.simulationId]);
  assert.ok(evidence.recommendationsEmitted.length > 0);
});

test("raw secrets are rejected and never become Sentinel evidence", () => {
  assert.throws(() => createSentinelOperations({ enterpriseId, twins: [demo.baseline], owner: "Bearer abcdefghijklmnopqrstuvwxyz", generatedAt: "2026-08-24T09:20:00.000Z" }), /raw secret/);
});

test("API, receipt, and UI integrate through existing tenant-scoped Fabric surfaces", async () => {
  const [route, lifecycleServer, server, canonical, snapshot, receiptServer, page, freeze] = await Promise.all([
    readFile(new URL("../app/api/trust/sentinels/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/trust-fabric/sentinel-agents-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/trust-fabric/trust-twin-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/trust-transaction/canonical.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/operational-entities/federated-evidence.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/trust-transaction/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/sentinel-operations/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../docs/V1_ARCHITECTURE_FREEZE.md", import.meta.url), "utf8"),
  ]);
  assert.match(route, /architectureContext\(request, \["owner", "admin", "reviewer", "observer"\]\)/);
  assert.match(route, /checkRequestRateLimit/);
  assert.match(route, /persistencePerformed:\s*false/);
  assert.match(route, /export async function POST/);
  assert.match(route, /architectureContext\(request, \["owner", "admin"\]\)/);
  assert.match(route, /PAUSE_SENTINEL/);
  assert.match(route, /RESUME_SENTINEL/);
  assert.equal(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/.test(route), false);
  assert.match(lifecycleServer, /from\("operational_entities"\)/);
  assert.match(lifecycleServer, /from\("trust_architecture_audit_log"\)/);
  assert.equal(/from\("sentinel_|new .*Sentinel(?:Store|Graph|Identity|Runtime)/i.test(lifecycleServer), false);
  assert.match(server, /\.eq\("enterprise_id", input\.enterpriseId\)/);
  assert.match(server, /decision_time_snapshot/);
  assert.match(canonical, /createSentinelTrustBrief/);
  assert.match(snapshot, /sentinelTrustBrief/);
  assert.match(receiptServer, /sentinelTrustBrief:\s*decisionTimeSnapshot\.sentinelTrustBrief/);
  assert.match(page, /Sentinel Operations/);
  assert.match(page, /What needs attention now\?/);
  assert.match(page, /AUTHORITY_SCOPE_INVALID/);
  assert.match(page, /No ALLOW \/ REVIEW \/ DENY/);
  assert.match(freeze, /CYBER SENTINELS V1 ARCHITECTURE FROZEN/);
  assert.match(freeze, /V2 FEATURE/);
});

test("Sentinel V1 adds no migration or parallel persistence schema", async () => {
  const files = await readdir(new URL("../supabase/migrations/", import.meta.url));
  assert.equal(files.some((name) => /sentinel[_-]agent/i.test(name)), false);
  const source = await readFile(new URL("../lib/trust-fabric/sentinel-agents.ts", import.meta.url), "utf8");
  assert.equal(/createClient|from\(|insert\(|upsert\(|new .*Graph|new .*EvidenceStore|new .*IdentityModel|new .*RuntimeSecurity/i.test(source), false);
  assert.match(source, /DERIVED_FROM_CANONICAL_TRUST_FABRIC/);
});
