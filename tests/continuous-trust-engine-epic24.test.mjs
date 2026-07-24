import assert from "node:assert/strict";
import test from "node:test";
import {
  affectedTrustDimensions,
  detectSignalDrift,
  evaluateSignalPolicy,
} from "../src/lib/continuous-trust/signal-engine.ts";
import {
  assertSignalSourceAuthorized,
  validateTrustSignal,
} from "../src/lib/continuous-trust/signal-validation.ts";
import {
  continuousEntityTypes,
  trustDnaDimensions,
  trustSignalTypes,
} from "../src/lib/continuous-trust/signal-types.ts";
import {
  stateForPolicyAction,
  validateStateTransition,
} from "../src/lib/continuous-trust/state-machine.ts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";
const correlationId = "33333333-3333-4333-8333-333333333333";
const observedAt = "2026-07-24T10:00:00.000Z";
const receivedAt = "2026-07-24T10:00:01.000Z";

function input(overrides = {}) {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    entityId: "human:alice",
    entityType: "HUMAN",
    signalType: "DEVICE",
    source: "review:operations",
    observedAt,
    receivedAt,
    severity: "HIGH",
    confidence: 0.91,
    status: "NEGATIVE",
    metadata: { changeType: "NEW_DEVICE" },
    idempotencyKey: "device-human-alice-0001",
    ...overrides,
  };
}

function validate(overrides = {}) {
  return validateTrustSignal(input(overrides), {
    tenantId,
    actorId,
    correlationId,
    receivedAt,
  }).signal;
}

test("the normalized model covers every required signal and entity category", () => {
  assert.equal(trustSignalTypes.length, 21);
  for (const required of [
    "IDENTITY", "DOCUMENT", "EMAIL", "PHONE", "DEVICE", "SESSION", "BROWSER",
    "NETWORK", "VPN", "LOCATION", "BEHAVIOUR", "LIVENESS", "DEEPFAKE",
    "PROVIDER", "ENTERPRISE_POLICY", "MANUAL_REVIEW", "AI_AGENT", "AUTHORITY",
    "CREDENTIAL", "INTEGRATION", "SYSTEM",
  ]) assert.ok(trustSignalTypes.includes(required));
  assert.deepEqual(continuousEntityTypes, [
    "HUMAN", "AI_AGENT", "DEVICE", "ORGANISATION", "CREDENTIAL", "SESSION",
    "ENTERPRISE_WORKFLOW",
  ]);
  assert.equal(trustDnaDimensions.length, 12);
});

test("validation is deterministic, bounds confidence, and strips no prohibited content silently", () => {
  const first = validate();
  const second = validate();
  assert.equal(first.fingerprint, second.fingerprint);
  assert.match(first.fingerprint, /^[a-f0-9]{64}$/);
  assert.throws(() => validate({ confidence: 1.01 }), /between 0 and 1/);
  assert.throws(
    () => validate({ metadata: { accessToken: "must-never-persist" } }),
    (error) => error.code === "SIGNAL_METADATA_PROHIBITED",
  );
  assert.throws(
    () => validate({ metadata: { preciseLocation: "40.4,-3.7" } }),
    (error) => error.code === "SIGNAL_METADATA_PROHIBITED",
  );
});

test("human API callers cannot impersonate providers or the system", () => {
  assert.throws(
    () => assertSignalSourceAuthorized(validate({ source: "provider:identity" }), "owner"),
    (error) => error.code === "SIGNAL_SOURCE_DENIED",
  );
  assert.throws(
    () => assertSignalSourceAuthorized(validate(), "observer"),
    (error) => error.code === "SIGNAL_SOURCE_DENIED",
  );
});

test("material drift is explainable and policy evaluation is deterministic", () => {
  const signal = validate({
    metadata: { changeType: "NEW_DEVICE", previousScore: 92, currentScore: 70 },
  });
  const drift = detectSignalDrift(signal);
  assert.deepEqual(drift.map((finding) => finding.driftType), [
    "new_device",
    "trust_score_reduction",
  ]);
  for (const finding of drift) {
    assert.ok(finding.explanation.length > 20);
    assert.ok(finding.reasonCodes.length);
    assert.ok(finding.affectedDimensions.length);
  }
  const first = evaluateSignalPolicy(signal, drift);
  const second = evaluateSignalPolicy(signal, drift);
  assert.deepEqual(first, second);
  assert.equal(first.action, "RESTRICT");
  assert.equal(first.material, true);
});

test("provider unavailability lowers confidence context without becoming fraud evidence", () => {
  const signal = validate({
    signalType: "PROVIDER",
    source: "operations:provider-health",
    status: "UNAVAILABLE",
    metadata: { providerState: "UNAVAILABLE" },
  });
  const drift = detectSignalDrift(signal);
  const policy = evaluateSignalPolicy(signal, drift);
  assert.equal(drift[0].recommendedAction, "ALERT");
  assert.equal(policy.action, "ALERT");
  assert.doesNotMatch(drift[0].explanation, /fraud/i);
  assert.ok(affectedTrustDimensions("PROVIDER").includes("Provider Confidence"));
});

test("manual reviews enter the governed workflow and policy actions map to authoritative states", () => {
  const signal = validate({
    signalType: "MANUAL_REVIEW",
    metadata: { changeType: "REVIEW_REQUESTED" },
  });
  const policy = evaluateSignalPolicy(signal, detectSignalDrift(signal));
  assert.equal(policy.action, "REQUIRE_MANUAL_REVIEW");
  assert.equal(policy.manualReviewRequired, true);
  assert.equal(stateForPolicyAction("REVOKE", "VERIFIED"), "REVOKED");
  assert.equal(stateForPolicyAction("STEP_UP_VERIFICATION", "TRUSTED"), "CHALLENGED");
  assert.throws(
    () =>
      validateStateTransition({
        previousState: "TRUSTED",
        newState: "CHALLENGED",
        reasonCodes: [],
        triggeringSignals: [],
        policyId: "policy-1",
        actor: "",
        confidence: 0.8,
        timestamp: receivedAt,
        manualOverride: false,
      }),
    (error) => error.code === "TRANSITION_CONTEXT_REQUIRED",
  );
});
