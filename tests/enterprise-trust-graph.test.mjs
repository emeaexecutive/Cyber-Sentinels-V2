import test from "node:test";
import assert from "node:assert/strict";
import {
  TrustGraphQueries,
  TrustGraphService,
  TrustPolicyEvaluator,
  providerResultToTrustEvidence,
  safeTrustMetadata,
  validateTrustEntity,
} from "../src/core/trust/index.ts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const otherTenant = "99999999-9999-4999-8999-999999999999";
const actorId = "22222222-2222-4222-8222-222222222222";
const correlationId = "33333333-3333-4333-8333-333333333333";
const entityId = "44444444-4444-4444-8444-444444444444";

function trustEntity(overrides = {}) {
  return validateTrustEntity({
    id: entityId,
    tenantId,
    entityType: "HUMAN",
    entityName: "Example Human",
    status: "ACTIVE",
    metadata: {},
    version: 1,
    createdAt: "2026-07-23T12:00:00.000Z",
    updatedAt: "2026-07-23T12:00:00.000Z",
    deletedAt: null,
    ...overrides,
  });
}

function repository(overrides = {}) {
  const calls = [];
  return {
    calls,
    async createEntity(entity, event) { calls.push(["createEntity", entity, event]); return entity; },
    async updateEntity(_tenant, _id, _version, patch, event) {
      calls.push(["updateEntity", patch, event]);
      return { ...trustEntity(), ...patch, version: 2, updatedAt: event.occurredAt };
    },
    async deleteEntity(_tenant, _id, _version, event) {
      calls.push(["deleteEntity", event]);
      return { ...trustEntity(), status: "DELETED", version: 2, deletedAt: event.occurredAt };
    },
    async attachEvidence(evidence, event) { calls.push(["attachEvidence", evidence, event]); return evidence; },
    async createRelationship(relationship, event) { calls.push(["createRelationship", relationship, event]); return relationship; },
    async removeRelationship(_tenant, _id, _version, event) {
      calls.push(["removeRelationship", event]);
      return {
        id: "55555555-5555-4555-8555-555555555555",
        tenantId,
        sourceEntityId: entityId,
        targetEntityId: "66666666-6666-4666-8666-666666666666",
        relationshipType: "USES_DEVICE",
        confidence: 0.9,
        metadata: {},
        version: 2,
        createdAt: "2026-07-23T12:00:00.000Z",
        removedAt: event.occurredAt,
      };
    },
    async updateProvider(source, event) { calls.push(["updateProvider", source, event]); return source; },
    async findEntity(requestedTenant, id) {
      return requestedTenant === tenantId && [entityId, "66666666-6666-4666-8666-666666666666"].includes(id)
        ? trustEntity({ id, entityType: id === entityId ? "HUMAN" : "DEVICE" })
        : null;
    },
    async findRelationship() {
      return {
        id: "55555555-5555-4555-8555-555555555555",
        tenantId,
        sourceEntityId: entityId,
        targetEntityId: "66666666-6666-4666-8666-666666666666",
        relationshipType: "USES_DEVICE",
        confidence: 0.9,
        metadata: {},
        version: 1,
        createdAt: "2026-07-23T12:00:00.000Z",
        removedAt: null,
      };
    },
    async findNeighbours() { return { entities: [], relationships: [] }; },
    async findEvidence() { return []; },
    async entityTimeline() { return []; },
    async entitySummary() { return null; },
    async entityGraph() { return null; },
    async findEntitiesByEvidenceFingerprint() { return []; },
    async findProviderFailures() { return []; },
    async findLinkedEntities() { return []; },
    async findOrphanEntities() { return []; },
    async providerHealth() { return []; },
    async statistics() {
      return { tenantId, entities: 0, activeEntities: 0, evidence: 0, activeRelationships: 0, providers: 0, orphanEntities: 0, measuredAt: "2026-07-23T12:00:00.000Z" };
    },
    ...overrides,
  };
}

function service(repo, ids) {
  let index = 0;
  return new TrustGraphService(repo, {
    idFactory: () => ids[index++],
    now: () => "2026-07-23T12:00:00.000Z",
  });
}

test("Trust Entity validation is versioned and strips sensitive metadata", () => {
  assert.equal(trustEntity().version, 1);
  assert.deepEqual(
    safeTrustMetadata({ safe: true, email: "private", apiToken: "secret" }),
    { safe: true },
  );
  assert.throws(() => trustEntity({ entityName: "" }), /between 1 and 200/);
});

test("TrustGraphService creates an entity and immutable EntityCreated event together", async () => {
  const repo = repository();
  const graph = service(repo, [
    entityId,
    "77777777-7777-4777-8777-777777777777",
  ]);
  const created = await graph.createEntity(
    { tenantId, actorId, correlationId },
    { entityType: "HUMAN", entityName: "Example Human", metadata: { safe: true } },
  );
  assert.equal(created.id, entityId);
  assert.equal(repo.calls[0][2].eventType, "ENTITY_CREATED");
  assert.equal(repo.calls[0][2].resourceId, entityId);
});

test("evidence and relationships are provider-neutral, tenant-bound and event emitting", async () => {
  const repo = repository();
  const graph = service(repo, [
    "77777777-7777-4777-8777-777777777777",
    "88888888-8888-4888-8888-888888888888",
    "99999999-9999-4999-8999-999999999999",
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  ]);
  const evidence = await graph.attachEvidence(
    { tenantId, actorId, correlationId },
    {
      entityId,
      source: "provider:hopae",
      provider: "hopae_connect",
      evidenceType: "IDENTITY",
      confidence: 0.9,
      metadata: { reference: "provider-ref" },
    },
  );
  const relationship = await graph.createRelationship(
    { tenantId, actorId, correlationId },
    {
      sourceEntityId: entityId,
      targetEntityId: "66666666-6666-4666-8666-666666666666",
      relationshipType: "USES_DEVICE",
      confidence: 0.8,
      metadata: {},
    },
  );
  assert.equal(evidence.tenantId, tenantId);
  assert.equal(relationship.version, 1);
  assert.deepEqual(repo.calls.map((call) => call[2].eventType), [
    "EVIDENCE_ADDED",
    "RELATIONSHIP_ADDED",
  ]);
});

test("graph reads remove cross-tenant repository output defensively", async () => {
  const neighbourId = "66666666-6666-4666-8666-666666666666";
  const repo = repository({
    async findNeighbours() {
      return {
        entities: [
          trustEntity({ id: neighbourId, entityType: "DEVICE" }),
          trustEntity({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", tenantId: otherTenant }),
        ],
        relationships: [
          {
            id: "55555555-5555-4555-8555-555555555555",
            tenantId,
            sourceEntityId: entityId,
            targetEntityId: neighbourId,
            relationshipType: "USES_DEVICE",
            confidence: 0.9,
            metadata: {},
            version: 1,
            createdAt: "2026-07-23T12:00:00.000Z",
            removedAt: null,
          },
          {
            id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            tenantId: otherTenant,
            sourceEntityId: entityId,
            targetEntityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            relationshipType: "INVALID",
            confidence: 1,
            metadata: {},
            version: 1,
            createdAt: "2026-07-23T12:00:00.000Z",
            removedAt: null,
          },
        ],
      };
    },
  });
  const result = await service(repo, []).findNeighbours(tenantId, entityId);
  assert.deepEqual(result.entities.map((item) => item.id), [neighbourId]);
  assert.equal(result.relationships.length, 1);
});

test("TrustPolicyEvaluator evaluates rules without introducing scoring", () => {
  const result = new TrustPolicyEvaluator().evaluate(
    {
      id: "policy:device",
      version: "1",
      name: "Require managed device",
      effect: "ALLOW",
      rules: [
        { id: "managed", field: "device.managed", operator: "EQUALS", value: true, message: "Device must be managed." },
        { id: "status", field: "entity.status", operator: "IN", value: ["ACTIVE"], message: "Entity must be active." },
      ],
    },
    { device: { managed: true }, entity: { status: "ACTIVE" } },
  );
  assert.equal(result.matched, true);
  assert.equal(result.effect, "ALLOW");
  assert.equal("score" in result, false);
});

test("provider response normalization exposes TrustEvidence only", () => {
  const result = providerResultToTrustEvidence(
    {
      provider: "hopae_connect",
      tenantId,
      identityId: "human:1",
      status: "VALID",
      confidence: 0.92,
      evidenceKind: "HUMAN",
      reference: "provider-ref",
      observedAt: "2026-07-23T12:00:00Z",
      expiresAt: null,
      limitations: [],
      attributes: { verified: true },
    },
    { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", entityId },
  );
  assert.equal(result.provider, "hopae_connect");
  assert.equal(result.metadata.reference, "provider-ref");
  assert.equal("attributes" in result, false);
});

test("query layer requires hashes for shared device and email queries", async () => {
  const calls = [];
  const repo = repository({
    async findEntitiesByEvidenceFingerprint(...args) { calls.push(args); return []; },
  });
  const queries = new TrustGraphQueries(repo);
  const hash = "a".repeat(64);
  await queries.findEntitiesUsingDevice(tenantId, hash);
  await queries.findEntitiesSharingEmail(tenantId, hash);
  assert.deepEqual(calls.map((call) => call[1]), ["DEVICE", "EMAIL"]);
  assert.equal(calls.every((call) => call[2] === hash), true);
});
