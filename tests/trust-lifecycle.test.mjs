import assert from "node:assert/strict";
import test from "node:test";
import {
  TRUST_LIFECYCLE_PHASES,
  TRUST_LIFECYCLE_TEMPLATES,
  buildLifecycleDashboard,
  writeTrustLifecyclePhase,
} from "../lib/core/trust-lifecycle.ts";
import { createAgentPassportV2, exportAgentPassportJson } from "../lib/core/agent-passport-v2.ts";

test("models the complete continuous trust lifecycle and template set", () => {
  assert.equal(TRUST_LIFECYCLE_PHASES.length, 18);
  assert.deepEqual(TRUST_LIFECYCLE_PHASES.slice(0, 3), ["application", "identity_verification", "credential_validation"]);
  assert.equal(TRUST_LIFECYCLE_PHASES.at(-1), "archive");
  assert.deepEqual(TRUST_LIFECYCLE_TEMPLATES, ["hiring", "ai_agent", "vendor", "executive", "machine_identity", "financial_workflow", "healthcare", "government"]);
});

test("every phase write connects replay, evidence graph, Trust Memory and governance", () => {
  for (const phase of TRUST_LIFECYCLE_PHASES) {
    const write = writeTrustLifecyclePhase({
      workflowId: `workflow-${phase}`,
      subjectId: "subject-1",
      actorId: "actor-1",
      template: "vendor",
      phase,
      confidenceBefore: 0.7,
      reason: `${phase} lifecycle evidence recorded`,
      evidenceRefs: [`evidence:${phase}`],
      evidenceExpected: 1,
      createdAt: "2026-07-12T09:00:00.000Z",
    });

    assert.equal(write.phase, phase);
    assert.ok(write.replay.id);
    assert.ok(write.evidence_graph.nodes.length >= 4);
    assert.equal(write.trust_memory.replay_refs[0], write.replay.id);
    assert.equal(write.governance_event.replay_ref, write.replay.id);
    assert.equal(write.evidence_completeness, 100);
  }
});

test("continuous trust gains, decays, escalates and recovers with bounded confidence", () => {
  const changes = [
    ["trust_gain", 0.58],
    ["trust_decay", 0.42],
    ["step_up_verification", 0.47],
    ["manual_review", 0.45],
    ["policy_change", 0.46],
    ["runtime_anomaly", 0.32],
    ["credential_rotation", 0.55],
    ["identity_refresh", 0.57],
  ];

  for (const [action, expected] of changes) {
    const write = writeTrustLifecyclePhase({
      workflowId: `workflow-${action}`,
      subjectId: "subject-1",
      actorId: "actor-1",
      template: "machine_identity",
      phase: "runtime_trust",
      action,
      confidenceBefore: 0.5,
      reason: `${action} recorded`,
      evidenceRefs: [`evidence:${action}`],
      createdAt: "2026-07-12T09:00:00.000Z",
    });
    assert.equal(write.confidence_after, expected);
    assert.ok(write.confidence_after >= 0 && write.confidence_after <= 1);
  }
});

test("dashboard and Trust Passport v2 expose lifecycle acceptance fields", () => {
  const write = writeTrustLifecyclePhase({
    workflowId: "workflow-passport",
    subjectId: "agent-1",
    actorId: "agent-1",
    actorType: "ai_agent",
    template: "ai_agent",
    phase: "runtime_trust",
    action: "runtime_anomaly",
    confidenceBefore: 0.8,
    reason: "Runtime scope changed",
    evidenceRefs: ["evidence:scope"],
    evidenceExpected: 2,
    createdAt: "2026-07-12T09:00:00.000Z",
  });
  const dashboard = buildLifecycleDashboard([write]);
  const passport = createAgentPassportV2({
    agentId: "agent-1",
    agentName: "Review Agent",
    currentTrustScore: 62,
    historicalTrend: [{ at: write.created_at, score: 62, reason: write.trust_memory.reason }],
    lifecycleStage: dashboard.currentStage,
    evidenceCompleteness: dashboard.evidenceCompleteness,
    replayAvailability: "available",
    trustMemorySummary: dashboard.trustMemorySummary,
  });
  const exported = exportAgentPassportJson(passport);

  assert.equal(dashboard.currentStage, "runtime_trust");
  assert.equal(dashboard.governanceState, "review_required");
  assert.equal(exported.continuousTrust.currentTrustScore, 62);
  assert.equal(exported.continuousTrust.lifecycleStage, "runtime_trust");
  assert.equal(exported.continuousTrust.evidenceCompleteness, 50);
  assert.equal(exported.continuousTrust.replayAvailability, "available");
});
