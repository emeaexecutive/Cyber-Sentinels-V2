import assert from "node:assert/strict";
import test from "node:test";
import { executeCanonicalTrustTransaction, normalizeDecisionOutcomeReview } from "../src/lib/trust-transaction/canonical.ts";
import { correlateExecutionEvidence, deriveEnforcementActionDigest, executeAuthorizedAction, signDestinationObservation, verifyDestinationObservation } from "../lib/operational-entities/native-enforcement.ts";
import { harness } from "./fixtures/opengraph-canonical.mjs";

// Behavioral composition of production functions, not a production adapter.
// Persistence hooks, current authority/delegation state, provider, and destination
// are local fixtures. No database, provider transport, or external effect is used.
const at = "2026-09-24T10:00:00.000Z";
const observedAt = "2026-09-24T10:00:01.000Z";
const now = "2026-09-24T10:00:02.000Z";
const tenantId = "10000000-0000-4000-8000-000000000001";
const subjectId = "10000000-0000-4000-8000-000000000003";
const entityId = "10000000-0000-4000-8000-000000000004";
const delegationId = "10000000-0000-4000-8000-000000000008";
// Deliberately public, test-only signing material; not a service credential.
const evidenceKey = "controlled-outcome-local-fixture-key-0001";

const cases = [
  { name: "ALLOW and confirmed success", key: "success", decision: "ALLOW", provider: "SUCCEEDED", destination: "OBSERVED", runtime: "OBSERVED", state: "CONFIRMED", outcome: "CONFIRMED", review: "SUPPORTED" },
  { name: "ALLOW and reported failure", key: "failure", decision: "ALLOW", provider: "FAILED", destination: "FAILED", runtime: "FAILED", state: "UNCONFIRMED", outcome: "UNKNOWN", review: "UNRESOLVED" },
  { name: "ALLOW with provider success contradicted by destination", key: "contradiction", decision: "ALLOW", provider: "SUCCEEDED", destination: "FAILED", runtime: "NOT_OBSERVED", state: "CONTRADICTED", outcome: "UNKNOWN", review: "CONTRADICTED" },
  { name: "ALLOW without execution", key: "not-configured", decision: "ALLOW", provider: null, destination: null, runtime: null, state: "UNCONFIRMED", outcome: "UNKNOWN", review: "UNRESOLVED" },
  { name: "DENY with execution observed anyway", key: "deny-observed", decision: "DENY", provider: null, destination: "OBSERVED", runtime: null, state: "CONTRADICTED", outcome: "CONTROL_FAILURE_CRITICAL", review: "CONTRADICTED" },
  { name: "REVIEW without execution", key: "review", decision: "REVIEW", provider: null, destination: null, runtime: null, state: "UNCONFIRMED", outcome: "UNKNOWN", review: "UNRESOLVED" },
];

function freezeTree(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeTree);
    Object.freeze(value);
  }
  return value;
}

function nativeInput(record) {
  return {
    enterpriseId: record.enterpriseId, transactionId: record.transactionId,
    operationalEntityId: record.operationalEntityId, authorityId: record.authorityReference,
    delegationId, decision: record.decision, decisionDigest: record.digest,
    idempotencyKey: record.idempotencyKey,
    action: { type: record.action.type, target: record.action.resource, environment: record.action.environment,
      payloadDigest: record.action.payloadDigest, consequence: "LOW" },
  };
}

function destinationEvidence(binding, result) {
  return signDestinationObservation({
    observationId: "10000000-0000-4000-8000-000000000009",
    enterpriseId: binding.enterpriseId, transactionId: binding.transactionId,
    operationalEntityId: binding.operationalEntityId,
    destinationId: "fixture:destination", action: binding.action.type, target: binding.action.target,
    actionDigest: deriveEnforcementActionDigest(binding), idempotencyKey: binding.idempotencyKey,
    observedAt, expiresAt: "2026-09-24T10:05:00.000Z", result,
    destinationReference: "fixture:destination-observation", sourcePartyId: "fixture:single-test-party",
  }, evidenceKey);
}

for (const scenario of cases) {
  test(`controlled outcome composition: ${scenario.name}`, async () => {
    const input = {
      trustObject: { subjectType: "ai_agent", subjectId }, operationalEntityId: entityId,
      action: { type: "READ_RECORD", purpose: "read_record", resource: "fixture:record:1", environment: "sandbox", payloadDigest: "a".repeat(64) },
      idempotencyKey: `controlled-outcome:${scenario.key}`, requestedAt: at,
      managedControl: {
        externalEffectBoundary: { target: "fixture:record:1", externalEffect: "DATA_READ" },
        // A purpose mismatch is evaluated by the real canonical engine into REVIEW.
        ...(scenario.decision === "REVIEW" ? { purposeLineage: {
          declaredPurpose: "read_record", observedPurpose: "export_records", purposeEvidence: ["fixture:purpose-drift"],
        } } : {}),
      },
    };
    const h = harness(input, scenario.decision === "DENY"
      ? { authority: { revocationState: "revoked", revokedAt: at } } : {});
    const chronology = [];
    const captured = {};
    let native = { requested: false, request: null, result: null };
    let adapterCalls = 0;
    let reservationCalls = 0;
    let dispatchHookCalls = 0;
    let currentStateCalls = 0;
    const loadAuthority = h.deps.loadAuthority;
    h.deps.loadAuthority = async (...args) => {
      chronology.push("authority");
      captured.authority = structuredClone(await loadAuthority(...args));
      return captured.authority;
    };
    h.deps.persistDecision = async (record) => {
      chronology.push("decision");
      captured.decision = structuredClone(record);
      h.records.push(freezeTree(record));
      return freezeTree({ ...record, persistenceStatus: "CREATED" });
    };
    for (const [hook, stage] of [["extendEvidenceGraph", "graph"], ["appendReplay", "replay"], ["emitTrustMemory", "memory"]]) {
      h.deps[hook] = async (record) => {
        chronology.push(stage);
        captured[stage] = structuredClone(record);
        return `fixture:${scenario.key}:${stage}`;
      };
    }
    const nativeDeps = {
      now: () => at,
      async findByIdempotencyKey() { return null; },
      async loadCurrentState(request) {
        currentStateCalls++;
        chronology.push("current-authority");
        return { enterpriseId: request.enterpriseId, operationalEntityId: request.operationalEntityId,
          authorityId: request.authorityId, delegationId: request.delegationId, authorityActive: true,
          delegationActive: true, identityVerified: true, ownerConfirmed: true, runtimeContinuity: "MATCH" };
      },
      async reserveRequest(request) {
        reservationCalls++;
        chronology.push("reservation");
        captured.request = structuredClone(request);
        return { created: true };
      },
      adapter: { async execute(request) {
        adapterCalls++;
        chronology.push("provider");
        const binding = { enterpriseId: request.enterpriseId, transactionId: request.transactionId,
          operationalEntityId: request.operationalEntityId, actionDigest: request.actionDigest,
          target: request.action.target, idempotencyKey: request.idempotencyKey, sourcePartyId: "fixture:single-test-party" };
        return {
          status: scenario.provider === "FAILED" ? "FAILED" : "ACCEPTED",
          adapterReference: "fixture:provider-response", acknowledgedAt: observedAt,
          executionClaim: { ...binding, claimId: "fixture:claim", result: scenario.provider, claimedAt: observedAt },
          runtimeObservation: { ...binding, observationId: "fixture:runtime", result: scenario.runtime, observedAt },
          destinationObservation: destinationEvidence(request, scenario.destination), reasonCodes: ["LOCAL_FIXTURE_ONLY"],
        };
      } },
    };
    h.deps.requestExternalExecution = async (record) => {
      dispatchHookCalls++;
      chronology.push("dispatch-hook");
      if (!scenario.provider) return { configured: false, requestReference: null, acknowledgement: null, outcome: null };
      // Explicit test composition: the generic relay and native execution paths
      // are separate server persistence paths; this wiring is not a live adapter.
      native = await executeAuthorizedAction(nativeInput(record), nativeDeps);
      return { configured: true, requestReference: native.request?.requestId ?? null,
        acknowledgement: { externalReference: "fixture:provider-ack", acknowledgedAt: observedAt },
        outcome: { state: native.result.executionClaim.result, externalReference: "fixture:provider-outcome", occurredAt: observedAt, reason: "Local provider assertion" } };
    };
    h.deps.recordExternalAcknowledgement = async (record, acknowledgement) => {
      chronology.push("acknowledgement-hook");
      captured.acknowledgement = { transactionId: record.transactionId, ...acknowledgement };
      return `fixture:${scenario.key}:acknowledgement`;
    };
    h.deps.recordExternalOutcome = async (record, outcome) => {
      chronology.push("outcome-hook");
      captured.providerOutcome = { transactionId: record.transactionId, ...outcome };
      return `fixture:${scenario.key}:provider-outcome`;
    };

    const receipt = await executeCanonicalTrustTransaction(input, h.deps);
    const originalReceipt = structuredClone(receipt);
    const record = h.records[0];
    assert.equal(receipt.decision, scenario.decision);
    assert.equal(receipt.authorityReference, captured.authority.contractId);
    assert.equal(receipt.authorityVersion, captured.authority.authorityVersion);
    assert.equal(receipt.enterpriseId, tenantId);
    if (scenario.decision === "REVIEW") assert.ok(receipt.reasonCodes.includes("PURPOSE_DRIFT"));
    if (scenario.decision !== "ALLOW") {
      // Independently exercise the native guard too: neither DENY nor REVIEW
      // may reserve or execute even when an adapter is supplied.
      native = await executeAuthorizedAction(nativeInput(record), nativeDeps);
      assert.equal(native.requested, false);
      assert.ok(native.eligibility.reasonCodes.includes(`DECISION_${scenario.decision}_NO_ENFORCEMENT`));
    }
    const expectedAttempts = scenario.provider ? 1 : 0;
    assert.equal(dispatchHookCalls, scenario.decision === "ALLOW" ? 1 : 0);
    assert.equal(currentStateCalls, expectedAttempts);
    assert.equal(reservationCalls, expectedAttempts);
    assert.equal(adapterCalls, expectedAttempts);
    assert.equal(receipt.externalExecution.requested, Boolean(scenario.provider));
    assert.equal(receipt.externalExecution.outcome, scenario.provider ?? (scenario.decision === "ALLOW" ? "NOT_CONFIGURED" : "NOT_REQUESTED"));
    if (native.request) {
      assert.equal(native.request.decisionDigest, receipt.digest);
      assert.equal(native.request.authorityId, receipt.authorityReference);
      assert.equal(native.request.transactionId, receipt.transactionId);
      assert.equal(receipt.externalExecution.requestReference, native.request.requestId);
      assert.equal(captured.providerOutcome.state, scenario.provider);
      assert.equal(captured.providerOutcome.transactionId, receipt.transactionId);
    } else {
      assert.equal(captured.providerOutcome, undefined);
      assert.equal(captured.acknowledgement, undefined);
      assert.equal(receipt.externalExecution.outcomeReference, null);
    }

    const bound = nativeInput(record);
    const destinations = native.result?.destinationObservation ? [native.result.destinationObservation]
      : scenario.decision === "DENY" ? [destinationEvidence(bound, "OBSERVED")] : [];
    for (const observation of destinations) assert.equal(verifyDestinationObservation({
      observation, evidenceKey, expectedEnterpriseId: receipt.enterpriseId,
      expectedTransactionId: receipt.transactionId, expectedEntityId: receipt.operationalEntityId, now,
    }), true);
    const acknowledgement = native.request ? {
      acknowledgementId: "fixture:native-ack", enterpriseId: tenantId, transactionId: receipt.transactionId,
      requestId: native.request.requestId, operationalEntityId: entityId, actionDigest: native.request.actionDigest,
      target: native.request.action.target, idempotencyKey: native.request.idempotencyKey,
      status: native.result.status, adapterReference: native.result.adapterReference,
      acknowledgedAt: native.result.acknowledgedAt, sourcePartyId: "fixture:single-test-party",
    } : null;
    const correlation = correlateExecutionEvidence({
      decision: receipt.decision, request: native.request, acknowledgement,
      executionClaim: native.result?.executionClaim, runtimeObservation: native.result?.runtimeObservation,
      destinationObservations: destinations, observationEvidenceKey: evidenceKey,
      decisionScope: { ...bound, decidedAt: receipt.timestamp }, now,
    });
    assert.equal(correlation.state, scenario.state);
    assert.equal(correlation.outcome, scenario.outcome);
    assert.match(correlation.correlationDigest, /^[a-f0-9]{64}$/);
    assert.notEqual(correlation.evidenceIndependence, "INDEPENDENT");
    const expectedContradictions = scenario.key === "contradiction" ? ["DESTINATION_OUTCOME_CONTRADICTS_EXECUTION"]
      : scenario.decision === "DENY" ? ["EXECUTION_OCCURRED_AFTER_DENY"] : [];
    assert.deepEqual(correlation.contradictionCodes, expectedContradictions);
    assert.equal(correlation.controlStatus, scenario.decision === "DENY" ? "CRITICAL_FAILURE" : scenario.key === "success" ? "EFFECTIVE" : "UNKNOWN");

    // This normalizer validates an additive review supplied by the test. It does
    // not derive adjudication, persist a review, or rewrite a canonical receipt.
    const review = normalizeDecisionOutcomeReview({ decision: receipt.decision,
      policyVersion: receipt.policy.version, reasonCodes: receipt.reasonCodes,
      review: { evaluationStatus: scenario.review, providerOutcome: scenario.provider,
        runtimeOutcome: scenario.runtime, destinationOutcome: scenario.destination, adjudicatedOutcome: null } });
    assert.equal(review.originalDecision, receipt.decision);
    assert.equal(review.providerOutcome, scenario.provider);
    assert.equal(review.destinationOutcome, scenario.destination);
    assert.equal(review.adjudicatedOutcome, null);
    assert.deepEqual(review.decisionReasonCodes, receipt.reasonCodes);
    assert.throws(() => normalizeDecisionOutcomeReview({ decision: receipt.decision,
      policyVersion: receipt.policy.version, reasonCodes: receipt.reasonCodes,
      review: { evaluationStatus: scenario.review, originalDecision: receipt.decision === "ALLOW" ? "DENY" : "ALLOW" },
    }), /immutable canonical decision/);

    assert.equal(receipt.materialChange, true);
    assert.deepEqual(chronology, ["authority", "decision", "graph", "replay", "memory",
      ...(scenario.provider ? ["dispatch-hook", "current-authority", "reservation", "provider", "acknowledgement-hook", "outcome-hook"]
        : scenario.decision === "ALLOW" ? ["dispatch-hook"] : [])]);
    for (const stage of ["graph", "replay", "memory"]) {
      const artifact = captured[stage];
      assert.equal(artifact.transactionId, receipt.transactionId);
      assert.equal(artifact.enterpriseId, receipt.enterpriseId);
      assert.equal(artifact.operationalEntityId, receipt.operationalEntityId);
      assert.equal(artifact.authorityReference, receipt.authorityReference);
      assert.equal(artifact.authorityVersion, receipt.authorityVersion);
      assert.deepEqual(artifact.action, input.action);
      assert.equal(artifact.digest, receipt.digest);
      assert.equal(artifact.decision, receipt.decision);
      assert.equal(artifact.policy.policyHash, receipt.policy.hash);
      // Initial decision artifacts precede the later execution observations.
      assert.equal(artifact.decisionOutcomeReview, null);
      assert.equal(artifact.executionContinuity.some((item) => item.stage === "ACTION_EXECUTED"), false);
    }
    assert.equal(receipt.replayReference, `fixture:${scenario.key}:replay`);
    assert.equal(receipt.trustMemoryReference, `fixture:${scenario.key}:memory`);
    assert.equal(receipt.executionContinuity.some((item) => item.stage === "ACTION_EXECUTED" && item.status === "observed"), false);
    assert.deepEqual(record, captured.decision);
    assert.deepEqual(receipt, originalReceipt);

    // Historical canonical replay returns the original receipt without renewing
    // authority, reservation, dispatch, or material-memory hooks.
    const beforeReplay = [...chronology];
    h.deps.findByIdempotency = async () => receipt;
    const replayed = await executeCanonicalTrustTransaction(input, h.deps);
    assert.deepEqual(replayed, { ...receipt, idempotentReplay: true });
    assert.deepEqual(chronology, beforeReplay);
    assert.equal(adapterCalls, expectedAttempts);
  });
}
