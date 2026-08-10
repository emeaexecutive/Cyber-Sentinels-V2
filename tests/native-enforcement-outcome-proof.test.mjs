import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  correlateExecutionEvidence,
  deriveEnforcementActionDigest,
  deriveOutcomeHistoryReasons,
  evaluateEnforcementEligibility,
  executeAuthorizedAction,
  signDestinationObservation,
  verifyDestinationObservation,
} from "../lib/operational-entities/native-enforcement.ts";

const enterpriseId = "10000000-0000-4000-8000-000000000001";
const transactionId = "20000000-0000-4000-8000-000000000002";
const authorityId = "30000000-0000-4000-8000-000000000003";
const delegationId = "40000000-0000-4000-8000-000000000004";
const operationalEntityId = "agent-beta";
const evidenceKey = "test-only-controlled-destination-key-0000000000000000";
const now = "2026-08-09T12:00:00.000Z";

function action(overrides = {}) {
  return { type: "READ", target: "controlled-repository-a", environment: "test", consequence: "LOW", ...overrides };
}

function request(overrides = {}) {
  const selectedAction = overrides.action ?? action();
  return {
    requestId: randomUUID(), enterpriseId, transactionId, operationalEntityId, authorityId, delegationId,
    action: selectedAction,
    actionDigest: deriveEnforcementActionDigest({ enterpriseId, transactionId, operationalEntityId, action: selectedAction }),
    decisionDigest: "a".repeat(64), idempotencyKey: "beta-read-repository-a", requestedAt: now,
    ...overrides,
  };
}

function current(overrides = {}) {
  return { enterpriseId, operationalEntityId, authorityId, delegationId, authorityActive: true, delegationActive: true, identityVerified: true, ownerConfirmed: true, runtimeContinuity: "MATCH", ...overrides };
}

function observation(boundRequest, overrides = {}) {
  return signDestinationObservation({
    observationId: randomUUID(), enterpriseId: boundRequest.enterpriseId, transactionId: boundRequest.transactionId,
    operationalEntityId: boundRequest.operationalEntityId, destinationId: "controlled-repository-a",
    action: boundRequest.action.type, target: boundRequest.action.target, actionDigest: boundRequest.actionDigest,
    idempotencyKey: boundRequest.idempotencyKey, observedAt: now, expiresAt: "2026-08-09T12:05:00.000Z",
    result: "OBSERVED", destinationReference: `controlled-record:${randomUUID()}`,
    sourcePartyId: "cyber-sentinels", ...overrides,
  }, evidenceKey);
}

function acknowledgement(boundRequest, overrides = {}) {
  return {
    acknowledgementId: randomUUID(), enterpriseId: boundRequest.enterpriseId, transactionId: boundRequest.transactionId,
    requestId: boundRequest.requestId, operationalEntityId: boundRequest.operationalEntityId,
    actionDigest: boundRequest.actionDigest, target: boundRequest.action.target, idempotencyKey: boundRequest.idempotencyKey,
    status: "ACCEPTED", adapterReference: `adapter:${randomUUID()}`, acknowledgedAt: now,
    sourcePartyId: "cyber-sentinels", ...overrides,
  };
}

function claim(boundRequest, overrides = {}) {
  return {
    claimId: randomUUID(), enterpriseId: boundRequest.enterpriseId, transactionId: boundRequest.transactionId,
    operationalEntityId: boundRequest.operationalEntityId, actionDigest: boundRequest.actionDigest,
    target: boundRequest.action.target, idempotencyKey: boundRequest.idempotencyKey, result: "SUCCEEDED",
    claimedAt: now, sourcePartyId: "cyber-sentinels", ...overrides,
  };
}

function runtime(boundRequest, overrides = {}) {
  return {
    observationId: randomUUID(), enterpriseId: boundRequest.enterpriseId, transactionId: boundRequest.transactionId,
    operationalEntityId: boundRequest.operationalEntityId, actionDigest: boundRequest.actionDigest,
    target: boundRequest.action.target, idempotencyKey: boundRequest.idempotencyKey, result: "OBSERVED",
    observedAt: now, sourcePartyId: "cyber-sentinels", ...overrides,
  };
}

test("Beta READ is eligible only while identity, owner, authority, delegation and runtime remain current", () => {
  const selected = request();
  assert.deepEqual(evaluateEnforcementEligibility({ decision: "ALLOW", request: selected, current: current(), now }), {
    eligible: true, state: "ELIGIBLE", reasonCodes: ["ENFORCEMENT_ELIGIBLE"], algorithmVersion: "enforcement-eligibility-v1",
  });
  assert.equal(evaluateEnforcementEligibility({ decision: "ALLOW", request: selected, current: current({ authorityActive: false }), now }).reasonCodes.includes("ENFORCEMENT_CANCELLED_AUTHORITY_CHANGED"), true);
  assert.equal(evaluateEnforcementEligibility({ decision: "ALLOW", request: selected, current: current({ runtimeContinuity: "CHANGED" }), now }).reasonCodes.includes("ENFORCEMENT_CANCELLED_RUNTIME_CHANGED"), true);
});

test("DENY never invokes the adapter or creates an enforcement request", async () => {
  let calls = 0;
  const result = await executeAuthorizedAction({ enterpriseId, transactionId, operationalEntityId, authorityId, delegationId, action: action({ type: "WRITE_TEST_RECORD" }), decision: "DENY", decisionDigest: "a".repeat(64), idempotencyKey: "denied-write" }, {
    async loadCurrentState() { throw new Error("must not load"); }, async findByIdempotencyKey() { throw new Error("must not query"); }, async reserveRequest() { throw new Error("must not reserve"); },
    adapter: { async execute() { calls += 1; throw new Error("must not execute"); } }, now: () => now,
  });
  assert.equal(result.requested, false);
  assert.equal(result.request, null);
  assert.equal(calls, 0);
});

test("controlled destination observation confirms the allowed Beta READ", () => {
  const selected = request();
  const correlated = correlateExecutionEvidence({ decision: "ALLOW", request: selected, acknowledgement: acknowledgement(selected), executionClaim: claim(selected), runtimeObservation: runtime(selected), destinationObservations: [observation(selected)], observationEvidenceKey: evidenceKey, now });
  assert.equal(correlated.state, "CONFIRMED");
  assert.equal(correlated.outcome, "CONFIRMED");
  assert.equal(correlated.controlStatus, "EFFECTIVE");
  assert.equal(correlated.evidenceIndependence, "SAME_PARTY");
  assert.deepEqual(correlated.algorithmVersions, ["execution-correlation-v1", "outcome-confirmation-v1"]);
});

test("ALLOW and adapter acceptance without destination evidence remain unknown", () => {
  const selected = request();
  const correlated = correlateExecutionEvidence({ decision: "ALLOW", request: selected, acknowledgement: acknowledgement(selected), executionClaim: claim(selected), destinationObservations: [], now });
  assert.equal(correlated.state, "PARTIALLY_CONFIRMED");
  assert.equal(correlated.outcome, "UNKNOWN");
  assert.equal(correlated.reasonCodes.includes("EXECUTION_PARTIALLY_CONFIRMED"), true);
});

test("provider claim for repository A contradicted by repository B is preserved as a conflict", () => {
  const selected = request();
  const conflicting = observation(selected, { target: "controlled-repository-b" });
  const correlated = correlateExecutionEvidence({ decision: "ALLOW", request: selected, executionClaim: claim(selected), destinationObservations: [conflicting], observationEvidenceKey: evidenceKey, now });
  assert.equal(correlated.state, "CONTRADICTED");
  assert.equal(correlated.outcome, "UNKNOWN");
  assert.equal(correlated.contradictionCodes.includes("EXECUTION_EVIDENCE_CONFLICT"), true);
});

test("destination execution after DENY is a critical control failure", () => {
  const denied = request({ idempotencyKey: "deny-but-executed" });
  const correlated = correlateExecutionEvidence({ decision: "DENY", request: null, destinationObservations: [observation(denied)], observationEvidenceKey: evidenceKey, now });
  assert.equal(correlated.state, "CONTRADICTED");
  assert.equal(correlated.outcome, "CONTROL_FAILURE_CRITICAL");
  assert.equal(correlated.controlStatus, "CRITICAL_FAILURE");
  assert.equal(correlated.contradictionCodes.includes("EXECUTION_OCCURRED_AFTER_DENY"), true);
});

test("high-consequence actions require transaction, scope and time-bound non-transferable approval", () => {
  const selected = request({ action: action({ consequence: "HIGH" }) });
  assert.equal(evaluateEnforcementEligibility({ decision: "ALLOW", request: selected, current: current(), now }).state, "REVIEW_REQUIRED");
  const approval = { approvalId: randomUUID(), enterpriseId, transactionId, operationalEntityId, actionDigest: selected.actionDigest, approvedBy: randomUUID(), approvedAt: "2026-08-09T11:59:00.000Z", expiresAt: "2026-08-09T12:01:00.000Z", nonTransferable: true };
  assert.equal(evaluateEnforcementEligibility({ decision: "ALLOW", request: selected, current: current(), approval, now }).eligible, true);
  assert.equal(evaluateEnforcementEligibility({ decision: "ALLOW", request: selected, current: current(), approval: { ...approval, transactionId: randomUUID() }, now }).eligible, false);
});

test("tampered, expired, wrong-tenant, wrong-transaction and wrong-entity destination evidence fail closed", () => {
  const selected = request();
  const valid = observation(selected);
  assert.equal(verifyDestinationObservation({ observation: valid, evidenceKey, expectedEnterpriseId: enterpriseId, expectedTransactionId: transactionId, expectedEntityId: operationalEntityId, now }), true);
  for (const [changed, code] of [
    [{ ...valid, target: "controlled-repository-b" }, "DESTINATION_EVIDENCE_TAMPERED"],
    [{ ...valid, expiresAt: "2026-08-09T11:59:59.000Z" }, "DESTINATION_EVIDENCE_EXPIRED"],
    [{ ...valid, enterpriseId: randomUUID() }, "WRONG_TENANT"],
    [{ ...valid, transactionId: randomUUID() }, "WRONG_TRANSACTION"],
    [{ ...valid, operationalEntityId: "agent-alpha" }, "WRONG_ENTITY"],
  ]) assert.throws(() => verifyDestinationObservation({ observation: changed, evidenceKey, expectedEnterpriseId: enterpriseId, expectedTransactionId: transactionId, expectedEntityId: operationalEntityId, now }), (error) => error.code === code);
});

test("fake acknowledgement cannot establish execution", () => {
  const selected = request();
  const correlated = correlateExecutionEvidence({ decision: "ALLOW", request: selected, acknowledgement: acknowledgement(selected, { transactionId: randomUUID() }), destinationObservations: [], now });
  assert.equal(correlated.state, "CONTRADICTED");
  assert.equal(correlated.contradictionCodes.includes("FAKE_ACKNOWLEDGEMENT"), true);
});

test("matching identifiers outside the execution time window remain contradicted", () => {
  const selected = request();
  const late = observation(selected, { observedAt: "2026-08-09T12:20:00.000Z", expiresAt: "2026-08-09T12:25:00.000Z" });
  const correlated = correlateExecutionEvidence({ decision: "ALLOW", request: selected, destinationObservations: [late], observationEvidenceKey: evidenceKey, now: "2026-08-09T12:20:00.000Z" });
  assert.equal(correlated.state, "CONTRADICTED");
  assert.equal(correlated.outcome, "UNKNOWN");
  assert.equal(correlated.contradictionCodes.includes("EXECUTION_EVIDENCE_OUTSIDE_WINDOW"), true);
});

test("destination evidence without an adapter claim can independently confirm the exact action", () => {
  const selected = request();
  const correlated = correlateExecutionEvidence({ decision: "ALLOW", request: selected, destinationObservations: [observation(selected)], observationEvidenceKey: evidenceKey, now });
  assert.equal(correlated.state, "CONFIRMED");
  assert.equal(correlated.outcome, "CONFIRMED");
});

test("revoked delegation and unknown continuity block stale enforcement", () => {
  const selected = request();
  const revoked = evaluateEnforcementEligibility({ decision: "ALLOW", request: selected, current: current({ delegationActive: false }), now });
  assert.equal(revoked.eligible, false);
  assert.equal(revoked.reasonCodes.includes("DELEGATION_REVOKED"), true);
  const unknown = evaluateEnforcementEligibility({ decision: "ALLOW", request: selected, current: current({ runtimeContinuity: "UNKNOWN" }), now });
  assert.equal(unknown.state, "REVIEW_REQUIRED");
});

test("double submit, network retry and concurrent retry reserve one logical execution", async () => {
  const records = new Map();
  let executions = 0;
  const adapterResult = { status: "ACCEPTED", adapterReference: "controlled:a", acknowledgedAt: now, executionClaim: null, runtimeObservation: null, destinationObservation: null, reasonCodes: ["CONTROLLED_DESTINATION_ACCEPTED"] };
  const dependencies = {
    async loadCurrentState() { return current(); },
    async findByIdempotencyKey(_tenant, key) { return records.get(key)?.complete ?? null; },
    async reserveRequest(selected) {
      const prior = records.get(selected.idempotencyKey);
      if (prior) return { created: false, request: prior.request, result: prior.result };
      records.set(selected.idempotencyKey, { request: selected, result: adapterResult });
      return { created: true };
    },
    adapter: { async execute() { executions += 1; return adapterResult; } },
    now: () => now,
  };
  const input = { enterpriseId, transactionId, operationalEntityId, authorityId, delegationId, action: action(), decision: "ALLOW", decisionDigest: "a".repeat(64), idempotencyKey: "concurrent-beta-read" };
  const results = await Promise.all([executeAuthorizedAction(input, dependencies), executeAuthorizedAction(input, dependencies), executeAuthorizedAction(input, dependencies)]);
  assert.equal(executions, 1);
  assert.equal(new Set(results.map((item) => item.request.requestId)).size, 1);
});

test("action digest binds tenant, transaction, entity, action and destination", () => {
  const base = deriveEnforcementActionDigest({ enterpriseId, transactionId, operationalEntityId, action: action() });
  assert.notEqual(base, deriveEnforcementActionDigest({ enterpriseId, transactionId: randomUUID(), operationalEntityId, action: action() }));
  assert.notEqual(base, deriveEnforcementActionDigest({ enterpriseId, transactionId, operationalEntityId: "agent-alpha", action: action() }));
  assert.notEqual(base, deriveEnforcementActionDigest({ enterpriseId, transactionId, operationalEntityId, action: action({ target: "controlled-repository-b" }) }));
});

test("material outcome history derives loss, repetition and control recovery without routine-success memory", () => {
  assert.deepEqual(deriveOutcomeHistoryReasons({ transactionId, outcome: "CONFIRMED", history: [] }), []);
  assert.deepEqual(deriveOutcomeHistoryReasons({ transactionId, outcome: "UNKNOWN", history: [{ transactionId: randomUUID(), outcome: "UNKNOWN" }] }), ["REPEATED_ENFORCEMENT_FAILURE"]);
  assert.deepEqual(deriveOutcomeHistoryReasons({ transactionId, outcome: "UNKNOWN", history: [{ transactionId, outcome: "CONFIRMED" }] }), ["DESTINATION_EVIDENCE_LOST"]);
  assert.deepEqual(deriveOutcomeHistoryReasons({ transactionId, outcome: "CONFIRMED", history: [{ transactionId: randomUUID(), outcome: "CONTROL_FAILURE_CRITICAL" }] }), ["CONTROL_RECOVERY_CONFIRMED"]);
});
