import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes, sign } from "node:crypto";
import test from "node:test";

import {
  NATIVE_SIGNATURE_ALGORITHM,
  NATIVE_VERIFICATION_ALGORITHM_VERSION,
  NativeVerificationError,
  assertManifestClaims,
  challengeSigningPayload,
  createContinuityFingerprint,
  credentialFingerprint,
  deriveManifestDigest,
  issueNativeChallenge,
  manifestSigningPayload,
  verifyNativeEntity,
  verifySignedManifest,
} from "../lib/operational-entities/native-verification.ts";
import { classifyEvidenceIndependence } from "../lib/operational-entities/federated-evidence.ts";
import { executeCanonicalTrustTransaction } from "../src/lib/trust-transaction/canonical.ts";

const now = "2026-08-08T12:00:00.000Z";
const enterpriseId = "30000000-0000-4000-8000-000000000001";
const entityId = "entity:agent-alpha";
const subjectId = "30000000-0000-4000-8000-000000000002";
const actorId = "30000000-0000-4000-8000-000000000003";

function keyMaterial(signingKeyId = "key:alpha:v1") {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicJwk = publicKey.export({ format: "jwk" });
  publicJwk.kid = signingKeyId;
  publicJwk.alg = "EdDSA";
  publicJwk.use = "sig";
  publicJwk.key_ops = ["verify"];
  return { publicJwk, privateKey, signingKeyId };
}

function manifestClaims(key, overrides = {}) {
  const base = {
    manifestVersion: "1.0",
    operationalEntityId: entityId,
    entityType: "AI_AGENT",
    displayName: "Agent Alpha",
    enterpriseId,
    owner: { accountableOwnerId: "owner:alice", organizationId: "organization:acme" },
    software: {
      applicationId: "application:alpha",
      version: "1.2.3",
      buildDigest: "a".repeat(64),
      sourceDigest: "b".repeat(64),
      artifactDigest: "c".repeat(64),
      packageReference: "package:alpha@1.2.3",
    },
    ai: {
      modelProvider: "example-model-provider",
      modelIdentifier: "model:alpha",
      modelVersion: "2026-08",
      agentFramework: "framework:alpha",
      declaredTools: ["read_repository", "write_repository"],
    },
    runtime: {
      runtimeType: "container",
      environment: "staging",
      region: "eu-west",
      workloadIdentifier: "workload:alpha",
      deploymentIdentifier: "deployment:alpha:v1",
      runtimeVersion: "node-22",
    },
    authority: { authorityReference: "authority:alpha:v1" },
    credentials: { publicCredentialReferences: [key.signingKeyId] },
    declaredCapabilities: ["read_repository", "write_repository"],
    issuedAt: "2026-08-08T11:00:00.000Z",
    expiresAt: "2026-08-09T12:00:00.000Z",
    nonce: randomBytes(24).toString("base64url"),
    signingKeyId: key.signingKeyId,
  };
  return { ...base, ...overrides };
}

function signedManifest(key, overrides = {}) {
  const claims = manifestClaims(key, overrides);
  const manifestDigest = deriveManifestDigest(claims);
  const signature = sign(null, manifestSigningPayload(claims), key.privateKey).toString("base64url");
  return { ...claims, manifestDigest, signature };
}

function credential(key, overrides = {}) {
  return {
    credentialId: "30000000-0000-4000-8000-000000000010",
    enterpriseId,
    operationalEntityId: entityId,
    signingKeyId: key.signingKeyId,
    algorithm: NATIVE_SIGNATURE_ALGORITHM,
    publicJwk: key.publicJwk,
    credentialFingerprint: credentialFingerprint(key.publicJwk),
    state: "ACTIVE",
    validFrom: "2026-08-08T11:00:00.000Z",
    expiresAt: "2026-08-09T12:00:00.000Z",
    revokedAt: null,
    rotatedFromCredentialId: null,
    ...overrides,
  };
}

function verificationFixture(overrides = {}) {
  const key = overrides.key ?? keyMaterial();
  const manifest = overrides.manifest ?? signedManifest(key, overrides.manifestOverrides);
  const currentCredential = overrides.credential ?? credential(key);
  const challenge = overrides.challenge ?? issueNativeChallenge({
    enterpriseId,
    operationalEntityId: entityId,
    audience: "https://preview.cybersentinels.example/native-verification",
    manifestDigest: manifest.manifestDigest,
    signingKeyId: key.signingKeyId,
    now: "2026-08-08T11:58:00.000Z",
  });
  const proof = overrides.proof ?? {
    challengeId: challenge.challengeId,
    enterpriseId,
    operationalEntityId: entityId,
    nonce: challenge.nonce,
    audience: challenge.audience,
    manifestDigest: manifest.manifestDigest,
    signingKeyId: key.signingKeyId,
    signature: sign(null, challengeSigningPayload(challenge), key.privateKey).toString("base64url"),
    submittedAt: now,
  };
  const input = {
    expectedEnterpriseId: enterpriseId,
    expectedOperationalEntityId: entityId,
    expectedAudience: challenge.audience,
    entityLifecycleState: "active",
    manifest,
    priorManifest: null,
    credential: currentCredential,
    challenge,
    proof,
    ownerState: "CONFIRMED",
    runtimeObservation: {
      runtimeType: "container", environment: "staging", region: "eu-west", workloadIdentifier: "workload:alpha",
      deploymentIdentifier: "deployment:alpha:v1", runtimeVersion: "node-22", manifestDigest: manifest.manifestDigest,
      credentialFingerprint: currentCredential.credentialFingerprint, observedAt: now, source: "enterprise-runtime",
    },
    softwareObservation: { buildDigest: "a".repeat(64), artifactDigest: "c".repeat(64), sourceDigest: "b".repeat(64), observedAt: now, source: "enterprise-build" },
    previousContinuityFingerprint: null,
    now,
    ...overrides.input,
  };
  return { key, manifest, credential: currentCredential, challenge, proof, input };
}

function proofForChallenge(fixture, challenge, overrides = {}) {
  return {
    challengeId: challenge.challengeId,
    enterpriseId,
    operationalEntityId: entityId,
    nonce: challenge.nonce,
    audience: challenge.audience,
    manifestDigest: fixture.manifest.manifestDigest,
    signingKeyId: fixture.credential.signingKeyId,
    signature: sign(null, challengeSigningPayload(challenge), fixture.key.privateKey).toString("base64url"),
    submittedAt: now,
    ...overrides,
  };
}

test("valid Ed25519 proof establishes native identity evidence without claiming authority or safety", () => {
  const fixture = verificationFixture();
  const result = verifyNativeEntity(fixture.input);
  assert.equal(result.status, "VERIFIED");
  assert.equal(result.evidence?.provenance, "CYBER_SENTINELS_NATIVE");
  assert.equal(result.evidence?.evidenceType, "NATIVE_ENTITY_IDENTITY_PROOF");
  assert.equal(result.evidence?.verificationAlgorithmVersion, NATIVE_VERIFICATION_ALGORITHM_VERSION);
  assert.deepEqual(result.verifiedClaims, ["credential_possession", "manifest_binding", "entity_binding", "tenant_binding"]);
  assert.equal(result.verifiedClaims.includes("authorized"), false);
  assert.equal(result.verifiedClaims.includes("safe"), false);
});

test("invalid, malformed and wrong-key signatures fail closed", () => {
  const invalid = verificationFixture();
  assert.equal(verifyNativeEntity({ ...invalid.input, proof: { ...invalid.proof, signature: "A".repeat(86) } }).reasonCodes[0], "INVALID_SIGNATURE");
  assert.equal(verifyNativeEntity({ ...invalid.input, proof: { ...invalid.proof, signature: "not-base64" } }).reasonCodes[0], "INVALID_SIGNATURE");
  const other = keyMaterial("key:attacker");
  const wrongKeySignature = sign(null, challengeSigningPayload(invalid.challenge), other.privateKey).toString("base64url");
  assert.equal(verifyNativeEntity({ ...invalid.input, proof: { ...invalid.proof, signature: wrongKeySignature } }).reasonCodes[0], "INVALID_SIGNATURE");
});

test("tenant, entity and audience bindings cannot be substituted", () => {
  const fixture = verificationFixture();
  assert.equal(verifyNativeEntity({ ...fixture.input, expectedEnterpriseId: "tenant:other" }).reasonCodes[0], "WRONG_TENANT");
  assert.equal(verifyNativeEntity({ ...fixture.input, expectedOperationalEntityId: "entity:copied-id" }).reasonCodes[0], "WRONG_ENTITY");
  assert.equal(verifyNativeEntity({ ...fixture.input, expectedAudience: "https://attacker.example" }).reasonCodes[0], "WRONG_AUDIENCE");
  assert.equal(verifyNativeEntity({ ...fixture.input, credential: { ...fixture.credential, enterpriseId: "tenant:other" } }).reasonCodes[0], "WRONG_TENANT");
});

test("server time, challenge time and proof time are bounded against future-dating", () => {
  const fixture = verificationFixture();
  const futureChallenge = {
    ...fixture.challenge,
    issuedAt: "2026-08-08T12:02:00.000Z",
    expiresAt: "2026-08-08T12:07:00.000Z",
  };
  assert.equal(verifyNativeEntity({
    ...fixture.input,
    challenge: futureChallenge,
    proof: proofForChallenge(fixture, futureChallenge),
  }).reasonCodes[0], "CHALLENGE_NOT_YET_VALID");
  assert.equal(verifyNativeEntity({
    ...fixture.input,
    proof: { ...fixture.proof, submittedAt: "2026-08-08T12:02:00.000Z" },
  }).reasonCodes[0], "PROOF_TIMESTAMP_INVALID");
  assert.equal(verifyNativeEntity({
    ...fixture.input,
    proof: { ...fixture.proof, submittedAt: "not-a-timestamp" },
  }).reasonCodes[0], "PROOF_TIMESTAMP_INVALID");
  const futureManifest = signedManifest(fixture.key, { issuedAt: "2026-08-08T12:02:00.000Z" });
  assert.throws(
    () => verifySignedManifest(futureManifest, fixture.credential, now),
    (error) => error instanceof NativeVerificationError && error.code === "MANIFEST_NOT_YET_VALID",
  );
});

test("expired and replayed challenges fail and cannot yield evidence", () => {
  const fixture = verificationFixture();
  const expired = verifyNativeEntity({ ...fixture.input, now: "2026-08-08T12:10:00.000Z" });
  assert.equal(expired.status, "EXPIRED");
  assert.equal(expired.evidence, null);
  assert.equal(expired.reasonCodes[0], "EXPIRED_CHALLENGE");
  const replay = verifyNativeEntity({ ...fixture.input, challenge: { ...fixture.challenge, status: "VERIFIED" } });
  assert.equal(replay.reasonCodes[0], "CHALLENGE_REPLAY");
});

test("nonce and manifest tampering are detected", () => {
  const fixture = verificationFixture();
  assert.equal(verifyNativeEntity({ ...fixture.input, proof: { ...fixture.proof, nonce: randomBytes(32).toString("base64url") } }).reasonCodes[0], "NONCE_MISMATCH");
  const tampered = { ...fixture.manifest, displayName: "Attacker Agent" };
  assert.throws(() => verifySignedManifest(tampered, fixture.credential, now), (error) => error instanceof NativeVerificationError && error.code === "MANIFEST_TAMPERED");
  assert.equal(verifyNativeEntity({ ...fixture.input, manifest: tampered }).reasonCodes[0], "MANIFEST_TAMPERED");
});

test("revoked and expired credentials fail closed", () => {
  const fixture = verificationFixture();
  assert.equal(verifyNativeEntity({ ...fixture.input, credential: { ...fixture.credential, state: "REVOKED", revokedAt: now } }).reasonCodes[0], "REVOKED_CREDENTIAL");
  const expired = verifyNativeEntity({ ...fixture.input, credential: { ...fixture.credential, state: "EXPIRED", expiresAt: "2026-08-08T11:59:00.000Z" } });
  assert.equal(expired.status, "EXPIRED");
  assert.equal(expired.reasonCodes[0], "EXPIRED_CREDENTIAL");
  assert.equal(verifyNativeEntity({ ...fixture.input, credential: { ...fixture.credential, validFrom: "2026-08-08T12:02:00.000Z" } }).reasonCodes[0], "CREDENTIAL_NOT_YET_VALID");
});

test("revoked, superseded and expired manifests cannot answer outstanding challenges", () => {
  const fixture = verificationFixture();
  assert.equal(verifyNativeEntity({ ...fixture.input, manifestState: "REVOKED" }).reasonCodes[0], "MANIFEST_REVOKED");
  assert.equal(verifyNativeEntity({ ...fixture.input, manifestState: "SUPERSEDED" }).reasonCodes[0], "MANIFEST_SUPERSEDED");
  const expired = verifyNativeEntity({ ...fixture.input, manifestState: "EXPIRED" });
  assert.equal(expired.status, "EXPIRED");
  assert.equal(expired.reasonCodes[0], "MANIFEST_EXPIRED");
});

test("ownership, runtime and build claims remain separate from cryptographic identity", () => {
  const fixture = verificationFixture();
  const ownerRemoved = verifyNativeEntity({ ...fixture.input, ownerState: "REVOKED" });
  assert.equal(ownerRemoved.status, "PARTIALLY_VERIFIED");
  assert.ok(ownerRemoved.unverifiedClaims.includes("accountable_owner"));
  const runtimeChanged = verifyNativeEntity({ ...fixture.input, runtimeObservation: { ...fixture.input.runtimeObservation, environment: "production" } });
  assert.equal(runtimeChanged.status, "REVIEW_REQUIRED");
  assert.ok(runtimeChanged.changedAttributes.includes("RUNTIME_CHANGED") || runtimeChanged.conflictingClaims.includes("runtime_binding"));
  const buildChanged = verifyNativeEntity({ ...fixture.input, softwareObservation: { ...fixture.input.softwareObservation, buildDigest: "f".repeat(64) } });
  assert.equal(buildChanged.softwareProvenance, "MISMATCH");
  assert.equal(buildChanged.status, "REVIEW_REQUIRED");
});

test("continuity detects key, owner, model, runtime, authority and capability changes deterministically", () => {
  const first = verificationFixture();
  const initial = verifyNativeEntity(first.input);
  const key2 = keyMaterial("key:alpha:v2");
  const changedManifest = signedManifest(key2, {
    owner: { accountableOwnerId: "owner:bob", organizationId: "organization:acme" },
    ai: { ...first.manifest.ai, modelIdentifier: "model:beta" },
    runtime: { ...first.manifest.runtime, deploymentIdentifier: "deployment:alpha:v2" },
    authority: { authorityReference: "authority:alpha:v2" },
    declaredCapabilities: ["deploy", ...first.manifest.declaredCapabilities],
  });
  const second = verificationFixture({ key: key2, manifest: changedManifest, input: { priorManifest: first.manifest, previousContinuityFingerprint: initial.continuityFingerprint } });
  const changed = verifyNativeEntity(second.input);
  for (const expected of ["SIGNING_KEY_CHANGED", "OWNER_CHANGED", "MODEL_CHANGED", "RUNTIME_CHANGED", "AUTHORITY_CHANGED", "CAPABILITY_EXPANDED", "MANIFEST_CHANGED"]) {
    assert.ok(changed.changedAttributes.includes(expected), `${expected} must be detected`);
  }
  assert.equal(changed.continuityResult, "CONTINUITY_CHANGED");
  const repeat = verifyNativeEntity({ ...first.input, previousContinuityFingerprint: initial.continuityFingerprint, priorManifest: first.manifest });
  assert.equal(repeat.continuityResult, "CONTINUITY_PRESERVED");
  assert.equal(repeat.continuityFingerprint.fingerprint, initial.continuityFingerprint.fingerprint);
});

test("private, deprecated, unknown and oversized credential or manifest input is rejected", () => {
  const key = keyMaterial();
  assert.throws(() => credentialFingerprint({ ...key.publicJwk, d: "private-material" }), (error) => error.code === "PRIVATE_CREDENTIAL_PROHIBITED");
  assert.throws(() => credentialFingerprint({ kty: "RSA", n: "x", e: "AQAB" }), (error) => error.code === "UNSUPPORTED_ALGORITHM");
  assert.throws(() => credentialFingerprint({ ...key.publicJwk, alg: "none" }), (error) => error.code === "UNSUPPORTED_ALGORITHM");
  const manifest = signedManifest(key);
  assert.throws(() => verifySignedManifest(manifest, credential(key, { algorithm: "RSA" }), now), (error) => error.code === "UNSUPPORTED_ALGORITHM");
  assert.throws(() => verifySignedManifest(manifest, credential(key, { publicJwk: { ...key.publicJwk, kid: "key:another" } }), now), (error) => error.code === "UNKNOWN_SIGNING_KEY");
  const nonCanonical = signedManifest(key, { declaredCapabilities: ["write_repository", "read_repository", "read_repository"] });
  assert.throws(() => verifySignedManifest(nonCanonical, credential(key), now), (error) => error.code === "MANIFEST_CANONICAL_FORM_REQUIRED");
  const oversized = manifestClaims(key, { displayName: "x".repeat(70_000) });
  assert.throws(() => assertManifestClaims(oversized, now), (error) => error.code === "MANIFEST_TOO_LARGE");
});

test("capabilities remain declarations and cannot create authority", async () => {
  const fixture = verificationFixture({ manifestOverrides: { declaredCapabilities: ["deploy", "initiate_payment", "modify_identity"] } });
  const native = verifyNativeEntity(fixture.input);
  assert.equal(native.status, "VERIFIED");
  const receipt = await canonicalReceipt({ nativeEvidence: native.evidence, authorityRevoked: true });
  assert.equal(receipt.decision, "DENY");
  assert.ok(receipt.reasonCodes.some((code) => code.includes("REVOKED")));
});

function canonicalReceipt({ nativeEvidence, externalEvidence = null, authorityRevoked = false, consequence = "low", requestedAction = "read_repository", environmentState = "verified", eventLog = [] }) {
  const identityEvidence = nativeEvidence ? {
    reference: nativeEvidence.evidenceId,
    type: "NATIVE_ENTITY_IDENTITY_PROOF",
    providerId: "cyber_sentinels_native",
    providerEventId: nativeEvidence.challengeId,
    providerSessionId: nativeEvidence.challengeId,
    outcome: "PASSED",
    observedAt: nativeEvidence.verifiedAt,
    expiresAt: nativeEvidence.expiresAt,
    sourceDigest: nativeEvidence.evidenceDigest,
    assuranceLevel: 0.95,
    correlationId: "30000000-0000-4000-8000-000000000004",
    sourcePartyId: "cyber_sentinels",
    sourceClassification: "technology_provider_asserted",
    schemaVersion: NATIVE_VERIFICATION_ALGORITHM_VERSION,
  } : null;
  const evidence = [identityEvidence, externalEvidence].filter(Boolean);
  const trustObject = {
    enterpriseId, subjectType: "ai_agent", subjectId, displayIdentity: "Agent Alpha", subject: { type: "ai_agent", id: subjectId, displayName: "Agent Alpha" },
    identityState: "verified", authorityState: "verified", environmentState, scopeState: "verified", evidenceCompleteness: "complete", trustState: environmentState === "verified" ? "verified" : "degraded", providerState: "available",
    activeContradictions: [], activeIncidents: [], activeReviews: [], correctiveActions: [], trustDnaReference: null, continuousTrustReference: null, policyId: "policy:native",
    canonicalDigest: "d".repeat(64), currentTrustState: "verified", trustDnaProfileReference: null, continuousTrustStateReference: null,
    contradictionSummary: { count: 0, highestState: null, references: [] }, activeReviewSummary: { count: 0, required: false, references: [] }, incidentSummary: { count: 0, highestState: null, references: [] },
    replayReference: null, trustMemoryReference: null, evidenceGraphNodeReference: { type: "node", id: "node:alpha" }, lastEvaluatedAt: now, policyVersion: "1", correlationId: "30000000-0000-4000-8000-000000000005",
  };
  const authority = {
    contractId: "30000000-0000-4000-8000-000000000006", enterpriseId, subject: trustObject.subject, workflow: { id: "30000000-0000-4000-8000-000000000007", objective: requestedAction },
    subjectType: "ai_agent", subjectId, workflowId: "30000000-0000-4000-8000-000000000007", authorizedObjective: requestedAction, requiredIdentityState: "verified", requiredAuthority: [requestedAction], requiredEnvironmentState: "verified",
    permittedScope: [requestedAction], permittedProviders: ["cyber_sentinels_native", "external_provider"], requiredEvidenceTypes: ["NATIVE_ENTITY_IDENTITY_PROOF"], maximumEvidenceAgeSeconds: 3600,
    monitoringRequirements: [], humanReviewThresholds: [], contradictionPolicy: "pause", incidentThreshold: "critical", expiresAt: "2026-08-09T12:00:00.000Z",
    revokedAt: authorityRevoked ? "2026-08-08T11:59:00.000Z" : null, revocationState: authorityRevoked ? "revoked" : "active", issuer: "owner:alice", approver: "owner:alice", policyId: "policy:native", policyVersion: "1",
    evidenceReferences: [{ type: "authority_grant", id: "authority:native" }], issuedAt: "2026-08-08T11:00:00.000Z",
  };
  const entity = {
    entityId, enterpriseId, entityType: "ai_agent", displayReference: "Agent Alpha", canonicalTrustObjectId: subjectId, lifecycleState: "active", accountableOwnerId: "owner:alice", organizationReference: "organization:acme",
    providerReferences: [], externalIdentityReferences: [], identityProfileReference: subjectId, currentAuthorityReferences: [authority.contractId], environmentReferences: ["staging"], workflowReferences: ["read_repository"],
    currentTrustState: environmentState === "verified" ? "verified" : "degraded", currentEvidenceState: "current", currentConsequenceClassification: consequence, createdAt: now, updatedAt: now, suspendedAt: null, revokedAt: null, supersedesEntityVersionId: null, canonicalDigest: "e".repeat(64),
  };
  const deps = {
    async authenticateActor() { return { id: actorId, type: "human", authority: `session:${actorId}` }; },
    async resolveTenantFromSession() { return { id: enterpriseId, name: "Acme" }; },
    async findByIdempotency() { return null; }, async resolveOperationalEntity() { return entity; }, async loadTrustObject() { return trustObject; }, async loadConfiguredEvidence() { return evidence; }, async loadAuthority() { return authority; },
    async loadPolicy() { return { id: "policy:native", version: "1", active: true, validFrom: "2026-08-08T00:00:00.000Z", validUntil: null, policyHash: "f".repeat(64) }; }, async loadPreviousTransaction() { return null; },
    async persistDecision(record) { eventLog.push(["decision", record.decision]); return { ...record, persistenceStatus: "CREATED" }; }, async extendEvidenceGraph(record) { eventLog.push(["evidence_graph", record.transactionId]); return `graph:${record.transactionId}`; }, async appendReplay(record) { eventLog.push(["replay", record.decision]); return `replay:${record.transactionId}`; }, async emitTrustMemory(record) { eventLog.push(["trust_memory", record.trustState]); return `memory:${record.transactionId}`; },
    async requestExternalExecution() { return { configured: false, requestReference: null, acknowledgement: null, outcome: null }; }, async recordExternalAcknowledgement() { return null; }, async recordExternalOutcome() { return null; },
  };
  return executeCanonicalTrustTransaction({
    trustObject: { subjectType: "ai_agent", subjectId }, operationalEntityId: entityId,
    action: { type: requestedAction, purpose: requestedAction, resource: requestedAction === "initiate_payment" ? "payment:restricted:alpha" : "repository:alpha", environment: "staging", payloadDigest: "1".repeat(64) },
    idempotencyKey: `native-${authorityRevoked}-${Boolean(externalEvidence)}-${consequence}-${requestedAction}-${environmentState}`, requestedAt: now,
  }, deps);
}

test("provider-free canonical runtime ALLOWs with native identity, owner and authority evidence", async () => {
  const native = verifyNativeEntity(verificationFixture().input);
  const receipt = await canonicalReceipt({ nativeEvidence: native.evidence });
  assert.equal(receipt.decision, "ALLOW");
  assert.equal(receipt.evidence[0].providerId, "cyber_sentinels_native");
  assert.equal(receipt.evidence[0].type, "NATIVE_ENTITY_IDENTITY_PROOF");
});

test("Agent Alpha completes proof, attacks, drift, authority denial, rotation and canonical recovery", async () => {
  const events = [];
  const alpha = verificationFixture();
  const verified = verifyNativeEntity(alpha.input);
  assert.equal(verified.status, "VERIFIED");
  assert.ok(verified.evidence);

  const allowed = await canonicalReceipt({ nativeEvidence: verified.evidence, eventLog: events });
  assert.equal(allowed.decision, "ALLOW");
  assert.equal(allowed.action.type, "read_repository");
  assert.ok(allowed.replayReference);
  assert.ok(allowed.trustMemoryReference);

  const replayed = verifyNativeEntity({ ...alpha.input, challenge: { ...alpha.challenge, status: "VERIFIED" } });
  assert.equal(replayed.status, "FAILED");
  assert.equal(replayed.reasonCodes[0], "CHALLENGE_REPLAY");
  assert.equal(replayed.evidence, null);

  const attacker = keyMaterial("key:attacker:copied-alpha-id");
  const copiedIdProof = {
    ...alpha.proof,
    signature: sign(null, challengeSigningPayload(alpha.challenge), attacker.privateKey).toString("base64url"),
  };
  const copiedId = verifyNativeEntity({ ...alpha.input, proof: copiedIdProof });
  assert.equal(copiedId.reasonCodes[0], "INVALID_SIGNATURE");
  assert.equal(copiedId.evidence, null);

  const alteredManifest = { ...alpha.manifest, displayName: "Agent Alpha (altered)" };
  const tampered = verifyNativeEntity({ ...alpha.input, manifest: alteredManifest });
  assert.equal(tampered.reasonCodes[0], "MANIFEST_TAMPERED");
  assert.equal(tampered.evidence, null);

  const drift = verifyNativeEntity({
    ...alpha.input,
    priorManifest: alpha.manifest,
    previousContinuityFingerprint: verified.continuityFingerprint,
    runtimeObservation: { ...alpha.input.runtimeObservation, environment: "production" },
  });
  assert.equal(drift.status, "REVIEW_REQUIRED");
  assert.equal(drift.runtimeBinding, "RUNTIME_CHANGED");
  assert.ok(drift.changedAttributes.includes("RUNTIME_CHANGED"));

  const highConsequence = await canonicalReceipt({
    nativeEvidence: drift.evidence,
    consequence: "high",
    requestedAction: "initiate_payment",
    eventLog: events,
  });
  assert.equal(highConsequence.decision, "REVIEW");
  assert.ok(highConsequence.reasonCodes.includes("INDEPENDENT_EVIDENCE_REQUIRED_FOR_CONSEQUENCE"));

  const denied = await canonicalReceipt({ nativeEvidence: verified.evidence, authorityRevoked: true, eventLog: events });
  assert.equal(denied.decision, "DENY");
  assert.ok(denied.reasonCodes.some((reason) => reason.includes("REVOKED") || reason === "AUTHORITY_SCOPE_INVALID"));

  const rotatedKey = keyMaterial("key:alpha:v2");
  const rotatedManifest = signedManifest(rotatedKey, {
    authority: { authorityReference: "authority:alpha:v2" },
  });
  const rotatedCredential = credential(rotatedKey, {
    credentialId: "30000000-0000-4000-8000-000000000011",
    state: "PENDING",
    rotatedFromCredentialId: alpha.credential.credentialId,
  });
  const rotation = verificationFixture({
    key: rotatedKey,
    manifest: rotatedManifest,
    credential: rotatedCredential,
    input: { priorManifest: alpha.manifest, previousContinuityFingerprint: verified.continuityFingerprint },
  });
  const reverified = verifyNativeEntity(rotation.input);
  assert.equal(reverified.status, "VERIFIED");
  assert.ok(reverified.changedAttributes.includes("SIGNING_KEY_CHANGED"));
  assert.ok(reverified.changedAttributes.includes("AUTHORITY_CHANGED"));
  assert.notEqual(reverified.credentialFingerprint, verified.credentialFingerprint);

  const recovered = await canonicalReceipt({ nativeEvidence: reverified.evidence, eventLog: events });
  assert.equal(recovered.decision, "ALLOW");
  assert.equal(events.filter(([type]) => type === "replay").length, 4);
  assert.equal(events.filter(([type]) => type === "trust_memory").length, 4);
});

test("external evidence still works when native evidence is unavailable, and combined provenance is not self-independent", async () => {
  const external = {
    reference: "evidence:external", type: "NATIVE_ENTITY_IDENTITY_PROOF", providerId: "external_provider", providerEventId: "external:event", providerSessionId: "external:session", outcome: "PASSED",
    observedAt: now, expiresAt: "2026-08-09T12:00:00.000Z", sourceDigest: "9".repeat(64), assuranceLevel: 0.9, correlationId: "30000000-0000-4000-8000-000000000008",
    sourcePartyId: "external_party", sourceClassification: "identity_provider_asserted", schemaVersion: "external-v1",
  };
  const externalOnly = await canonicalReceipt({ nativeEvidence: null, externalEvidence: external });
  assert.equal(externalOnly.decision, "ALLOW");
  const native = verifyNativeEntity(verificationFixture().input);
  const independence = classifyEvidenceIndependence({
    evidence: [
      { evidenceId: native.evidence.evidenceId, providerId: "cyber_sentinels_native", sourcePartyId: "cyber_sentinels", sourceClassification: "technology_provider_asserted", claim: "success", providerNativeEventId: native.evidence.challengeId, normalizedEvidence: {}, evidenceDigest: native.evidence.evidenceDigest, schemaVersion: NATIVE_VERIFICATION_ALGORITHM_VERSION, observedAt: now, supersedesEvidenceId: null, correctionOfEvidenceId: null },
      { evidenceId: external.reference, providerId: external.providerId, sourcePartyId: external.sourcePartyId, sourceClassification: external.sourceClassification, claim: "success", providerNativeEventId: external.providerEventId, normalizedEvidence: {}, evidenceDigest: external.sourceDigest, schemaVersion: "external-v1", observedAt: now, supersedesEvidenceId: null, correctionOfEvidenceId: null },
    ],
    controlOperator: "enterprise_operator",
    technologyProvider: "cyber_sentinels",
  });
  assert.equal(independence, "multi_source");
  assert.notEqual(independence, "independently_confirmed");
});

test("continuity fingerprints are tenant scoped and reproducible", () => {
  const base = { enterpriseId, operationalEntityId: entityId, credentialFingerprint: "a".repeat(64), manifestDigest: "b".repeat(64), accountableOwnerId: "owner:alice", softwareDigest: "c".repeat(64), runtimeBinding: "RUNTIME_MATCH", runtimeDigest: "d".repeat(64), modelIdentifier: "model:alpha", capabilityDigest: "e".repeat(64), authorityReference: "authority:alpha" };
  assert.equal(createContinuityFingerprint(base).fingerprint, createContinuityFingerprint(base).fingerprint);
  assert.notEqual(createContinuityFingerprint(base).fingerprint, createContinuityFingerprint({ ...base, enterpriseId: "enterprise:other" }).fingerprint);
});

test("runtime observation metadata does not create false drift, while declared-tool expansion does", () => {
  const first = verificationFixture();
  const initial = verifyNativeEntity(first.input);
  const repeated = verifyNativeEntity({
    ...first.input,
    priorManifest: first.manifest,
    previousContinuityFingerprint: initial.continuityFingerprint,
    runtimeObservation: {
      ...first.input.runtimeObservation,
      observedAt: "2026-08-08T12:00:30.000Z",
      source: "second_enterprise_runtime_observer",
    },
  });
  assert.equal(repeated.continuityResult, "CONTINUITY_PRESERVED");
  assert.equal(repeated.changedAttributes.includes("RUNTIME_CHANGED"), false);

  const changedManifest = signedManifest(first.key, {
    ai: { ...first.manifest.ai, declaredTools: ["invoke_external_tool", ...first.manifest.ai.declaredTools] },
  });
  const changed = verificationFixture({
    key: first.key,
    manifest: changedManifest,
    credential: first.credential,
    input: { priorManifest: first.manifest, previousContinuityFingerprint: initial.continuityFingerprint },
  });
  assert.ok(verifyNativeEntity(changed.input).changedAttributes.includes("CAPABILITY_EXPANDED"));
});
