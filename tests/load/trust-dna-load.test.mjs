import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { TrustDNAEngine } from "../../src/core/trust/dna/index.ts";

test("Trust DNA evaluates the bounded 500-evidence window within one second", () => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const entityId = "22222222-2222-4222-8222-222222222222";
  const types = [
    "IDENTITY", "PASSPORT", "EMAIL", "PHONE", "DEVICE", "LOCATION",
    "BEHAVIOUR", "NETWORK", "ENTERPRISE_POLICY", "HISTORICAL_DECISION",
    "AI_AGENT_BEHAVIOUR",
  ];
  const evidence = Array.from({ length: 500 }, (_, index) => ({
    id: `${String(index).padStart(8, "0")}-3333-4333-8333-${String(index).padStart(12, "0")}`,
    tenantId,
    entityId,
    source: "provider:load",
    provider: "load",
    evidenceType: types[index % types.length],
    confidence: 0.85 + (index % 10) / 100,
    metadata: { status: index % 29 === 0 ? "INCONCLUSIVE" : "VALID" },
    version: 1,
    createdAt: "2026-07-24T09:00:00.000Z",
  }));
  const started = performance.now();
  const profile = new TrustDNAEngine().calculate({
    profileId: "44444444-4444-4444-8444-444444444444",
    tenantId,
    entity: {
      id: entityId,
      tenantId,
      entityType: "ORGANISATION",
      entityName: "Load test organisation",
      status: "ACTIVE",
      metadata: {},
      version: 1,
      createdAt: "2026-07-24T09:00:00.000Z",
      updatedAt: "2026-07-24T09:00:00.000Z",
      deletedAt: null,
    },
    evidence,
    sources: [{
      tenantId,
      provider: "load",
      health: "HEALTHY",
      latencyMs: 12,
      costAmount: null,
      costCurrency: null,
      lastSeen: "2026-07-24T09:00:00.000Z",
      version: 1,
      updatedAt: "2026-07-24T09:00:00.000Z",
    }],
    calculatedAt: "2026-07-24T10:00:00.000Z",
  });
  const duration = performance.now() - started;
  assert.equal(profile.evidenceUsed.length, 500);
  assert.ok(duration < 1_000, `Trust DNA calculation took ${duration.toFixed(2)}ms`);
});
