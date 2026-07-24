import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { ReplayEngine, ReplayRenderer } from "../../src/core/trust/replay/index.ts";

test("Replay reconstructs and renders 500 chained events within one second", () => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const entityId = "22222222-2222-4222-8222-222222222222";
  let previousEventHash = null;
  const events = Array.from({ length: 500 }, (_, index) => {
    const integrityHash = index.toString(16).padStart(64, "0");
    const event = {
      id: `${String(index).padStart(8, "0")}-3333-4333-8333-${String(index).padStart(12, "0")}`,
      tenantId,
      identityId: entityId,
      entityId,
      type: index % 5 === 0 ? "TRUST_UPDATED" : "EVIDENCE_ADDED",
      title: "Replay load event",
      description: "Bounded forensic event retained for performance validation.",
      occurredAt: new Date(Date.UTC(2026, 6, 24, 10, 0, index)).toISOString(),
      source: "load",
      actorId: null,
      actor: "system:load",
      provider: "load-provider",
      confidence: 0.9,
      evidenceIds: [],
      priorRisk: 20,
      resultingRisk: 21,
      priorTrust: 80,
      resultingTrust: 79,
      metadata: {},
      previousEventHash,
      integrityHash,
      createdAt: new Date(Date.UTC(2026, 6, 24, 10, 0, index)).toISOString(),
    };
    previousEventHash = integrityHash;
    return event;
  }).reverse();
  const started = performance.now();
  const timeline = new ReplayEngine().build(tenantId, entityId, events);
  const rendered = new ReplayRenderer().render(timeline);
  const duration = performance.now() - started;
  assert.equal(timeline.events.length, 500);
  assert.equal(timeline.integrity.valid, true);
  assert.equal(rendered.length, 500);
  assert.ok(duration < 1_000, `Replay took ${duration.toFixed(2)}ms`);
});
