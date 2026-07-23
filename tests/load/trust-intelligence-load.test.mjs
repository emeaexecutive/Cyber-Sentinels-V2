import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { TrustDNAEngine, validateEvidenceNode } from "../../src/core/trust/index.ts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const identityId = "human:performance";
const kinds = ["PASSPORT", "EMAIL", "PHONE", "DEVICE", "LOCATION", "BROWSER", "ENTERPRISE_POLICY", "RISK_DECISION"];

test("Trust DNA evaluates the bounded 500-node API window within the performance budget", () => {
  const evidence = Array.from({ length: 500 }, (_, index) =>
    validateEvidenceNode({
      id: `${String(index).padStart(8, "0")}-1111-4111-8111-111111111111`,
      tenantId,
      identityId,
      kind: kinds[index % kinds.length],
      label: `Evidence ${index}`,
      confidence: 0.5 + (index % 50) / 100,
      status: index % 17 === 0 ? "INCONCLUSIVE" : "VALID",
      source: "load-test",
      verifier: "bounded-fixture",
      observedAt: new Date(Date.UTC(2026, 6, 23, 9, index % 60)).toISOString(),
      validUntil: null,
      payloadHash: index.toString(16).padStart(64, "0"),
      metadata: {},
      createdAt: "2026-07-23T10:00:00.000Z",
    }),
  );
  const started = performance.now();
  const profile = new TrustDNAEngine().build({
    profileId: "99999999-9999-4999-8999-999999999999",
    tenantId,
    identityId,
    evidence,
    generatedAt: "2026-07-23T11:00:00.000Z",
  });
  const durationMs = performance.now() - started;
  assert.equal(profile.dimensions.length, 10);
  assert.ok(durationMs < 1_000, `Trust DNA took ${durationMs.toFixed(2)}ms`);
});
