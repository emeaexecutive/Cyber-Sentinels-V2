import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { entityIdentityModel, normalizeEntityIdentity } from "../lib/core/entity-identity.ts";
import { evaluateAuthorityGraph } from "../lib/core/authority-graph.ts";
import { buildEnterpriseOperationalReadinessDemo, buildTrustFabricDemo, projectValeContext, TRUST_FABRIC_SERVICES } from "../lib/core/trust-fabric.ts";
import { createProviderConsensus } from "../lib/providers/provider-consensus.ts";
import { WORKFLOW_TEMPLATE_IDS, workflowTemplates } from "../lib/workflows/workflow-templates.ts";

const now = new Date().toISOString();

function authorityGrants() {
  return [
    { id: "grant-org-human", tenantId: "tenant-a", grantorId: "org-a", grantorType: "organization", granteeId: "human-a", granteeType: "human", scope: ["approve", "read"], constraints: { workflowIds: ["workflow-a"], actions: ["approve"], purposes: ["financial_approval"] }, maxDelegationDepth: 1, issuedAt: now, evidenceRefs: ["evidence:mandate"] },
    { id: "grant-human-agent", tenantId: "tenant-a", grantorId: "human-a", grantorType: "human", granteeId: "agent-a", granteeType: "ai_agent", scope: ["approve"], constraints: { workflowIds: ["workflow-a"], actions: ["approve"], purposes: ["financial_approval"] }, parentGrantId: "grant-org-human", maxDelegationDepth: 0, issuedAt: now, evidenceRefs: ["evidence:delegation"] },
  ];
}

test("canonical entity model supports every Trust Fabric entity with shared identity fields", () => {
  const required = ["human", "ai_agent", "machine_identity", "organization", "workflow", "credential", "session", "evidence", "decision", "replay", "authority", "provider"];
  const types = new Set(entityIdentityModel.map((entity) => entity.type));
  for (const type of required) assert.ok(types.has(type), `${type} must be represented`);

  const normalized = normalizeEntityIdentity({ id: "agent-a", type: "ai_agent", tenant_id: "tenant-a", owner: "org-a", relationships: [{ type: "belongs_to", target_id: "org-a" }], evidence_refs: ["evidence:agent"] });
  assert.equal(normalized.global_id, "tenant-a:ai_agent:agent-a");
  assert.equal(normalized.tenant_id, "tenant-a");
  assert.equal(normalized.lifecycle.state, "pending");
  assert.deepEqual(normalized.relationships, [{ type: "belongs_to", target_id: "org-a" }]);
});

test("authority graph permits bounded delegation and prevents privilege escalation", () => {
  const allowed = evaluateAuthorityGraph({ tenantId: "tenant-a", subjectId: "agent-a", workflowId: "workflow-a", action: "approve", purpose: "financial_approval", grants: authorityGrants(), evaluatedAt: now });
  assert.equal(allowed.decision, "ALLOW");
  assert.equal(allowed.accountableHumanId, "human-a");
  assert.deepEqual(allowed.effectiveScope, ["approve"]);
  assert.ok(allowed.checks.every((check) => check.passed));

  const escalated = authorityGrants();
  escalated[1].scope = ["approve", "transfer_funds"];
  const denied = evaluateAuthorityGraph({ tenantId: "tenant-a", subjectId: "agent-a", workflowId: "workflow-a", action: "transfer_funds", purpose: "financial_approval", grants: escalated, evaluatedAt: now });
  assert.equal(denied.decision, "DENY");
  assert.match(denied.checks.map((check) => check.name).join(" "), /scope inheritance/);
});

test("authority graph fails closed on revocation and expiry", () => {
  const revoked = authorityGrants();
  revoked[1].revokedAt = new Date(Date.now() - 1_000).toISOString();
  assert.equal(evaluateAuthorityGraph({ tenantId: "tenant-a", subjectId: "agent-a", workflowId: "workflow-a", action: "approve", purpose: "financial_approval", grants: revoked }).decision, "DENY");

  const expired = authorityGrants();
  expired[1].expiresAt = new Date(Date.now() - 1_000).toISOString();
  assert.equal(evaluateAuthorityGraph({ tenantId: "tenant-a", subjectId: "agent-a", workflowId: "workflow-a", action: "approve", purpose: "financial_approval", grants: expired }).decision, "DENY");
});

test("provider consensus is explainable and does not blindly average conflicts", () => {
  const support = createProviderConsensus([
    { provider: "Identity provider", category: "identity", state: "Live", signal: "support", model: "identity", version: "1.0", latencyMs: 20, confidence: 0.91, evidenceRefs: ["evidence:identity"] },
    { provider: "Session provider", category: "session_integrity", state: "Live", signal: "support", model: "session", version: "2.0", latencyMs: 18, confidence: 0.84, evidenceRefs: ["evidence:session"] },
  ]);
  assert.equal(support.decision, "support");
  assert.equal(support.categoryCoverage.length, 2);
  assert.equal(support.contributions[0].model, "identity");
  assert.equal(support.contributions[0].version, "1.0");
  assert.equal(support.contributions[0].latencyMs, 20);

  const conflict = createProviderConsensus([
    { provider: "Identity provider", category: "identity", state: "Live", signal: "support", model: "identity", version: "1.0", confidence: 0.9 },
    { provider: "Session provider", category: "session_integrity", state: "Live", signal: "challenge", model: "session", version: "2.0", confidence: 0.9 },
  ]);
  assert.equal(conflict.decision, "conflict");
  assert.match(conflict.limitations.join(" "), /no average is treated as truth/i);
});

test("Trust Fabric demo connects authority, consensus, decision, Replay, graph, memory and governance", () => {
  const demo = buildTrustFabricDemo();
  assert.equal(demo.contract, "enterprise_trust_fabric/1.1");
  assert.equal(demo.authority.decision, "ALLOW");
  assert.equal(demo.consensus.decision, "support");
  assert.ok(demo.replay.reference);
  assert.ok(demo.trustMemory.reference);
  assert.equal(demo.trustMemory.integrity.valid, true);
  assert.deepEqual(demo.lifecycle.trust_memory_event.policy_refs, ["policy:financial-approval/1.1"]);
  assert.deepEqual(demo.lifecycle.trust_memory_event.authority_refs, ["authorization:trust-fabric-demo-001"]);
  assert.equal(demo.evidence.integrity.valid, true);
  assert.equal(demo.explainability.decision, demo.trust.decision);
  assert.ok(demo.explainability.evidenceSummary.count > 0);
  assert.equal(demo.explainability.authoritySummary.decision, "ALLOW");
  assert.equal(demo.explainability.policyApplied.version, "financial-approval/1.1");
  assert.equal(demo.explainability.confidenceExplanation.providerDecision, "support");
  assert.equal(demo.explainability.replayReference, demo.replay.reference);
  assert.ok(demo.explainability.trustMemoryUpdate.state.startsWith("Trust "));
  assert.equal(demo.explainability.nextRecommendedAction, demo.trust.nextAction);
  assert.ok(demo.governance.reviewAvailable === true || demo.trust.decision === "allow");
  for (const service of ["Identity", "Authority", "Trust Engine", "Provider Orchestrator", "Evidence Graph", "Trust Memory\u2122", "Governance"]) {
    assert.ok(TRUST_FABRIC_SERVICES.some(([name]) => name === service));
  }
});

test("VALE projects human-agent-robot evidence into a canonical transaction without owning a decision or receipt", async () => {
  const projection = projectValeContext({
    tenantId: "tenant:demo",
    actorLineage: [
      { operationalEntityId: "human:alice", type: "HUMAN", role: "operator", accountablePrincipalId: "human:alice" },
      { operationalEntityId: "agent:alpha", type: "AI_AGENT", role: "planner", accountablePrincipalId: "human:alice" },
      { operationalEntityId: "robot:beta", type: "ROBOT", role: "warehouse_robot", accountablePrincipalId: "human:alice" },
    ],
    intent: { action: "MOVE", resource: "warehouse:pallet-123", purpose: "warehouse_move", environment: "preview", destination: "warehouse:zone-b", signedBy: "human:alice", signedAt: now, signatureReference: "intent:alice-001" },
    machine: { identityState: "MACHINE_IDENTITY_VERIFIED", attestationState: "CURRENT", firmwareHash: "f".repeat(64) },
    model: { provider: "provider:test", modelId: "navigation", version: "v1", weightsHash: "a".repeat(64) },
    monitoring: { expectedProviders: ["fleet", "camera"], observedProviders: ["fleet"], telemetryGapSeconds: 8, connection: "INTERMITTENT" },
    sensors: [
      { source: "vision", observationClass: "MODEL_PERCEPTION", observation: "PATH_CLEAR", observedAt: now, digest: "b".repeat(64), freshness: "current" },
      { source: "lidar", observationClass: "INDEPENDENT_OBSERVATION", observation: "OBSTACLE_PRESENT", observedAt: now, digest: "c".repeat(64), freshness: "current" },
    ],
    execution: { commandTarget: "warehouse:zone-c", stages: [{ stage: "COMMAND_SENT", status: "observed", occurredAt: now, evidenceReference: "command:001" }] },
    oversight: "HUMAN_IN_THE_LOOP",
    conflicts: ["PHYSICAL_PATH_CONFLICT"],
    idempotencyKey: "vale-projection-001",
  });
  assert.equal(projection.canonicalTransactionInput.trustObject.subjectType, "machine_identity");
  assert.ok(projection.evidenceTypes.includes("INTENT_EXECUTION_MISMATCH"));
  assert.ok(projection.evidenceTypes.includes("SENSOR_DISAGREEMENT"));
  assert.equal(Object.hasOwn(projection, "decision"), false);
  assert.equal(Object.hasOwn(projection, "receipt"), false);

  const valeSource = await readFile(new URL("../src/lib/trust-fabric/vale.ts", import.meta.url), "utf8");
  assert.doesNotMatch(valeSource, /function evaluateValeTrust|ValeReceiptStore|ValeEvidenceGraph|ValeReplay|ValeMemory/);
  assert.match(valeSource, /executeCanonicalTrustTransaction\(projectValeContext\(input\)\.canonicalTransactionInput/);
});

test("enterprise operational demo covers the ten requested steps with explicit reality states", () => {
  const demo = buildEnterpriseOperationalReadinessDemo();
  assert.equal(demo.steps.length, 10);
  assert.deepEqual(demo.steps.map((step) => step.label), [
    "Human verification",
    "AI agent verification",
    "Machine identity verification",
    "Trust Decision",
    "Replay",
    "Evidence Graph",
    "Trust Memory™",
    "Governance review",
    "Enterprise dashboard",
    "Platform health",
  ]);
  assert.deepEqual(new Set(demo.steps.map((step) => step.state)), new Set(["Live", "Configured", "Simulated", "Awaiting Credentials"]));
});

test("initial domains are workflow templates that inherit the same Trust Fabric", () => {
  assert.deepEqual([...WORKFLOW_TEMPLATE_IDS], ["hiring", "ai_agent_operations", "privileged_access", "financial_approval", "vendor_access", "healthcare", "insurance", "critical_infrastructure"]);
  assert.match(workflowTemplates.hiring.boundary, /one workflow template/i);
  const serviceSets = WORKFLOW_TEMPLATE_IDS.map((id) => workflowTemplates[id].requiredServices.join("|"));
  assert.equal(new Set(serviceSets).size, 1);
});

test("Sprint 11.1 architecture, acceptance and demo documents are present", async () => {
  const files = [
    "TRUST_FABRIC_ARCHITECTURE.md",
    "AUTHORITY_GRAPH.md",
    "ENTITY_MODEL.md",
    "WORKFLOW_TEMPLATE_MODEL.md",
    "PROVIDER_CONSENSUS.md",
    "SPRINT_11_1_ACCEPTANCE.md",
    "demos/TRUST_FABRIC_CORE_DEMO.md",
  ];
  await Promise.all(files.map((file) => readFile(new URL(`../docs/${file}`, import.meta.url), "utf8")));
});
