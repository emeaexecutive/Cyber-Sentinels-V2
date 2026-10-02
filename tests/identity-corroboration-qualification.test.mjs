import assert from "node:assert/strict";
import test from "node:test";
import { validateEvidenceObject, evidenceObjectHash, evidencePayloadMatches } from "../src/lib/trust-architecture/evidence.ts";
import { safeGraphMetadata } from "../src/lib/trust-architecture/evidence-graph.ts";
import { TRUST_CANONICALIZATION, TRUST_HASH_ALGORITHM } from "../src/lib/trust-core/types.ts";
import { hashCanonical } from "../src/lib/trust-core/hash.ts";
import { EvidenceGraphBuilder, writeTrustMemoryGraphEdges } from "../lib/evidence-graph/evidence-graph.ts";
import { createTrustMemoryEvent, validateTrustMemoryIntegrity } from "../lib/trust-memory/trust-memory.ts";
import { appendProviderEvidence, classifyEvidenceIndependence, normalizeAgentCredentialEvidence } from "../lib/operational-entities/federated-evidence.ts";
import { normalizeProviderNeutralEvidence } from "../lib/providers/adapters.ts";
import { resolveClientEvidenceProvider, resolveClientEvidenceType } from "../lib/public-api/v1/client-evidence.ts";
import { executeCanonicalTrustTransaction, normalizeDecisionOutcomeReview } from "../src/lib/trust-transaction/canonical.ts";
import { composeOpenGraphRequest } from "../src/lib/opengraph/workflow.ts";
import { harness } from "./fixtures/opengraph-canonical.mjs";

const at = "2026-09-24T10:00:00.000Z";
const enterpriseId = "10000000-0000-4000-8000-000000000001";
const subjectId = "10000000-0000-4000-8000-000000000003";
const categories = ["DOCUMENT", "PROFESSIONAL", "DIGITAL", "NETWORK", "INTERVIEW", "AI_ASSISTANCE", "DEEPFAKE", "THREAT", "CONTRADICTION"];

function evidence(category, overrides = {}) {
  const payload = { category, sourceReference: `provider:fixture:${category}`, finding: "CONTEXT_REQUIRES_REVIEW" };
  return validateEvidenceObject({
    evidenceId: `20000000-0000-4000-8000-${String(categories.indexOf(category) + 1).padStart(12, "0")}`,
    enterpriseId, domainKey: "IDENTITY", subjectId, subjectType: "human",
    evidenceType: `IDENTITY_CORROBORATION:${category}`, sourceType: "provider_assertion", sourceKey: "provider:fixture",
    result: "INCONCLUSIVE", assuranceLevel: "NONE", cryptographicallyVerified: false, serverVerified: false,
    occurredAt: at, receivedAt: at, expiresAt: "2026-09-25T10:00:00.000Z", payloadHash: hashCanonical(payload),
    canonicalization: TRUST_CANONICALIZATION, hashAlgorithm: TRUST_HASH_ALGORITHM,
    references: [{ refType: "provider_event", refId: payload.sourceReference }], reasonCodes: [], ...overrides,
  });
}

function claim(category, overrides = {}) {
  const record = evidence(category);
  return {
    evidenceId: record.evidenceId, providerId: record.sourceKey, sourcePartyId: "party:fixture",
    sourceClassification: "provider_asserted", claim: "unknown", providerNativeEventId: `event:${category}`,
    normalizedEvidence: { evidenceType: record.evidenceType, category }, evidenceDigest: record.payloadHash,
    schemaVersion: "fixture:1", observedAt: at, supersedesEvidenceId: null, correctionOfEvidenceId: null, ...overrides,
  };
}

function memory(records, overrides = {}) {
  return createTrustMemoryEvent({
    id: "memory:corroboration", tenant_id: enterpriseId, actor_id: subjectId, actor_type: "human",
    workflow_id: "workflow:corroboration", event_kind: "identity_change",
    trust_state_before: "inconclusive", trust_state_after: "inconclusive", reason: "Contextual evidence retained for review.",
    evidence_refs: records.map((item) => `evidence:${item.evidenceId}`), replay_refs: ["replay:corroboration"],
    governance_refs: [], provider_refs: ["provider:fixture"], reviewed_outcome_ref: null,
    confidence_before: 0, confidence_after: 0, context: { purpose: "identity_corroboration" }, created_at: at, ...overrides,
  });
}

function canonicalInput() {
  // Reuse the existing non-network canonical fixture; this is not provider qualification.
  const input = composeOpenGraphRequest({
    subjectId, operationalEntityId: "10000000-0000-4000-8000-000000000004", purpose: "read_metadata",
    environment: "sandbox", targetUrl: "https://example.com/", tool: "opengraph.site", idempotencyKey: "corroboration:canonical",
  }, { requestedAt: at, purposeLineage: { observedPurpose: "read_metadata", purposeEvidence: ["fixture:purpose"] }, targetScope: { domains: ["example.com"], subdomains: [], urls: [], deniedDomains: [] } });
  input.managedControl.contextEvidence.push(...categories.map((category) => {
    const record = evidence(category);
    return { providerClass: "APPLICATION_SIGNAL", providerKey: record.sourceKey, evidenceType: record.evidenceType, observedAt: at, outcome: "PROVIDER_CLAIMS_VERIFIED", evidenceDigest: record.payloadHash, metadata: { category, sourceClassification: "provider_asserted" } };
  }));
  return input;
}

for (const category of categories) {
  test(`${category} corroboration retains attributed evidence, graph and memory without authority or verification`, () => {
    const record = evidence(category);
    const payload = { category, sourceReference: `provider:fixture:${category}`, finding: "CONTEXT_REQUIRES_REVIEW" };
    assert.equal(evidencePayloadMatches(record, payload), true);
    assert.equal(evidencePayloadMatches(record, { ...payload, finding: "CHANGED" }), false);
    assert.match(evidenceObjectHash(record), /^[a-f0-9]{64}$/);
    assert.equal(record.result, "INCONCLUSIVE");
    assert.equal(record.serverVerified, false);
    assert.equal(record.cryptographicallyVerified, false);
    assert.equal(record.enterpriseId, enterpriseId);
    assert.equal(record.references[0].refId, payload.sourceReference);

    const builder = new EvidenceGraphBuilder();
    builder.addNode({ id: subjectId, type: "human", label: "Synthetic subject", summary: "Corroboration subject", metadata: {} });
    builder.addNode({ id: record.evidenceId, type: "evidence", label: category, summary: "Unconfirmed contextual assertion", metadata: { category, evidenceType: record.evidenceType, sourceKey: record.sourceKey, payloadHash: record.payloadHash } });
    builder.addRelationship({ from: record.evidenceId, to: subjectId, type: "supports", timestamp: at, confidence: null, source: record.sourceKey, providerProvenance: payload.sourceReference, replayReference: "replay:corroboration", freshness: "unknown", contradiction: category === "CONTRADICTION" });
    const event = memory([record]);
    writeTrustMemoryGraphEdges(builder, [event]);
    const graph = builder.build();
    assert.equal(graph.nodes.find((node) => node.id === record.evidenceId).metadata.category, category);
    assert.equal(graph.relationships.find((edge) => edge.from === record.evidenceId).contradiction, category === "CONTRADICTION");
    assert.equal(graph.nodes.some((node) => node.type === "authorization" || node.type === "decision"), false);
    assert.equal(graph.relationships.some((edge) => edge.type === "authorizes"), false);
    assert.deepEqual(event.authority_refs, []);
    assert.deepEqual(event.evidence_refs, [`evidence:${record.evidenceId}`]);
    assert.equal(event.trust_delta, 0);
    assert.equal(validateTrustMemoryIntegrity([event], { tenantId: enterpriseId }).valid, true);
    assert.equal(validateTrustMemoryIntegrity([event], { tenantId: "different-tenant" }).valid, false);
    assert.equal(validateTrustMemoryIntegrity([event], { tenantId: enterpriseId, evidenceRefs: [] }).valid, false);
  });
}

test("same-party systems and multiple provider assertions do not establish independent corroboration", () => {
  const records = [claim("DOCUMENT", { providerId: "provider:document", claim: "success" }), claim("PROFESSIONAL", { providerId: "provider:professional", claim: "success" })];
  assert.equal(classifyEvidenceIndependence({ evidence: records, controlOperator: "party:operator", technologyProvider: "party:provider" }), "single_source");
  assert.equal(classifyEvidenceIndependence({ evidence: records, controlOperator: "party:fixture", technologyProvider: "party:fixture" }), "same_party_multi_system");
  const differentParties = [records[0], { ...records[1], sourcePartyId: "party:second" }];
  assert.equal(classifyEvidenceIndependence({ evidence: differentParties, controlOperator: "party:operator", technologyProvider: "party:provider" }), "multi_source");
});

test("unavailable or agent-reported corroboration remains insufficient and cannot manufacture signatures", () => {
  for (const sourceClassification of ["agent_asserted", "unconfirmed"]) {
    const records = categories.map((category) => claim(category, { sourceClassification, claim: "success" }));
    assert.equal(classifyEvidenceIndependence({ evidence: records, controlOperator: "party:operator", technologyProvider: "party:provider" }), "insufficient");
  }
  const unavailable = evidence("DOCUMENT", { result: "UNAVAILABLE" });
  assert.equal(unavailable.result, "UNAVAILABLE");
  assert.equal(classifyEvidenceIndependence({ evidence: categories.map((category) => claim(category)), controlOperator: "party:operator", technologyProvider: "party:provider" }), "insufficient");
  const normalized = normalizeProviderNeutralEvidence({ providerId: "runtime_security", evidenceType: unavailable.evidenceType, observedAt: at, outcome: "UNAVAILABLE", evidenceDigest: unavailable.payloadHash });
  assert.equal(normalized.outcome, "UNAVAILABLE");
  assert.equal(normalized.signingBoundary, "unsigned");
  assert.equal(normalized.identityContinuity, "review_required");
});

test("contradictions append evidence and review memory without replacing assertions or inventing a misconduct finding", () => {
  const original = claim("DOCUMENT", { claim: "success" });
  const originalDigest = hashCanonical(original);
  const contradiction = claim("CONTRADICTION", { claim: "failure", sourceClassification: "disputed", sourcePartyId: "party:reviewer", correctionOfEvidenceId: original.evidenceId });
  const history = appendProviderEvidence([original], contradiction);
  assert.equal(classifyEvidenceIndependence({ evidence: history, controlOperator: "party:operator", technologyProvider: "party:provider" }), "conflicting");
  assert.equal(history.length, 2);
  assert.equal(hashCanonical(history[0]), originalDigest);
  assert.equal(history[1].correctionOfEvidenceId, original.evidenceId);
  assert.equal(appendProviderEvidence(history, contradiction).length, 2);
  const event = memory(history, { event_kind: "provider_conflict", governance_refs: ["review:corroboration"], reason: "Attributed evidence conflicts; human review is required." });
  assert.equal(event.evidence_refs.length, 2);
  assert.deepEqual(event.governance_refs, ["review:corroboration"]);
  assert.deepEqual(event.authority_refs, []);
  assert.doesNotMatch(JSON.stringify({ history, event }), /fraud|misconduct|malicious/i);
});

test("corroboration graph metadata retains category and references while excluding sensitive raw fields", () => {
  assert.deepEqual(safeGraphMetadata({ category: "DOCUMENT", evidenceReference: "evidence:document", rawDocument: "fixture-document", email: "fixture@example.invalid", ipAddress: "192.0.2.1", biometric: "fixture-template", apiToken: "fixture-secret", providerPayload: { raw: true } }), { category: "DOCUMENT", evidenceReference: "evidence:document" });
});

for (const [scenario, options] of [["missing", { missingAuthority: true }], ["revoked", { authority: { revocationState: "revoked", revokedAt: "2026-09-24T09:30:00.000Z" } }]]) {
  test(`positive corroboration labels cannot replace ${scenario} canonical authority`, async () => {
    const input = canonicalInput();
    const h = harness(input, options);
    if (scenario === "missing") await assert.rejects(executeCanonicalTrustTransaction(input, h.deps), /AUTHORITY_NOT_FOUND/);
    else {
      const receipt = await executeCanonicalTrustTransaction(input, h.deps);
      assert.equal(receipt.decision, "DENY");
      assert.equal(receipt.externalExecution.requested, false);
      assert.equal(receipt.providerNeutralEvidence.filter((item) => item.evidenceType.startsWith("IDENTITY_CORROBORATION:")).length, categories.length);
    }
    assert.equal(h.calls.includes("requestExternalExecution"), false);
  });
}

test("a later corroboration conflict and review preserve the original canonical decision and frozen snapshot", async () => {
  const input = canonicalInput();
  const h = harness(input);
  const receipt = await executeCanonicalTrustTransaction(input, h.deps);
  assert.equal(receipt.decision, "ALLOW");
  assert.equal(receipt.externalExecution.outcome, "NOT_CONFIGURED");
  const original = hashCanonical(receipt);
  assert.equal(Object.isFrozen(receipt.decisionTimeSnapshot), true);
  assert.throws(() => { receipt.decisionTimeSnapshot.enforcementState.policyDecision = "DENY"; }, TypeError);
  const review = normalizeDecisionOutcomeReview({ decision: receipt.decision, policyVersion: receipt.policy.version, reasonCodes: receipt.reasonCodes, review: { evaluationStatus: "CONTRADICTED", providerOutcome: "Provider assertion disputed by later corroboration evidence.", runtimeOutcome: null, destinationOutcome: null, adjudicatedOutcome: null } });
  assert.equal(review.originalDecision, "ALLOW");
  assert.equal(review.evaluationStatus, "CONTRADICTED");
  assert.equal(review.adjudicatedOutcome, null);
  assert.equal(hashCanonical(receipt), original);
  assert.equal(h.records[0].decision, "ALLOW");
  assert.equal(receipt.replayReference, "synthetic:replay");
  assert.equal(receipt.trustMemoryReference, "synthetic:memory");
});

test("public-client corroboration remains an attributed assertion and cannot impersonate a verified provider", () => {
  for (const category of categories) {
    const type = resolveClientEvidenceType(`IDENTITY_CORROBORATION:${category}`);
    assert.equal(type.storedType, `AGENT_ASSERTED:IDENTITY_CORROBORATION:${category}`);
  }
  assert.deepEqual(resolveClientEvidenceProvider({ key: "self", class: "APPLICATION_SIGNAL" }, "fixture-client"), { providerKey: "api-client:fixture-client", providerClass: "APPLICATION_SIGNAL" });
  assert.throws(() => resolveClientEvidenceProvider({ key: "provider:identity", class: "IDENTITY_PROVIDER" }, "fixture-client"), (error) => error.code === "PROVIDER_AUTHENTICATION_REQUIRED");
  assert.throws(() => resolveClientEvidenceType("INDEPENDENT_CONFIRMATION"), (error) => error.code === "EVIDENCE_TYPE_RESERVED");
});

const agentCredential = (overrides = {}) => ({
  issuer: "did:web:issuer.example",
  credentialType: "VerifiableCredential,AgentIdentityCredential",
  credentialId: "urn:uuid:credential-1",
  agentId: "agent:alpha",
  principalId: "principal:owner",
  principalType: "organization",
  agentInstanceIdentity: "agent-instance:alpha:prod",
  relationship: "delegated_by",
  issuedAt: "2026-08-01T00:00:00.000Z",
  expiresAt: "2026-09-01T00:00:00.000Z",
  statusReference: "https://issuer.example/status/1",
  proof: "fixture-signature-not-for-persistence",
  ...overrides,
});

function verifyAgentCredential(assertion, changes = {}) {
  return normalizeAgentCredentialEvidence({
    assertion,
    expectedAgentId: "agent:alpha",
    expectedPrincipalId: "principal:owner",
    expectedPrincipalType: "organization",
    observedAt: "2026-08-08T10:00:00.000Z",
    isIssuerTrusted: () => true,
    verifyProof: () => true,
    resolveStatus: () => "ACTIVE",
    ...changes,
  });
}

test("verified agent credentials produce separate credential and principal-agent evidence without persisting proof", async () => {
  const result = await verifyAgentCredential(agentCredential());
  assert.equal(result.status, "VALID");
  assert.equal(result.credentialEvidence.normalizedEvidence.evidenceType, "AGENT_CREDENTIAL_EVIDENCE");
  assert.equal(result.principalAgentEvidence.normalizedEvidence.evidenceType, "PRINCIPAL_AGENT_ASSERTION");
  assert.equal(result.credentialEvidence.normalizedEvidence.cryptographicVerification, "VERIFIED");
  assert.equal(result.principalAgentEvidence.normalizedEvidence.relationship, "delegated_by");
  assert.notEqual(result.credentialEvidence.evidenceDigest, result.principalAgentEvidence.evidenceDigest);
  assert.equal(JSON.stringify(result).includes("fixture-signature-not-for-persistence"), false);
});

test("agent credential rejects bad proof, untrusted issuer, and principal or agent mismatch", async () => {
  await assert.rejects(verifyAgentCredential(agentCredential(), { verifyProof: () => false }), /AGENT_CREDENTIAL_SIGNATURE_INVALID/);
  await assert.rejects(verifyAgentCredential(agentCredential(), { isIssuerTrusted: () => false }), /AGENT_CREDENTIAL_ISSUER_UNTRUSTED/);
  await assert.rejects(verifyAgentCredential(agentCredential({ principalId: "principal:other" })), /AGENT_CREDENTIAL_PRINCIPAL_MISMATCH/);
  await assert.rejects(verifyAgentCredential(agentCredential({ agentId: "agent:other" })), /AGENT_CREDENTIAL_AGENT_MISMATCH/);
  await assert.rejects(verifyAgentCredential(agentCredential({ decision: "ALLOW" })), /AGENT_CREDENTIAL_FIELDS_INVALID/);
});

test("expired, revoked, and unknown credential status fail closed as evidence states", async () => {
  assert.equal((await verifyAgentCredential(agentCredential(), { observedAt: "2026-09-02T00:00:00.000Z" })).status, "EXPIRED");
  assert.equal((await verifyAgentCredential(agentCredential(), { resolveStatus: () => "REVOKED" })).status, "REVOKED");
  assert.equal((await verifyAgentCredential(agentCredential(), { resolveStatus: () => "UNKNOWN" })).status, "STATUS_UNAVAILABLE");
});

test("valid credential evidence cannot ALLOW without canonical authority", async () => {
  const evidence = await verifyAgentCredential(agentCredential());
  const input = canonicalInput();
  input.managedControl.contextEvidence.push({
    providerClass: "APPLICATION_SIGNAL", providerKey: evidence.credentialEvidence.providerId,
    evidenceType: "AGENT_CREDENTIAL_EVIDENCE", observedAt: evidence.credentialEvidence.observedAt,
    outcome: "VALID", evidenceDigest: evidence.credentialEvidence.evidenceDigest,
    metadata: { agentId: "agent:alpha", principalId: "principal:owner" },
  });
  const h = harness(input, { missingAuthority: true });
  await assert.rejects(executeCanonicalTrustTransaction(input, h.deps), /AUTHORITY_NOT_FOUND/);
  assert.equal(h.calls.includes("requestExternalExecution"), false);
});

test("valid credential evidence still passes through canonical action policy", async () => {
  const evidence = await verifyAgentCredential(agentCredential());
  const input = canonicalInput();
  input.managedControl.contextEvidence.push({
    providerClass: "APPLICATION_SIGNAL", providerKey: evidence.credentialEvidence.providerId,
    evidenceType: "AGENT_CREDENTIAL_EVIDENCE", observedAt: evidence.credentialEvidence.observedAt,
    outcome: "VALID", evidenceDigest: evidence.credentialEvidence.evidenceDigest,
    metadata: { agentId: "agent:alpha", principalId: "principal:owner" },
  });
  const h = harness(input, { policy: { active: false } });
  await assert.rejects(executeCanonicalTrustTransaction(input, h.deps), /POLICY_VERSION_INACTIVE/);
  assert.equal(h.calls.includes("requestExternalExecution"), false);
});
