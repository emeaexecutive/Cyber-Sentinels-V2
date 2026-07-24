import test from "node:test";
import assert from "node:assert/strict";
import {
  TrustDNAEngine,
  enterpriseTrustDimensionNames,
  trustWeightsFor,
} from "../src/core/trust/dna/index.ts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const entityId = "22222222-2222-4222-8222-222222222222";

function entity(overrides = {}) {
  return {
    id: entityId,
    tenantId,
    entityType: "HUMAN",
    entityName: "Example human",
    status: "ACTIVE",
    metadata: {},
    version: 1,
    createdAt: "2026-07-24T09:00:00.000Z",
    updatedAt: "2026-07-24T09:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

function evidence(index, evidenceType, overrides = {}) {
  return {
    id: `${String(index).padStart(8, "0")}-3333-4333-8333-${String(index).padStart(12, "0")}`,
    tenantId,
    entityId,
    source: `provider:test-${index}`,
    provider: `test-${index}`,
    evidenceType,
    confidence: 0.9,
    metadata: { status: "VALID" },
    version: 1,
    createdAt: `2026-07-24T09:${String(index).padStart(2, "0")}:00.000Z`,
    ...overrides,
  };
}

test("Trust DNA calculates all twelve explained dimensions with normalized weights", () => {
  const evidenceRows = [
    evidence(1, "IDENTITY"),
    evidence(2, "PASSPORT"),
    evidence(3, "EMAIL"),
    evidence(4, "PHONE"),
    evidence(5, "DEVICE"),
    evidence(6, "LOCATION"),
    evidence(7, "BEHAVIOUR"),
    evidence(8, "NETWORK"),
    evidence(9, "ENTERPRISE_POLICY"),
    evidence(10, "HISTORICAL_DECISION"),
    evidence(11, "AI_AGENT_BEHAVIOUR"),
  ];
  const profile = new TrustDNAEngine().calculate({
    profileId: "44444444-4444-4444-8444-444444444444",
    tenantId,
    entity: entity(),
    evidence: evidenceRows,
    sources: evidenceRows.map((row) => ({
      tenantId,
      provider: row.provider,
      health: "HEALTHY",
      latencyMs: 10,
      costAmount: null,
      costCurrency: null,
      lastSeen: row.createdAt,
      version: 1,
      updatedAt: row.createdAt,
    })),
    calculatedAt: "2026-07-24T10:00:00.000Z",
  });

  assert.deepEqual(profile.dimensions.map((item) => item.name), [...enterpriseTrustDimensionNames]);
  assert.equal(profile.dimensions.length, 12);
  assert.equal(profile.profileVersion, "trust-dna-v2");
  assert.equal(profile.version, 1);
  assert.ok(profile.overallScore > 80);
  assert.ok(profile.overallConfidence > 80);
  assert.ok(profile.evidenceCompleteness > 95);
  assert.equal(profile.evidenceMissing.length, 0);
  assert.equal(profile.dimensions.every((item) => item.reason.length > 20), true);
  assert.equal(profile.dimensions.every((item) => item.lastUpdated.length > 0), true);
  assert.match(profile.explanation[0], /12 weighted dimensions/);
});

test("missing and negative evidence remain explainable and produce actions", () => {
  const profile = new TrustDNAEngine().calculate({
    profileId: "55555555-5555-4555-8555-555555555555",
    tenantId,
    entity: entity({ entityType: "AI_AGENT" }),
    evidence: [
      evidence(1, "AI_AGENT_BEHAVIOUR", {
        metadata: { status: "REJECTED" },
        confidence: 0.95,
      }),
    ],
    sources: [],
    calculatedAt: "2026-07-24T10:00:00.000Z",
  });
  const ai = profile.dimensions.find((item) => item.name === "AI_BEHAVIOUR");
  assert.equal(ai?.score, 0);
  assert.ok(ai?.riskIndicators.includes("AI_BEHAVIOUR_REJECTED"));
  assert.ok(profile.evidenceMissing.includes("DOCUMENTS"));
  assert.ok(profile.recommendedActions.some((item) => /collect or refresh/i.test(item)));
  assert.equal(profile.riskBand, "HIGH");
});

test("entity-specific weights are normalized and emphasize relevant dimensions", () => {
  for (const type of ["HUMAN", "AI_AGENT", "DEVICE", "ORGANISATION"]) {
    const weights = trustWeightsFor(type);
    assert.ok(Math.abs(weights.reduce((sum, item) => sum + item.weight, 0) - 1) < 0.001);
  }
  const ai = Object.fromEntries(trustWeightsFor("AI_AGENT").map((item) => [item.dimension, item.weight]));
  const human = Object.fromEntries(trustWeightsFor("HUMAN").map((item) => [item.dimension, item.weight]));
  assert.ok(ai.AI_BEHAVIOUR > human.AI_BEHAVIOUR);
});
