import test from "node:test";
import assert from "node:assert/strict";
import {
  EvidenceGraphService,
  TrustTimeline,
  validateEvidenceNode,
} from "../src/core/trust/index.ts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const otherTenant = "99999999-9999-4999-8999-999999999999";
const identityId = "human:integration";

function node(id, kind, observedAt, tenant = tenantId) {
  return validateEvidenceNode({
    id,
    tenantId: tenant,
    identityId,
    kind,
    label: `${kind} evidence`,
    confidence: 0.9,
    status: "VALID",
    source: "integration",
    verifier: "test_provider",
    observedAt,
    validUntil: null,
    payloadHash: id.replaceAll("-", "").padEnd(64, "a").slice(0, 64),
    metadata: {},
    createdAt: observedAt,
  });
}

test("EvidenceGraphService keeps graph and history inside the requested tenant", async () => {
  const first = node("11111111-2222-4222-8222-111111111111", "EMAIL", "2026-07-23T09:16:00Z");
  const second = node("22222222-3333-4333-8333-222222222222", "DEVICE", "2026-07-23T09:17:00Z");
  const foreign = node("33333333-4444-4444-8444-333333333333", "PHONE", "2026-07-23T09:18:00Z", otherTenant);
  const repository = {
    async findNode(requestedTenant, id) {
      return [first, second, foreign].find((item) => item.tenantId === requestedTenant && item.id === id) ?? null;
    },
    async findNodesByIdentity() {
      return [second, foreign, first];
    },
    async findRelationships() {
      return [
        {
          id: "44444444-5555-4555-8555-444444444444",
          tenantId,
          fromNodeId: first.id,
          toNodeId: second.id,
          type: "SUPPORTS",
          confidence: 0.8,
          source: "integration",
          observedAt: "2026-07-23T09:18:00Z",
          createdAt: "2026-07-23T09:18:00Z",
        },
        {
          id: "55555555-6666-4666-8666-555555555555",
          tenantId: otherTenant,
          fromNodeId: foreign.id,
          toNodeId: first.id,
          type: "CONTRADICTS",
          confidence: 0.8,
          source: "invalid-cross-tenant",
          observedAt: "2026-07-23T09:19:00Z",
          createdAt: "2026-07-23T09:19:00Z",
        },
      ];
    },
    async saveNode() {},
    async saveRelationship() {},
  };
  const service = new EvidenceGraphService(repository);
  const graph = await service.getGraph(tenantId, identityId);
  assert.deepEqual(graph.nodes.map((item) => item.id), [second.id, first.id]);
  assert.equal(graph.relationships.length, 1);
  const history = await service.getHistory(tenantId, identityId);
  assert.deepEqual(history.nodes.map((item) => item.id), [first.id, second.id]);
});

test("TrustTimeline composes retained evidence, updates and replay without losing chronology", () => {
  const evidence = node("66666666-7777-4777-8777-666666666666", "PASSPORT", "2026-07-23T09:15:00Z");
  const timeline = new TrustTimeline().build({
    tenantId,
    identityId,
    evidence: [evidence],
    replayEvents: [{
      id: "manual-review",
      tenantId,
      identityId,
      type: "MANUAL_OVERRIDE",
      title: "Manual approval",
      description: "Reviewer restored trust",
      occurredAt: "2026-07-23T09:22:00Z",
      source: "GOVERNANCE",
      confidence: 1,
      evidenceIds: [evidence.id],
      priorTrust: 62,
      resultingTrust: 80,
      actorId: "reviewer:1",
      metadata: {},
    }],
    updates: [{
      id: "update-1",
      tenantId,
      identityId,
      signalId: "signal-1",
      priorTrust: 90,
      resultingTrust: 62,
      delta: -28,
      confidence: 0.8,
      reason: "VPN detected",
      occurredAt: "2026-07-23T09:20:00Z",
    }],
  });
  assert.deepEqual(timeline.events.map((item) => item.type), [
    "EVIDENCE_RECORDED",
    "TRUST_UPDATED",
    "MANUAL_OVERRIDE",
  ]);
});
