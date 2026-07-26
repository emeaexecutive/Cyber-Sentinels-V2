import test from "node:test";
import assert from "node:assert/strict";
import { TrustDNAService } from "../src/core/trust/dna/index.ts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const otherTenant = "99999999-9999-4999-8999-999999999999";
const entityId = "22222222-2222-4222-8222-222222222222";

function graphEntity() {
  return {
    id: entityId,
    tenantId,
    entityType: "DEVICE",
    entityName: "Managed endpoint",
    status: "ACTIVE",
    metadata: {},
    version: 1,
    createdAt: "2026-07-24T09:00:00.000Z",
    updatedAt: "2026-07-24T09:00:00.000Z",
    deletedAt: null,
  };
}

test("service recalculates from graph evidence, rejects foreign evidence, and persists next version", async () => {
  let saved;
  const previous = {
    profileId: "33333333-3333-4333-8333-333333333333",
    tenantId,
    entityId,
    identityId: entityId,
    entityType: "DEVICE",
    profileVersion: "trust-dna-v2",
    version: 3,
    overallScore: 50,
    overallConfidence: 50,
    evidenceCompleteness: 50,
    dimensions: [],
    dimensionBreakdown: [],
    vector: {},
    evidenceUsed: [],
    evidenceMissing: [],
    riskIndicators: [],
    recommendedActions: [],
    riskBand: "MODERATE",
    explanation: [],
    generatedAt: "2026-07-24T09:00:00.000Z",
    lastRecalculated: "2026-07-24T09:00:00.000Z",
  };
  const repository = {
    async findEntity(requestedTenant, requestedEntity) {
      return requestedTenant === tenantId && requestedEntity === entityId ? graphEntity() : null;
    },
    async findEvidence() {
      return [
        {
          id: "44444444-4444-4444-8444-444444444444",
          tenantId,
          entityId,
          source: "provider:endpoint",
          provider: "endpoint",
          evidenceType: "DEVICE",
          confidence: 0.9,
          metadata: { status: "VALID" },
          version: 1,
          createdAt: "2026-07-24T09:10:00.000Z",
        },
        {
          id: "55555555-5555-4555-8555-555555555555",
          tenantId: otherTenant,
          entityId,
          source: "provider:foreign",
          provider: "foreign",
          evidenceType: "NETWORK",
          confidence: 1,
          metadata: { status: "VALID" },
          version: 1,
          createdAt: "2026-07-24T09:11:00.000Z",
        },
      ];
    },
    async providerHealth() {
      return [];
    },
    async findLatestProfile() {
      return previous;
    },
    async findHistory() {
      return [];
    },
    async saveProfile(profile) {
      saved = profile;
      return profile;
    },
  };
  const service = new TrustDNAService(
    repository,
    undefined,
    () => "66666666-6666-4666-8666-666666666666",
    () => "2026-07-24T10:00:00.000Z",
  );
  const profile = await service.recalculate(tenantId, entityId);
  assert.equal(profile.version, 4);
  assert.equal(profile.profileId, "66666666-6666-4666-8666-666666666666");
  assert.deepEqual(profile.evidenceUsed, ["44444444-4444-4444-8444-444444444444"]);
  assert.equal(saved, profile);
});

test("service fails closed when an entity is absent from the authenticated tenant", async () => {
  const repository = {
    async findEntity() { return null; },
    async findEvidence() { return []; },
    async providerHealth() { return []; },
    async findLatestProfile() { return null; },
    async findHistory() { return []; },
    async saveProfile(profile) { return profile; },
  };
  await assert.rejects(
    new TrustDNAService(repository).getProfile(tenantId, entityId),
    /not found/i,
  );
});
