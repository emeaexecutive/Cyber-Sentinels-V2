import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import {
  acceptanceSigningPayload,
  calculateDelegationBlastRadius,
  delegatedScopeDigest,
  deriveAcceptanceDigest,
  deriveDelegationDigest,
  delegationSigningPayload,
  evaluateDelegatedAction,
  evaluateDelegationPolicy,
  validateDelegatedAuthoritySubset,
  verifyDelegationAcceptance,
  verifySignedDelegation,
} from "../lib/operational-entities/delegated-authority.ts";
import {
  challengeSigningPayload,
  credentialFingerprint,
  deriveManifestDigest,
  issueNativeChallenge,
  manifestSigningPayload,
  verifyNativeEntity,
} from "../lib/operational-entities/native-verification.ts";

const now = "2026-08-09T10:00:00.000Z";
const later = "2026-08-09T11:00:00.000Z";
const expiry = "2026-08-10T10:00:00.000Z";

function keyMaterial(kid) {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicJwk = { ...publicKey.export({ format: "jwk" }), kid, alg: "EdDSA", use: "sig", key_ops: ["verify"] };
  return { privateKey, publicJwk };
}

function credential(entityId, key, kid) {
  return {
    credentialId: `credential:${entityId}`,
    enterpriseId: "enterprise:acme",
    operationalEntityId: entityId,
    signingKeyId: kid,
    algorithm: "Ed25519",
    publicJwk: key.publicJwk,
    credentialFingerprint: credentialFingerprint(key.publicJwk),
    state: "ACTIVE",
    validFrom: "2026-08-09T09:00:00.000Z",
    expiresAt: "2026-08-11T10:00:00.000Z",
    revokedAt: null,
    rotatedFromCredentialId: null,
  };
}

const alphaKey = keyMaterial("key:alpha:v1");
const betaKey = keyMaterial("key:beta:v1");
const attackerKey = keyMaterial("key:attacker:v1");
const gammaKey = keyMaterial("key:gamma:v1");
const alphaCredential = credential("entity:alpha", alphaKey, "key:alpha:v1");
const betaCredential = credential("entity:beta", betaKey, "key:beta:v1");
const gammaCredential = credential("entity:gamma", gammaKey, "key:gamma:v1");

const parentScope = {
  permittedActions: ["read"],
  permittedTools: ["repository.reader"],
  permittedTargets: ["repository:a", "repository:b"],
  environments: ["production"],
  dataBoundary: "INTERNAL",
  financialLimit: 1000,
  executionLimit: 100,
};

const betaScope = {
  permittedActions: ["read"],
  permittedTools: ["repository.reader"],
  permittedTargets: ["repository:a"],
  environments: ["production"],
  dataBoundary: "INTERNAL",
  financialLimit: 0,
  executionLimit: 10,
};

function identity(entityId, keyCredential, overrides = {}) {
  return {
    operationalEntityId: entityId,
    enterpriseId: "enterprise:acme",
    status: "VERIFIED",
    ownerState: "CONFIRMED",
    accountableOwnerId: entityId === "entity:alpha" ? "owner:alice" : "owner:bob",
    runtimeBinding: "RUNTIME_MATCH",
    manifestDigest: entityId === "entity:alpha" ? "a".repeat(64) : "b".repeat(64),
    credentialFingerprint: keyCredential.credentialFingerprint,
    evidenceReference: `evidence:${entityId}`,
    expiresAt: expiry,
    ...overrides,
  };
}

function parent(overrides = {}) {
  return {
    authorityId: "authority:alpha:repo-read",
    enterpriseId: "enterprise:acme",
    operationalEntityId: "entity:alpha",
    accountableOwnerId: "owner:alice",
    objective: "evaluate_deployment_evidence",
    scope: parentScope,
    canDelegate: true,
    maximumDelegationDepth: 2,
    issuedAt: "2026-08-09T09:00:00.000Z",
    notBefore: "2026-08-09T09:00:00.000Z",
    expiresAt: "2026-08-11T10:00:00.000Z",
    revokedAt: null,
    policyVersion: "delegation-policy-v1",
    authorityVersion: "alpha-authority-v1",
    evidenceReferences: ["evidence:enterprise-approval"],
    ...overrides,
  };
}

function signedDelegation(overrides = {}, signingKey = alphaKey) {
  const base = {
    delegationId: "delegation:alpha-beta:repo-a-read",
    enterpriseId: "enterprise:acme",
    delegatorOperationalEntityId: "entity:alpha",
    delegateOperationalEntityId: "entity:beta",
    parentAuthorityId: "authority:alpha:repo-read",
    parentDelegationId: null,
    objective: "evaluate_deployment_evidence",
    scope: betaScope,
    canRedelegate: false,
    maximumDelegationDepth: 0,
    depth: 1,
    issuedAt: now,
    notBefore: now,
    expiresAt: expiry,
    revokedAt: null,
    policyVersion: "delegation-policy-v1",
    authorityVersion: "beta-authority-v1",
    nonce: "nonce-alpha-beta-delegation-0001",
    signingKeyId: "key:alpha:v1",
    delegationDigest: "",
    signature: "",
    status: "PENDING",
    evidenceReferences: ["evidence:entity:alpha", "evidence:entity:beta"],
    ...overrides,
  };
  base.delegationDigest = deriveDelegationDigest(base);
  base.signature = sign(null, delegationSigningPayload(base), signingKey.privateKey).toString("base64url");
  return base;
}

function signedAcceptance(delegation, overrides = {}, signingKey = betaKey) {
  const base = {
    acceptanceId: "acceptance:alpha-beta:repo-a-read",
    enterpriseId: delegation.enterpriseId,
    delegationId: delegation.delegationId,
    delegationDigest: delegation.delegationDigest,
    delegateOperationalEntityId: delegation.delegateOperationalEntityId,
    credentialFingerprint: betaCredential.credentialFingerprint,
    manifestDigest: "b".repeat(64),
    signingKeyId: "key:beta:v1",
    acceptedAt: later,
    nonce: "nonce-beta-acceptance-0001",
    signature: "",
    acceptanceDigest: "",
    ...overrides,
  };
  base.signature = sign(null, acceptanceSigningPayload(base), signingKey.privateKey).toString("base64url");
  base.acceptanceDigest = deriveAcceptanceDigest(base);
  return base;
}

function subsetFor(delegation, parentAuthority = parent()) {
  return validateDelegatedAuthoritySubset({
    parentScope: parentAuthority.scope,
    delegatedScope: delegation.scope,
    parentNotBefore: parentAuthority.notBefore,
    parentExpiresAt: parentAuthority.expiresAt,
    delegatedNotBefore: delegation.notBefore,
    delegatedExpiresAt: delegation.expiresAt,
    parentMaximumDelegationDepth: parentAuthority.maximumDelegationDepth,
    requestedDepth: delegation.depth,
  });
}

function activeScenario() {
  const delegation = signedDelegation({ status: "ACTIVE" });
  const acceptance = signedAcceptance(delegation);
  return { delegation, acceptance };
}

function action(overrides = {}) {
  return { type: "read", tool: "repository.reader", target: "repository:a", environment: "production", purpose: "evaluate_deployment_evidence", dataBoundary: "INTERNAL", executionCount: 1, workflowId: "workflow:delta", ...overrides };
}

test("Agent Beta independently proves possession of a distinct Ed25519 credential", () => {
  const manifestClaims = {
    manifestVersion: "1.0", operationalEntityId: "entity:beta", entityType: "AI_AGENT", displayName: "Agent Beta", enterpriseId: "enterprise:acme",
    owner: { accountableOwnerId: "owner:bob", organizationId: "org:acme" },
    software: { applicationId: "app:beta", version: "1.0.0", buildDigest: "c".repeat(64), sourceDigest: null, artifactDigest: null, packageReference: "pkg:beta" },
    ai: { modelProvider: "internal", modelIdentifier: "model:beta", modelVersion: "1", agentFramework: "native", declaredTools: ["repository.reader"] },
    runtime: { runtimeType: "container", environment: "production", region: "eu-west", workloadIdentifier: "workload:beta", deploymentIdentifier: "deployment:beta", runtimeVersion: "1" },
    authority: { authorityReference: null }, credentials: { publicCredentialReferences: ["key:beta:v1"] }, declaredCapabilities: ["read"],
    issuedAt: now, expiresAt: expiry, nonce: "native-beta-manifest-nonce-0001", signingKeyId: "key:beta:v1",
  };
  const manifest = { ...manifestClaims, manifestDigest: deriveManifestDigest(manifestClaims), signature: sign(null, manifestSigningPayload(manifestClaims), betaKey.privateKey).toString("base64url") };
  const challenge = issueNativeChallenge({ enterpriseId: "enterprise:acme", operationalEntityId: "entity:beta", audience: "https://preview.example/native-verification", manifestDigest: manifest.manifestDigest, signingKeyId: "key:beta:v1", now, ttlSeconds: 300 });
  const proofTime = "2026-08-09T10:01:00.000Z";
  const proof = { challengeId: challenge.challengeId, enterpriseId: challenge.enterpriseId, operationalEntityId: challenge.operationalEntityId, nonce: challenge.nonce, audience: challenge.audience, manifestDigest: challenge.manifestDigest, signingKeyId: challenge.signingKeyId, signature: sign(null, challengeSigningPayload(challenge), betaKey.privateKey).toString("base64url"), submittedAt: proofTime };
  const result = verifyNativeEntity({ expectedEnterpriseId: "enterprise:acme", expectedOperationalEntityId: "entity:beta", expectedAudience: challenge.audience, entityLifecycleState: "active", manifest, priorManifest: null, credential: betaCredential, challenge, proof, ownerState: "CONFIRMED", runtimeObservation: { ...manifest.runtime, manifestDigest: manifest.manifestDigest, credentialFingerprint: betaCredential.credentialFingerprint, observedAt: proofTime, source: "runtime:beta" }, softwareObservation: { buildDigest: "c".repeat(64), sourceDigest: null, artifactDigest: null, observedAt: proofTime, source: "build:beta" }, previousContinuityFingerprint: null, now: proofTime });
  assert.equal(result.status, "VERIFIED");
  assert.ok(result.evidence);
  assert.notEqual(betaCredential.credentialFingerprint, alphaCredential.credentialFingerprint);
});

test("signed Alpha delegation is verified and its requested authority is a strict subset", () => {
  const delegation = signedDelegation();
  assert.equal(verifySignedDelegation({ delegation, credential: alphaCredential, expectedEnterpriseId: "enterprise:acme", expectedDelegatorId: "entity:alpha", expectedDelegateId: "entity:beta", now: later }), true);
  assert.deepEqual(subsetFor(delegation).reasonCodes, ["DELEGATED_AUTHORITY_SUBSET_VALID"]);
  assert.notEqual(delegatedScopeDigest(parentScope), delegatedScopeDigest(betaScope));
});

test("enterprise policy activates only after verified Beta identity and confirmed ownership", () => {
  const delegation = signedDelegation();
  const result = evaluateDelegationPolicy({ parentAuthority: parent(), delegation, subsetValidation: subsetFor(delegation), delegatorIdentity: identity("entity:alpha", alphaCredential), delegateIdentity: identity("entity:beta", betaCredential), humanApprovalRequired: false, humanApprovalPresent: false, now: later });
  assert.equal(result.decision, "ACTIVATE");
});

test("human approval policy sends otherwise valid delegation to review", () => {
  const delegation = signedDelegation();
  assert.equal(evaluateDelegationPolicy({ parentAuthority: parent(), delegation, subsetValidation: subsetFor(delegation), delegatorIdentity: identity("entity:alpha", alphaCredential), delegateIdentity: identity("entity:beta", betaCredential), humanApprovalRequired: true, humanApprovalPresent: false, now: later }).decision, "REVIEW");
});

test("Beta cryptographically accepts the exact delegation with its own credential", () => {
  const delegation = signedDelegation();
  const acceptance = signedAcceptance(delegation);
  assert.equal(verifyDelegationAcceptance({ acceptance, delegation, credential: betaCredential, identity: identity("entity:beta", betaCredential), now: later }), true);
});

test("happy path permits Beta to read repository A through the canonical authority graph", () => {
  const { delegation, acceptance } = activeScenario();
  const result = evaluateDelegatedAction({ parentAuthority: parent(), delegation, acceptance, delegateIdentity: identity("entity:beta", betaCredential), action: action(), now: later });
  assert.equal(result.decision, "ALLOW");
  assert.equal(result.authorityGraph.valid, true);
  assert.equal(result.authorityLineage.length, 4);
  assert.equal(result.decisionSnapshot.decision, "ALLOW");
});

test("action escalation is denied without an execution authorization", () => {
  const { delegation, acceptance } = activeScenario();
  const result = evaluateDelegatedAction({ parentAuthority: parent(), delegation, acceptance, delegateIdentity: identity("entity:beta", betaCredential), action: action({ type: "write" }), now: later });
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("ACTION_OUT_OF_DELEGATED_SCOPE"));
});

test("target escalation is denied", () => {
  const { delegation, acceptance } = activeScenario();
  const result = evaluateDelegatedAction({ parentAuthority: parent(), delegation, acceptance, delegateIdentity: identity("entity:beta", betaCredential), action: action({ target: "repository:b" }), now: later });
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("TARGET_OUT_OF_DELEGATED_SCOPE"));
});

for (const [name, scopeChange] of [
  ["action", { permittedActions: ["read", "write"] }],
  ["target", { permittedTargets: ["repository:a", "repository:c"] }],
  ["tool", { permittedTools: ["repository.reader", "repository.writer"] }],
  ["environment", { environments: ["production", "unrestricted"] }],
  ["financial limit", { financialLimit: 1001 }],
]) {
  test(`${name} authority amplification is rejected deterministically`, () => {
    const delegation = signedDelegation({ scope: { ...betaScope, ...scopeChange } });
    const result = subsetFor(delegation);
    assert.equal(result.valid, false);
    assert.ok(result.reasonCodes.includes("AUTHORITY_AMPLIFICATION_ATTEMPT"));
  });
}

test("delegation cannot extend the parent expiry", () => {
  const delegation = signedDelegation({ expiresAt: "2026-08-12T10:00:00.000Z" });
  assert.equal(subsetFor(delegation).valid, false);
});

test("wrong delegator key and tampered signed delegation fail closed", () => {
  const wrongCredential = credential("entity:alpha", attackerKey, "key:attacker:v1");
  const delegation = signedDelegation();
  assert.throws(() => verifySignedDelegation({ delegation, credential: wrongCredential, expectedEnterpriseId: "enterprise:acme", expectedDelegatorId: "entity:alpha", expectedDelegateId: "entity:beta", now: later }), /credential is not active|signature is invalid/i);
  const tampered = { ...delegation, scope: { ...delegation.scope, permittedTargets: ["repository:b"] } };
  assert.throws(() => verifySignedDelegation({ delegation: tampered, credential: alphaCredential, expectedEnterpriseId: "enterprise:acme", expectedDelegatorId: "entity:alpha", expectedDelegateId: "entity:beta", now: later }), (error) => error.code === "DELEGATION_DIGEST_MISMATCH");
});

test("fake Beta and wrong delegate key cannot accept the delegation", () => {
  const delegation = signedDelegation();
  const fake = signedAcceptance(delegation, {}, attackerKey);
  assert.throws(() => verifyDelegationAcceptance({ acceptance: fake, delegation, credential: betaCredential, identity: identity("entity:beta", betaCredential), now: later }), (error) => error.code === "INVALID_SIGNATURE");
  const attackerCredential = credential("entity:attacker", attackerKey, "key:attacker:v1");
  assert.throws(() => verifyDelegationAcceptance({ acceptance: fake, delegation, credential: attackerCredential, identity: identity("entity:beta", betaCredential), now: later }), (error) => error.code === "WRONG_DELEGATE_KEY");
});

test("cross-tenant delegation and authority references fail closed", () => {
  const delegation = signedDelegation({ enterpriseId: "enterprise:other" });
  assert.throws(() => verifySignedDelegation({ delegation, credential: alphaCredential, expectedEnterpriseId: "enterprise:acme", expectedDelegatorId: "entity:alpha", expectedDelegateId: "entity:beta", now: later }), (error) => error.code === "WRONG_TENANT");
  const policy = evaluateDelegationPolicy({ parentAuthority: parent(), delegation, subsetValidation: subsetFor(delegation), delegatorIdentity: identity("entity:alpha", alphaCredential), delegateIdentity: identity("entity:beta", betaCredential), humanApprovalRequired: false, humanApprovalPresent: false, now: later });
  assert.equal(policy.decision, "REJECT");
  assert.ok(policy.reasonCodes.includes("WRONG_TENANT"));
});

test("delegation expiry removes authority without invalidating Beta identity", () => {
  const delegation = signedDelegation({ status: "EXPIRED", expiresAt: "2026-08-09T10:30:00.000Z" });
  const acceptance = signedAcceptance(delegation, { acceptedAt: "2026-08-09T10:15:00.000Z" });
  const beta = identity("entity:beta", betaCredential);
  const result = evaluateDelegatedAction({ parentAuthority: parent(), delegation, acceptance, delegateIdentity: beta, action: action(), now: later });
  assert.equal(beta.status, "VERIFIED");
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("DELEGATION_EXPIRED"));
});

test("delegation revocation leaves Alpha authority and Beta identity active", () => {
  const revokedAt = "2026-08-09T10:30:00.000Z";
  const delegation = signedDelegation({ status: "REVOKED", revokedAt });
  const result = evaluateDelegatedAction({ parentAuthority: parent(), delegation, acceptance: signedAcceptance(delegation), delegateIdentity: identity("entity:beta", betaCredential), action: action(), now: later });
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("DELEGATION_REVOKED"));
  assert.equal(parent().revokedAt, null);
});

test("parent revocation cascades to Beta authority without invalidating Beta identity", () => {
  const { delegation, acceptance } = activeScenario();
  const beta = identity("entity:beta", betaCredential);
  const result = evaluateDelegatedAction({ parentAuthority: parent({ revokedAt: "2026-08-09T10:30:00.000Z" }), delegation, acceptance, delegateIdentity: beta, action: action(), now: later });
  assert.equal(beta.status, "VERIFIED");
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("PARENT_AUTHORITY_REVOKED"));
});

test("expired parent authority rejects delegation", () => {
  const delegation = signedDelegation();
  const expiredParent = parent({ expiresAt: "2026-08-09T10:30:00.000Z" });
  const policy = evaluateDelegationPolicy({ parentAuthority: expiredParent, delegation, subsetValidation: subsetFor(delegation, expiredParent), delegatorIdentity: identity("entity:alpha", alphaCredential), delegateIdentity: identity("entity:beta", betaCredential), humanApprovalRequired: false, humanApprovalPresent: false, now: later });
  assert.equal(policy.decision, "REJECT");
  assert.ok(policy.reasonCodes.includes("PARENT_AUTHORITY_EXPIRED"));
});

test("redelegation is denied by default and bounded by parent depth", () => {
  const parentDelegation = signedDelegation({ delegationId: "delegation:parent", status: "ACTIVE", maximumDelegationDepth: 2, canRedelegate: false });
  const attempted = signedDelegation({ parentDelegationId: parentDelegation.delegationId, depth: 2, canRedelegate: false });
  const policy = evaluateDelegationPolicy({ parentAuthority: parent(), parentDelegation, delegation: attempted, subsetValidation: subsetFor(attempted), delegatorIdentity: identity("entity:alpha", alphaCredential), delegateIdentity: identity("entity:beta", betaCredential), humanApprovalRequired: false, humanApprovalPresent: false, now: later });
  assert.equal(policy.decision, "REJECT");
  assert.ok(policy.reasonCodes.includes("UNAUTHORIZED_REDELEGATION"));
});

test("explicitly permitted redelegation may only shrink and remains traceable", () => {
  const parentDelegation = signedDelegation({ status: "ACTIVE", maximumDelegationDepth: 2, canRedelegate: true });
  const child = signedDelegation({ delegationId: "delegation:beta-gamma:repo-a-read", delegatorOperationalEntityId: "entity:beta", delegateOperationalEntityId: "entity:gamma", parentDelegationId: parentDelegation.delegationId, depth: 2, maximumDelegationDepth: 2, signingKeyId: "key:beta:v1", scope: { ...betaScope, executionLimit: 5 } }, betaKey);
  assert.equal(verifySignedDelegation({ delegation: child, credential: betaCredential, expectedEnterpriseId: "enterprise:acme", expectedDelegatorId: "entity:beta", expectedDelegateId: "entity:gamma", now: later }), true);
  const subset = validateDelegatedAuthoritySubset({ parentScope: parentDelegation.scope, delegatedScope: child.scope, parentNotBefore: parentDelegation.notBefore, parentExpiresAt: parentDelegation.expiresAt, delegatedNotBefore: child.notBefore, delegatedExpiresAt: child.expiresAt, parentMaximumDelegationDepth: parentDelegation.maximumDelegationDepth, requestedDepth: child.depth });
  const policy = evaluateDelegationPolicy({ parentAuthority: parent(), parentDelegation, delegation: child, subsetValidation: subset, delegatorIdentity: identity("entity:beta", betaCredential), delegateIdentity: identity("entity:gamma", gammaCredential), humanApprovalRequired: false, humanApprovalPresent: false, lineageEntityIds: ["entity:alpha", "entity:beta"], now: later });
  assert.equal(policy.decision, "ACTIVATE");
});

test("maximum delegation depth is enforced", () => {
  const attempted = signedDelegation({ depth: 3 });
  const policy = evaluateDelegationPolicy({ parentAuthority: parent(), delegation: attempted, subsetValidation: subsetFor(attempted), delegatorIdentity: identity("entity:alpha", alphaCredential), delegateIdentity: identity("entity:beta", betaCredential), humanApprovalRequired: false, humanApprovalPresent: false, now: later });
  assert.ok(policy.reasonCodes.includes("MAX_DELEGATION_DEPTH_EXCEEDED"));
});

test("delegation cycles are rejected", () => {
  const attempted = signedDelegation({ delegateOperationalEntityId: "entity:alpha" });
  const policy = evaluateDelegationPolicy({ parentAuthority: parent(), delegation: attempted, subsetValidation: subsetFor(attempted), delegatorIdentity: identity("entity:alpha", alphaCredential), delegateIdentity: identity("entity:alpha", alphaCredential), humanApprovalRequired: false, humanApprovalPresent: false, lineageEntityIds: ["entity:alpha", "entity:beta"], now: later });
  assert.ok(policy.reasonCodes.includes("DELEGATION_CYCLE_DETECTED"));
});

test("runtime drift produces REVIEW while cryptographic identity remains verified", () => {
  const { delegation, acceptance } = activeScenario();
  const result = evaluateDelegatedAction({ parentAuthority: parent(), delegation, acceptance, delegateIdentity: identity("entity:beta", betaCredential, { runtimeBinding: "RUNTIME_CHANGED" }), action: action(), now: later });
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.reasonCodes.includes("RUNTIME_CONTINUITY_REVIEW_REQUIRED"));
});

test("blast radius follows explicit lineage and classifies direct and dependent effects", () => {
  const direct = signedDelegation({ status: "ACTIVE" });
  const child = signedDelegation({ delegationId: "delegation:beta-gamma", delegatorOperationalEntityId: "entity:beta", delegateOperationalEntityId: "entity:gamma", parentAuthorityId: direct.delegationId, parentDelegationId: direct.delegationId, depth: 2, canRedelegate: false, signingKeyId: "key:beta:v1" }, betaKey);
  const result = calculateDelegationBlastRadius({ rootAuthorityId: parent().authorityId, delegations: [direct, child], workflowReferences: { "entity:beta": ["workflow:delta"], "entity:gamma": ["workflow:epsilon"] }, pendingTransactionReferences: { "entity:beta": ["transaction:pending"] } });
  assert.deepEqual(result.directAffectedDelegations, [direct.delegationId]);
  assert.deepEqual(result.dependentDelegations, [child.delegationId]);
  assert.deepEqual(result.affectedWorkflows, ["workflow:delta", "workflow:epsilon"]);
});

test("decision snapshot preserves separate authority and responsibility lineage", () => {
  const { delegation, acceptance } = activeScenario();
  const result = evaluateDelegatedAction({ parentAuthority: parent(), delegation, acceptance, delegateIdentity: identity("entity:beta", betaCredential), action: action(), now: later });
  assert.equal(result.authorityLineage[2].issuer, "entity:alpha");
  assert.equal(result.authorityLineage[2].recipient, "entity:beta");
  assert.equal(result.decisionSnapshot.responsibilityLineage.alphaAccountableOwner, "owner:alice");
  assert.equal(result.decisionSnapshot.responsibilityLineage.betaAccountableOwner, "owner:bob");
});
