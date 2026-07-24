import test from "node:test";
import assert from "node:assert/strict";
import { ReplayService } from "../src/core/trust/replay/index.ts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const entityId = "22222222-2222-4222-8222-222222222222";

function entity() {
  return {
    id: entityId,
    tenantId,
    entityType: "AI_AGENT",
    entityName: "Replay agent",
    status: "ACTIVE",
    metadata: {},
    version: 1,
    createdAt: "2026-07-24T09:00:00Z",
    updatedAt: "2026-07-24T09:00:00Z",
    deletedAt: null,
  };
}

function replayEvent() {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    tenantId,
    identityId: entityId,
    entityId,
    type: "TRUST_DNA_RECALCULATED",
    title: "Trust DNA recalculated",
    description: "Trust DNA changed after provider evidence.",
    occurredAt: "2026-07-24T10:00:00Z",
    eventTime: "2026-07-24T10:00:00Z",
    source: "TRUST_DNA",
    actorId: null,
    actor: "system:trust-dna",
    provider: "TrustDNAEngine",
    confidence: 0.84,
    evidenceIds: ["44444444-4444-4444-8444-444444444444"],
    priorRisk: 50,
    resultingRisk: 20,
    priorTrust: 62,
    resultingTrust: 82,
    metadata: { evidenceType: "TRUST_DNA" },
    previousEventHash: null,
    integrityHash: "a".repeat(64),
    createdAt: "2026-07-24T10:00:00Z",
  };
}

test("ReplayService passes tenant search to the repository and produces every export", async () => {
  let capturedSearch;
  const repository = {
    async findEntity(requestedTenant, requestedEntity) {
      return requestedTenant === tenantId && requestedEntity === entityId ? entity() : null;
    },
    async findByIdentity() { return []; },
    async findByEntity(requestedTenant, requestedEntity, search) {
      assert.equal(requestedTenant, tenantId);
      assert.equal(requestedEntity, entityId);
      capturedSearch = search;
      return [replayEvent()];
    },
    async append(value) { return value; },
  };
  const service = new ReplayService(repository);
  const search = { provider: "TrustDNAEngine", riskMax: 30, limit: 100 };
  const artifact = await service.artifact(tenantId, entityId, search);
  assert.equal(capturedSearch, search);
  assert.equal(artifact.summary.latestTrust, 82);
  assert.match(await service.exportCsv(tenantId, entityId, search), /TRUST_DNA_RECALCULATED/);
  const audit = await service.enterpriseAudit(tenantId, entityId, search);
  assert.equal(audit.format, "Cyber Sentinels Enterprise Audit");
  assert.equal(audit.immutable, true);
});

test("ReplayService fails closed when the entity is outside the tenant", async () => {
  const repository = {
    async findEntity() { return null; },
    async findByIdentity() { return []; },
    async findByEntity() { return [replayEvent()]; },
    async append(value) { return value; },
  };
  await assert.rejects(
    new ReplayService(repository).timeline(tenantId, entityId, { limit: 100 }),
    /not found/i,
  );
});
