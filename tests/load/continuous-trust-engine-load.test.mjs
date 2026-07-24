import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import {
  detectSignalDrift,
  evaluateSignalPolicy,
} from "../../src/lib/continuous-trust/signal-engine.ts";

function signal(index) {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    tenantId: "11111111-1111-4111-8111-111111111111",
    entityId: `device:${index % 100}`,
    entityType: "DEVICE",
    signalType: "DEVICE",
    source: "load-test",
    provider: null,
    observedAt: "2026-07-24T10:00:00.000Z",
    receivedAt: "2026-07-24T10:00:01.000Z",
    severity: "HIGH",
    confidence: 0.9,
    status: "NEGATIVE",
    fingerprint: "a".repeat(64),
    correlationId: "33333333-3333-4333-8333-333333333333",
    causationId: null,
    metadata: { changeType: "NEW_DEVICE", previousScore: 90, currentScore: 60 },
    createdAt: "2026-07-24T10:00:01.000Z",
  };
}

test("deterministic signal evaluation sustains the documented in-process budget", () => {
  const count = 10_000;
  const started = performance.now();
  let decisions = 0;
  for (let index = 0; index < count; index += 1) {
    const current = signal(index);
    const decision = evaluateSignalPolicy(current, detectSignalDrift(current));
    if (decision.material) decisions += 1;
  }
  const elapsedMs = performance.now() - started;
  assert.equal(decisions, count);
  assert.ok(
    elapsedMs < 5_000,
    `Expected ${count} deterministic evaluations within 5000ms; observed ${elapsedMs.toFixed(1)}ms`,
  );
});
