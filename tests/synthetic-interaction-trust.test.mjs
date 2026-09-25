import assert from "node:assert/strict";
import test from "node:test";

import { composeSyntheticInteraction, SYNTHETIC_INTERACTION_ACTIONS, SYNTHETIC_INTERACTION_EVIDENCE_FACETS } from "../src/lib/synthetic-interaction-trust/workflow.ts";
import { executeCanonicalTrustTransaction } from "../src/lib/trust-transaction/canonical.ts";
import { evaluateDelegatedAction } from "../lib/operational-entities/delegated-authority.ts";

// Entirely synthetic fixtures. These tests do not call Judge.me or any provider,
// and their observations are never evidence of real provider qualification.
const at = "2026-09-24T10:00:00.000Z";
const issuedAt = "2026-09-24T09:00:00.000Z";
const expiresAt = "2026-09-25T10:00:00.000Z";
const tenantId = "10000000-0000-4000-8000-000000000001";
const operatorId = "10000000-0000-4000-8000-000000000002";
const subjectId = "10000000-0000-4000-8000-000000000003";
const entityId = "10000000-0000-4000-8000-000000000004";
const workflowId = "10000000-0000-4000-8000-000000000005";
const contractId = "10000000-0000-4000-8000-000000000006";

function request(overrides = {}) {
  return {
    actor: { type: "AI_AGENT", subjectId, operationalEntityId: entityId },
    action: "SUBMIT_REVIEW", purpose: "share_purchase_experience", target: "shop:synthetic/product:1",
    environment: "sandbox", contentDigest: "a".repeat(64), idempotencyKey: "synthetic-review-attempt-1",
    ...overrides,
  };
}

function context(overrides = {}) {
  return { requestedAt: at, purposeLineage: { observedPurpose: "share_purchase_experience", purposeEvidence: ["synthetic:purpose-observation"] }, ...overrides };
}

function observation(facet, claim = "synthetic_claim", overrides = {}) {
  return { facet, claim, sourceReference: "synthetic:application", evidenceReference: `synthetic:${facet}`, observedAt: issuedAt, provenance: "ASSERTED", ...overrides };
}

function harness(input, options = {}) {
  const calls = [];
  const records = [];
  const object = {
    enterpriseId: tenantId, ...input.trustObject, displayIdentity: "Synthetic governed actor",
    subject: { type: input.trustObject.subjectType, id: subjectId, displayName: "Synthetic governed actor" },
    identityState: "verified", authorityState: "verified", environmentState: "verified", scopeState: "verified",
    evidenceCompleteness: "complete", trustState: "verified", providerState: "available",
    activeContradictions: [], activeIncidents: [], activeReviews: [], correctiveActions: [],
    trustDnaReference: null, continuousTrustReference: null, policyId: "synthetic-policy",
    canonicalDigest: "stored", currentTrustState: "verified", trustDnaProfileReference: null,
    continuousTrustStateReference: null,
    contradictionSummary: { count: 0, highestState: null, references: [] },
    activeReviewSummary: { count: 0, required: false, references: [] },
    incidentSummary: { count: 0, highestState: null, references: [] },
    replayReference: null, trustMemoryReference: null, evidenceGraphNodeReference: { type: "node", id: "synthetic:subject" },
    lastEvaluatedAt: issuedAt, policyVersion: "1.0.0", correlationId: workflowId,
  };
  const authority = {
    contractId, enterpriseId: tenantId, subject: object.subject, workflow: { id: workflowId, objective: input.action.purpose },
    ...input.trustObject, workflowId, authorizedObjective: input.action.purpose,
    requiredIdentityState: "verified", requiredAuthority: [input.action.type, `external_effect:${input.managedControl.externalEffectBoundary.externalEffect}`],
    requiredEnvironmentState: "verified", permittedScope: [input.action.type],
    authorityScope: { permittedActions: [input.action.type], permittedTools: [input.action.type], permittedTargets: [input.action.resource], environments: [input.action.environment], dataBoundary: "INTERNAL", financialLimit: 0, executionLimit: 1 },
    permittedProviders: ["synthetic_identity"], requiredEvidenceTypes: ["IDENTITY_SESSION"],
    maximumEvidenceAgeSeconds: 3600, monitoringRequirements: ["runtime"], humanReviewThresholds: [],
    contradictionPolicy: "pause", incidentThreshold: "critical", expiresAt, revokedAt: null, revocationState: "active",
    issuer: "synthetic:issuer", approver: "synthetic:approver", policyId: "synthetic-policy", policyVersion: "1.0.0",
    authorityVersion: "synthetic:authority:v1", evidenceReferences: [{ type: "authority_grant", id: "synthetic:authority" }], issuedAt,
    ...options.authority,
  };
  const entity = {
    entityId, enterpriseId: tenantId,
    entityType: input.trustObject.subjectType === "machine_identity" ? "service" : input.trustObject.subjectType,
    displayReference: "Synthetic governed actor", canonicalTrustObjectId: subjectId, lifecycleState: "active",
    accountableOwnerId: operatorId, organizationReference: "synthetic:organization",
    providerReferences: ["synthetic_identity"], externalIdentityReferences: [], identityProfileReference: subjectId,
    currentAuthorityReferences: [contractId], environmentReferences: [input.action.environment], workflowReferences: [workflowId],
    currentTrustState: "verified", currentEvidenceState: "current", currentConsequenceClassification: "low",
    createdAt: issuedAt, updatedAt: at, suspendedAt: null, revokedAt: null, supersedesEntityVersionId: null,
    canonicalDigest: "e".repeat(64), ...options.entity,
  };
  const deps = {
    async authenticateActor() { calls.push("authenticateActor"); return { id: operatorId, type: "human", authority: "synthetic:operator-session" }; },
    async resolveTenantFromSession() { return { id: tenantId, name: "Synthetic tenant" }; },
    async findByIdempotency() { return options.previousReceipt ?? null; },
    async resolveOperationalEntity(tenant, resolution) {
      calls.push("resolveOperationalEntity");
      assert.equal(tenant, tenantId);
      assert.equal(resolution.requestedEntityId, entityId);
      assert.equal(resolution.trustObjectReference, subjectId);
      return entity;
    },
    async loadTrustObject() { return object; },
    async loadConfiguredEvidence() {
      return [{
        reference: "10000000-0000-4000-8000-000000000007", type: "IDENTITY_SESSION", providerId: "synthetic_identity",
        providerEventId: "synthetic:identity:event", providerSessionId: "synthetic:identity:session", outcome: "PASSED",
        observedAt: issuedAt, expiresAt, sourceDigest: "b".repeat(64), assuranceLevel: 0.9,
        correlationId: workflowId, serverVerified: true, sourceClassification: "identity_provider_asserted",
      }];
    },
    async loadAuthority() { if (options.missingAuthority) throw new Error("AUTHORITY_NOT_FOUND"); return authority; },
    async loadPolicy() { return { id: "synthetic-policy", version: "1.0.0", active: true, validFrom: issuedAt, validUntil: null, policyHash: "c".repeat(64), ...options.policy }; },
    async loadPreviousTransaction() { return null; },
    async persistDecision(record) { calls.push("persistDecision"); records.push(record); return { ...record, persistenceStatus: "CREATED" }; },
    async extendEvidenceGraph(record) { calls.push("extendEvidenceGraph"); assert.equal(record.digest, records[0].digest); return "synthetic:graph"; },
    async appendReplay(record) { calls.push("appendReplay"); assert.equal(record.digest, records[0].digest); return "synthetic:replay"; },
    async emitTrustMemory(record) { calls.push("emitTrustMemory"); assert.equal(record.digest, records[0].digest); return "synthetic:memory"; },
    async requestExternalExecution() { calls.push("requestExternalExecution"); return { configured: false, requestReference: null, acknowledgement: null, outcome: null }; },
    async recordExternalAcknowledgement() { throw new Error("No provider acknowledgement exists in this synthetic fixture"); },
    async recordExternalOutcome() { throw new Error("No provider outcome exists in this synthetic fixture"); },
  };
  return { deps, calls, records };
}

test("all twelve actions retain bounded effects and existing lowercase capabilities", () => {
  const effects = {
    SUBMIT_REVIEW: "ARTIFACT_PUBLICATION", EDIT_REVIEW: "DATA_WRITE", CREATE_ACCOUNT: "ACCOUNT_CREATION",
    POST_CONTENT: "ARTIFACT_PUBLICATION", MAKE_PURCHASE: "DATA_WRITE", ISSUE_REFUND: "DATA_WRITE",
    CHANGE_RATING: "DATA_WRITE", SEND_MESSAGE: "NETWORK_EXTERNAL_COMMUNICATION", REQUEST_PAYOUT: "DATA_WRITE",
    CREATE_LISTING: "ARTIFACT_PUBLICATION", APPROVE_TRANSACTION: "DATA_WRITE", EXECUTE_PROMOTION: "ARTIFACT_PUBLICATION",
  };
  assert.deepEqual(Object.keys(SYNTHETIC_INTERACTION_ACTIONS).sort(), Object.keys(effects).sort());
  for (const [action, effect] of Object.entries(effects)) {
    const input = composeSyntheticInteraction(request({ action }), context());
    assert.equal(input.action.type, action.toLowerCase());
    assert.equal(input.managedControl.externalEffectBoundary.externalEffect, effect);
    assert.equal(input.managedControl.externalEffectBoundary.target, input.action.resource);
  }
});

test("four evidence facets remain distinct observations, never execution authorization", () => {
  const input = composeSyntheticInteraction(request(), context({ observations: SYNTHETIC_INTERACTION_EVIDENCE_FACETS.map((facet) => observation(facet)) }));
  assert.deepEqual(input.managedControl.contextEvidence.slice(0, 4).map((item) => item.evidenceType), [...SYNTHETIC_INTERACTION_EVIDENCE_FACETS]);
  for (const evidence of input.managedControl.contextEvidence.slice(0, 4)) {
    assert.equal(evidence.outcome, "OBSERVED");
    assert.equal(evidence.metadata.serverVerified, false);
    assert.equal(evidence.metadata.authorizesInteraction, false);
  }
  assert.equal(input.managedControl.authorization, undefined);
});

test("AI-generated and risk observations alone can ALLOW under current canonical authority and policy", async () => {
  const input = composeSyntheticInteraction(request(), context({ observations: [observation("CONTENT_INTERACTION_RISK", "AI_GENERATED_HIGH_RISK")] }));
  const h = harness(input);
  const receipt = await executeCanonicalTrustTransaction(input, h.deps);
  assert.equal(receipt.decision, "ALLOW");
  assert.ok(!receipt.reasonCodes.includes("NEGATIVE_PROVIDER_EVIDENCE"));
  assert.equal(receipt.externalExecution.requested, false);
  assert.equal(receipt.externalExecution.outcome, "NOT_CONFIGURED");
  assert.ok(h.calls.includes("requestExternalExecution"));
  assert.equal(receipt.evidenceGraphReference, "synthetic:graph");
  assert.equal(receipt.replayReference, "synthetic:replay");
  assert.equal(receipt.trustMemoryReference, "synthetic:memory");
  for (const call of ["persistDecision", "extendEvidenceGraph", "appendReplay", "emitTrustMemory"]) assert.ok(h.calls.includes(call));
  const evidence = receipt.providerNeutralEvidence.find((item) => item.evidenceType === "CONTENT_INTERACTION_RISK");
  assert.ok(evidence);
  assert.equal(receipt.decisionOutcomeReview, null);
  assert.ok(!receipt.executionContinuity.some((stage) => ["ACTION_EXECUTED", "WORLD_STATE_CHANGED"].includes(stage.stage)));
});

for (const [actorType, subjectType, entityType] of [["HUMAN", "human", "human"], ["SERVICE", "machine_identity", "service"], ["AI_AGENT", "ai_agent", "ai_agent"]]) {
  test(`${actorType} uses the existing resolved entity and authenticated human operator`, async () => {
    const input = composeSyntheticInteraction(request({ actor: { type: actorType, subjectId, operationalEntityId: entityId } }), context());
    assert.equal(input.trustObject.subjectType, subjectType);
    const h = harness(input);
    const receipt = await executeCanonicalTrustTransaction(input, h.deps);
    assert.equal(receipt.decision, "ALLOW");
    assert.equal(receipt.entityType, entityType);
    assert.deepEqual(receipt.actor, { id: operatorId, type: "human" });
    assert.ok(h.calls.includes("resolveOperationalEntity"));
  });
}

test("missing authority fails despite verified identity and a purchase observation", async () => {
  const input = composeSyntheticInteraction(request(), context({ observations: [observation("TRANSACTION_VERIFIED", "PURCHASE_VERIFIED")] }));
  const h = harness(input, { missingAuthority: true });
  await assert.rejects(executeCanonicalTrustTransaction(input, h.deps), /AUTHORITY_NOT_FOUND/);
  assert.equal(h.records.length, 0);
  assert.ok(!h.calls.includes("requestExternalExecution"));
});

for (const [name, authorityChange, reason] of [
  ["revoked", { revocationState: "revoked", revokedAt: issuedAt }, "AUTHORITY_REVOKED"],
  ["action out of scope", { permittedScope: ["read"] }, "AUTHORITY_SCOPE_INVALID"],
  ["target out of scope", { authorityScope: { permittedActions: ["submit_review"], permittedTargets: ["shop:other"], environments: ["sandbox"] } }, "TARGET_OUT_OF_SCOPE"],
  ["external effect missing", { requiredAuthority: ["submit_review"] }, "EXTERNAL_EFFECT_UNAUTHORIZED"],
]) {
  test(`${name} authority DENYs despite verified identity, purchase and caller authority observations`, async () => {
    const input = composeSyntheticInteraction(request(), context({ authorization: { decision: "ALLOW", reasonCodes: ["SYNTHETIC_POLICY_ALLOW"] }, observations: [observation("TRANSACTION_VERIFIED", "PURCHASE_VERIFIED"), observation("AUTHORITY_VERIFIED", "CALLER_CLAIMS_AUTHORITY")] }));
    const h = harness(input, { authority: authorityChange });
    const receipt = await executeCanonicalTrustTransaction(input, h.deps);
    assert.equal(receipt.decision, "DENY");
    assert.ok(receipt.reasonCodes.includes(reason));
    assert.ok(!h.calls.includes("requestExternalExecution"));
    assert.equal(receipt.externalExecution.requested, false);
  });
}

for (const decision of ["DENY", "REVIEW"]) {
  test(`trusted explicit policy ${decision} survives composition and never executes`, async () => {
    const reason = `SYNTHETIC_EXPLICIT_POLICY_${decision}`;
    const input = composeSyntheticInteraction(request(), context({ authorization: { decision, reasonCodes: [reason] } }));
    const h = harness(input);
    const receipt = await executeCanonicalTrustTransaction(input, h.deps);
    assert.equal(receipt.decision, decision);
    assert.ok(receipt.reasonCodes.includes(reason));
    assert.ok(!h.calls.includes("requestExternalExecution"));
  });
}

test("declared but unobserved purpose remains REVIEW", async () => {
  const input = composeSyntheticInteraction(request(), context({ purposeLineage: undefined }));
  const h = harness(input);
  const receipt = await executeCanonicalTrustTransaction(input, h.deps);
  assert.equal(receipt.decision, "REVIEW");
  assert.ok(!h.calls.includes("requestExternalExecution"));
});

for (const action of ["MAKE_PURCHASE", "ISSUE_REFUND", "REQUEST_PAYOUT", "APPROVE_TRANSACTION", "EXECUTE_PROMOTION"]) {
  test(`${action} needs execution qualification even with an explicit policy ALLOW`, async () => {
    const input = composeSyntheticInteraction(request({ action }), context({ authorization: { decision: "ALLOW", reasonCodes: ["SYNTHETIC_POLICY_ALLOW"] } }));
    const h = harness(input);
    const receipt = await executeCanonicalTrustTransaction(input, h.deps);
    assert.equal(receipt.decision, "REVIEW");
    assert.ok(receipt.reasonCodes.includes("INTERACTION_EXECUTION_QUALIFICATION_REQUIRED"));
    assert.ok(!h.calls.includes("requestExternalExecution"));
  });
}

test("declared delegation requires its own matched evaluation even if general policy allows", async () => {
  const input = composeSyntheticInteraction(request({ delegationReference: "synthetic:delegation" }), context({ authorization: { decision: "ALLOW", reasonCodes: ["SYNTHETIC_POLICY_ALLOW"] } }));
  const h = harness(input);
  const receipt = await executeCanonicalTrustTransaction(input, h.deps);
  assert.equal(receipt.decision, "REVIEW");
  assert.ok(receipt.reasonCodes.includes("DELEGATION_EVALUATION_REQUIRED"));
  assert.ok(!h.calls.includes("requestExternalExecution"));
});

test("a delegation evaluation cannot authorize a different delegation reference", () => {
  assert.throws(() => composeSyntheticInteraction(request({ delegationReference: "synthetic:delegation" }), context({ delegation: { reference: "synthetic:other", authorization: { decision: "ALLOW", reasonCodes: ["DELEGATED_AUTHORITY_VALID"] } } })), /delegation/i);
});

function nativeDelegationEvaluation({ revoked = false, runtimeBinding = "RUNTIME_MATCH" } = {}) {
  const scope = { permittedActions: ["submit_review"], permittedTools: ["review.writer"], permittedTargets: [request().target], environments: ["sandbox"], dataBoundary: "INTERNAL", financialLimit: 0, executionLimit: 1 };
  const parentAuthority = { authorityId: "synthetic:parent", enterpriseId: tenantId, operationalEntityId: "synthetic:delegator", accountableOwnerId: operatorId, objective: request().purpose, scope, canDelegate: true, maximumDelegationDepth: 2, issuedAt, notBefore: issuedAt, expiresAt, revokedAt: null, policyVersion: "1.0.0", authorityVersion: "1.0.0", evidenceReferences: ["synthetic:parent-evidence"] };
  const delegation = { delegationId: "synthetic:delegation", enterpriseId: tenantId, delegatorOperationalEntityId: "synthetic:delegator", delegateOperationalEntityId: entityId, parentAuthorityId: parentAuthority.authorityId, parentDelegationId: null, objective: request().purpose, scope, canRedelegate: false, maximumDelegationDepth: 0, depth: 1, issuedAt, notBefore: issuedAt, expiresAt, revokedAt: revoked ? issuedAt : null, policyVersion: "1.0.0", authorityVersion: "1.0.0", status: revoked ? "REVOKED" : "ACTIVE", delegationDigest: "d".repeat(64), evidenceReferences: ["synthetic:delegation-evidence"] };
  // Synthetic stored acceptance; signature validation belongs to the existing
  // native issuance/acceptance tests. This exercises its action-time evaluator.
  const acceptance = { acceptanceId: "synthetic:acceptance", delegationDigest: delegation.delegationDigest, delegateOperationalEntityId: entityId, acceptedAt: issuedAt };
  const delegateIdentity = { operationalEntityId: entityId, enterpriseId: tenantId, status: "VERIFIED", ownerState: "CONFIRMED", accountableOwnerId: operatorId, runtimeBinding, evidenceReference: "synthetic:identity", expiresAt };
  return evaluateDelegatedAction({ parentAuthority, delegation, acceptance, delegateIdentity, action: { type: "submit_review", tool: "review.writer", target: request().target, environment: "sandbox", purpose: request().purpose, dataBoundary: "INTERNAL", workflowId }, now: at });
}

for (const [decision, options] of [["DENY", { revoked: true }], ["REVIEW", { runtimeBinding: "UNKNOWN" }]]) {
  test(`existing native delegation ${decision} is preserved by the canonical decision`, async () => {
    const evaluation = nativeDelegationEvaluation(options);
    assert.equal(evaluation.decision, decision);
    const input = composeSyntheticInteraction(request({ delegationReference: "synthetic:delegation" }), context({ authorization: { decision: "ALLOW", reasonCodes: ["SYNTHETIC_POLICY_ALLOW"] }, delegation: { reference: "synthetic:delegation", authorization: evaluation } }));
    const h = harness(input);
    const receipt = await executeCanonicalTrustTransaction(input, h.deps);
    assert.equal(receipt.decision, decision);
    for (const reason of evaluation.reasonCodes) assert.ok(receipt.reasonCodes.includes(reason));
    assert.ok(!h.calls.includes("requestExternalExecution"));
  });
}

test("native delegation ALLOW cannot revive revoked canonical authority", async () => {
  const evaluation = nativeDelegationEvaluation();
  assert.equal(evaluation.decision, "ALLOW");
  const input = composeSyntheticInteraction(request({ delegationReference: "synthetic:delegation" }), context({ delegation: { reference: "synthetic:delegation", authorization: evaluation } }));
  const h = harness(input, { authority: { revocationState: "revoked", revokedAt: issuedAt } });
  const receipt = await executeCanonicalTrustTransaction(input, h.deps);
  assert.equal(receipt.decision, "DENY");
  assert.ok(!h.calls.includes("requestExternalExecution"));
});

test("content, boundary, evidence and policy changes cannot replay a different canonical request", async () => {
  const input = composeSyntheticInteraction(request(), context());
  const receipt = await executeCanonicalTrustTransaction(input, harness(input).deps);
  const replayHarness = harness(input, { previousReceipt: receipt });
  const replay = await executeCanonicalTrustTransaction(input, replayHarness.deps);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replayHarness.records.length, 0);
  const mutations = [
    [request({ contentDigest: "f".repeat(64) }), context()],
    [request({ target: "shop:synthetic/product:2" }), context()],
    [request({ externalChannel: "channel:synthetic-api" }), context()],
    [request({ credentialReference: "credential:synthetic-api" }), context()],
    [request(), context({ observations: [observation("CONTENT_INTERACTION_RISK", "AI_GENERATED")] })],
    [request(), context({ authorization: { decision: "REVIEW", reasonCodes: ["SYNTHETIC_NEW_POLICY"] } })],
    [request(), context({ purposeLineage: { observedPurpose: "other_purpose" } })],
  ];
  for (const [changedRequest, changedContext] of mutations) {
    const changed = composeSyntheticInteraction(changedRequest, changedContext);
    assert.notEqual(changed.action.payloadDigest, input.action.payloadDigest);
    await assert.rejects(executeCanonicalTrustTransaction(changed, harness(changed, { previousReceipt: receipt }).deps), /idempotency key is already bound/);
  }
});

test("malformed, oversized, future-dated and authority-escalating evidence fails closed", () => {
  for (const changed of [
    request({ action: "DELETE_EVERYTHING" }), request({ actor: { type: "ADMIN", subjectId, operationalEntityId: entityId } }),
    request({ target: " " }), request({ target: "shop:one\nshop:two" }), request({ target: "x".repeat(301) }),
    request({ contentDigest: "not-a-digest" }), request({ idempotencyKey: "short" }), request({ purpose: "purpose with spaces" }),
  ]) assert.throws(() => composeSyntheticInteraction(changed, context()), TypeError);
  for (const changed of [
    context({ requestedAt: "invalid" }), context({ observations: Array.from({ length: 33 }, () => observation("CONTENT_INTERACTION_RISK")) }),
    context({ observations: [observation("EXECUTION_AUTHORIZED")] }),
    context({ observations: [observation("TRANSACTION_VERIFIED", "claim", { observedAt: expiresAt })] }),
    context({ observations: [observation("TRANSACTION_VERIFIED", "claim", { observedAt: [issuedAt] })] }),
    context({ observations: [observation("TRANSACTION_VERIFIED", "claim", { provenance: "PROVIDER_VERIFIED" })] }),
    context({ authorization: { decision: "ALLOW", reasonCodes: [] } }),
  ]) assert.throws(() => composeSyntheticInteraction(request(), changed), TypeError);
});

test("JSON arrays and coercible objects cannot bypass action restrictions or scalar validation", () => {
  for (const action of [["MAKE_PURCHASE"], { toString: () => "MAKE_PURCHASE" }, ["SUBMIT_REVIEW"]]) {
    assert.throws(() => composeSyntheticInteraction(request({ action }), context()), TypeError);
  }
  for (const type of [["AI_AGENT"], { toString: () => "AI_AGENT" }]) {
    assert.throws(() => composeSyntheticInteraction(request({ actor: { type, subjectId, operationalEntityId: entityId } }), context()), TypeError);
  }
  for (const changed of [request({ contentDigest: ["a".repeat(64)] }), request({ idempotencyKey: ["synthetic-review-1"] })]) {
    assert.throws(() => composeSyntheticInteraction(changed, context()), TypeError);
  }
  assert.throws(() => composeSyntheticInteraction(request(), context({ requestedAt: [at] })), TypeError);
});

test("evidence provenance and claim changes alter the canonical request digest", () => {
  const original = observation("TRANSACTION_VERIFIED", "PURCHASE_VERIFIED");
  const digest = (item) => composeSyntheticInteraction(request(), context({ observations: [item] })).action.payloadDigest;
  const initialDigest = digest(original);
  for (const changed of [
    { ...original, claim: "PURCHASE_UNCONFIRMED" },
    { ...original, provenance: "OBSERVED" },
    { ...original, evidenceReference: "synthetic:other-evidence" },
    { ...original, sourceReference: "synthetic:other-source" },
    { ...original, facet: "IDENTITY_VERIFIED" },
  ]) assert.notEqual(digest(changed), initialDigest);
});

test("inactive canonical policy fails closed despite trusted context ALLOW", async () => {
  const input = composeSyntheticInteraction(request(), context({ authorization: { decision: "ALLOW", reasonCodes: ["SYNTHETIC_POLICY_ALLOW"] } }));
  const h = harness(input, { policy: { active: false } });
  await assert.rejects(executeCanonicalTrustTransaction(input, h.deps), /POLICY_VERSION_INACTIVE/);
  assert.equal(h.records.length, 0);
  assert.ok(!h.calls.includes("requestExternalExecution"));
});
