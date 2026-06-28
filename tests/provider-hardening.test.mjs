import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeProviderSignal,
  toNormalizedVerificationResponse,
} from "../lib/providers/signals.ts";
import {
  createWorkflowTrustState,
  evolveWorkflowTrust,
} from "../lib/trust-engine.ts";

test("normalization does not invent high confidence for a verified provider state", () => {
  const signal = normalizeProviderSignal({
    providerId: "world_id",
    providerVerificationState: "verified",
  });

  assert.equal(signal.identityConfidence, 50);
  assert.equal(signal.sessionIntegrity, 50);
  assert.equal(toNormalizedVerificationResponse(signal).provider_signal, "verified");
});

test("normalization filters credential-like evidence references", () => {
  const signal = normalizeProviderSignal({
    providerId: "stripe_identity",
    providerVerificationState: "pending",
    evidenceReferences: [
      "Verification session reference",
      "api_key=should-not-leave-server",
      "Authorization: Bearer should-not-leave-server",
    ],
  });

  assert.deepEqual(signal.evidenceReferences, ["Verification session reference"]);
});

test("decrease direction always lowers its trust dimension", () => {
  const initial = createWorkflowTrustState("workflow-1", { sessionIntegrity: 80 });
  const evolved = evolveWorkflowTrust(initial, {
    signals: [{
      id: "signal-1",
      type: "session_interruption",
      observedAt: "2026-01-01T00:00:00.000Z",
      value: 10,
      direction: "decrease",
      explanation: "Session continuity changed.",
      evidenceReferences: ["Replay event"],
    }],
  });

  assert.equal(evolved.state.dimensions.sessionIntegrity, 70);
  assert.ok(evolved.state.score <= initial.state.score);
});
