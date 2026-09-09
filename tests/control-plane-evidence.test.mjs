import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes, sign, webcrypto } from "node:crypto";
import test from "node:test";
import { credentialFingerprint, deriveManifestDigest, manifestSigningPayload } from "../lib/operational-entities/native-verification.ts";
import { CONTROL_PLANE_PROVENANCE, heartbeatSigningPayload, validateControlPlaneSnapshot, verifyControlPlaneHeartbeat, persistControlPlaneHeartbeat, eligibleControlPlaneEvidence } from "../lib/operational-entities/control-plane-evidence.ts";
import { signHeartbeat } from "../packages/cyber-sentinels-sdk/src/index.ts";

const now = Date.parse("2026-09-09T12:00:00.000Z");
const before = new Date(now - 60_000).toISOString(), after = new Date(now + 600_000).toISOString();
function fixture() {
  const context = { tenantId: "30000000-0000-4000-8000-000000000001", agentId: "agent:real", environment: "production", audience: "https://www.cybersentinels.com/api/v1", policyId: "external-agent-trust-v1", policyVersion: "0.2.0" };
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicJwk = publicKey.export({ format: "jwk" });
  const fingerprint = credentialFingerprint(publicJwk);
  const manifest = {
    manifestVersion: "1.0", operationalEntityId: context.agentId, entityType: "AI_AGENT", displayName: "Real agent", enterpriseId: context.tenantId,
    owner: { accountableOwnerId: "owner:real", organizationId: context.tenantId },
    software: { applicationId: null, version: null, buildDigest: null, sourceDigest: null, artifactDigest: null, packageReference: null },
    ai: { modelProvider: "test", modelIdentifier: "model:real", modelVersion: null, agentFramework: "node", declaredTools: [] },
    runtime: { runtimeType: "node", environment: "production", region: null, workloadIdentifier: null, deploymentIdentifier: null, runtimeVersion: null },
    authority: { authorityReference: null }, credentials: { publicCredentialReferences: ["key:real"] }, declaredCapabilities: ["read_repository"],
    issuedAt: before, expiresAt: after, nonce: randomBytes(24).toString("base64url"), signingKeyId: "key:real", manifestDigest: "", signature: "",
  };
  manifest.manifestDigest = deriveManifestDigest(manifest);
  manifest.signature = sign(null, manifestSigningPayload(manifest), privateKey).toString("base64url");
  const snapshot = {
    entity: { entity_id: context.agentId, accountable_owner_id: "owner:real", lifecycle_state: "active", environment_references: ["production"] },
    manifest: { manifest_id: "manifest:real", manifest_digest: manifest.manifestDigest, manifest, signing_key_id: "key:real", status: "ACTIVE", expires_at: after },
    credential: { credential_id: "credential:real", enterprise_id: context.tenantId, operational_entity_id: context.agentId, signing_key_id: "key:real", algorithm: "Ed25519", public_jwk: publicJwk, credential_fingerprint: fingerprint, state: "ACTIVE", valid_from: before, expires_at: after, revoked_at: null, rotated_from_credential_id: null },
    verification: { verification_id: "verification:real", status: "VERIFIED", manifest_id: "manifest:real", credential_id: "credential:real", manifest_digest: manifest.manifestDigest, credential_fingerprint: fingerprint, verified_at: before, expires_at: after },
    identityEvidence: { evidence_id: "identity:real", evidence_digest: "a".repeat(64), manifest_digest: manifest.manifestDigest, credential_fingerprint: fingerprint, verified_at: before, expires_at: after, revoked_at: null },
    authority: { contract_id: "authority:real", revocation_state: "active", issued_at: before, expires_at: after, contract: { policyId: context.policyId, policyVersion: context.policyVersion, authorityVersion: "v1", authorityScope: { environments: ["production"] } } },
    policy: { policy_id: context.policyId, version: context.policyVersion, active: true, valid_from: before, valid_until: after, policy_hash: "b".repeat(64) },
  };
  const heartbeat = { agent_id: context.agentId, credential_id: "credential:real", event_id: randomBytes(24).toString("base64url"), issued_at: new Date(now).toISOString(), environment: "production", authority_id: "authority:real", policy_id: context.policyId, policy_version: context.policyVersion, signature: "" };
  Object.assign(snapshot.verification, { verified_claims: ["credential_possession", "manifest_binding", "entity_binding", "tenant_binding"], unverified_claims: [], conflicting_claims: [], reason_codes: ["OWNER_BINDING_CONFIRMED"] });
  snapshot.identityEvidence.verification_id = snapshot.verification.verification_id;
  snapshot.identityEvidence.signing_key_id = snapshot.credential.signing_key_id;
  snapshot.authority.contract.contractId = snapshot.authority.contract_id;
  snapshot.authority.contract.subject = { type: "ai_agent", id: context.agentId };
  const resign = () => { heartbeat.signature = sign(null, heartbeatSigningPayload(heartbeat, context), privateKey).toString("base64url"); };
  resign();
  return { context, snapshot, heartbeat, privateKey, resign };
}
test("real external Ed25519 heartbeat produces bound, first-party configuration and monitoring", () => {
  const f = fixture();
  const rows = verifyControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, now);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(row => row.evidence_type), ["SERVER_VERIFIED_AGENT_CONFIGURATION", "SERVER_VERIFIED_MONITORING_HEARTBEAT"]);
  for (const row of rows) {
    assert.equal(row.source_type, CONTROL_PLANE_PROVENANCE);
    assert.equal(row.cryptographically_verified, true);
    assert.equal(row.normalized_facts.monitoring.downstreamExecutionObserved, false);
    assert.equal(row.normalized_facts.independence, "FIRST_PARTY_CONTROL_PLANE");
    assert.equal(row.expires_at, new Date(now + 300_000).toISOString());
  }
});
for (const [name, mutate] of Object.entries({
  "wrong tenant": f => { f.context.tenantId = "other"; },
  "wrong agent": f => { f.heartbeat.agent_id = "agent:other"; },
  "wrong credential": f => { f.heartbeat.credential_id = "credential:other"; },
  "wrong authority": f => { f.heartbeat.authority_id = "authority:other"; },
  "wrong policy": f => { f.heartbeat.policy_version = "other"; },
  "wrong environment": f => { f.heartbeat.environment = "staging"; },
  "wrong audience": f => { f.context.audience = "https://attacker.example/api/v1"; },
  "forged signature": f => { f.heartbeat.signature = "A".repeat(86); },
  "missing baseline": f => { f.snapshot.identityEvidence = null; },
  "inactive agent": f => { f.snapshot.entity.lifecycle_state = "suspended"; },
  "revoked credential": f => { f.snapshot.credential.revoked_at = before; },
  "rotated credential": f => { f.snapshot.credential.credential_id = "credential:new"; },
  "expired credential": f => { f.snapshot.credential.expires_at = before; },
  "future credential": f => { f.snapshot.credential.valid_from = after; },
  "expired manifest": f => { f.snapshot.manifest.expires_at = before; },
  "tampered manifest": f => { f.snapshot.manifest.manifest.runtime.runtimeType = "evil"; },
  "wrong manifest digest": f => { f.snapshot.verification.manifest_digest = "c".repeat(64); },
  "wrong fingerprint": f => { f.snapshot.credential.credential_fingerprint = "d".repeat(64); },
  "changed accountable owner": f => { f.snapshot.entity.accountable_owner_id = "owner:other"; },
  "identity key linkage": f => { f.snapshot.identityEvidence.signing_key_id = "key:other"; },
  "authority subject linkage": f => { f.snapshot.authority.contract.subject.id = "agent:other"; },
  "partial identity verification": f => { f.snapshot.verification.status = "PARTIALLY_VERIFIED"; f.snapshot.verification.verified_claims = ["credential_possession"]; },
  "owner unconfirmed": f => { f.snapshot.verification.unverified_claims = ["accountable_owner"]; },
  "conflicting runtime": f => { f.snapshot.verification.conflicting_claims = ["runtime_binding"]; },
  "identity from older verification": f => { f.snapshot.identityEvidence.verification_id = "old"; },
  "expired verification": f => { f.snapshot.verification.expires_at = before; },
  "future verification": f => { f.snapshot.verification.verified_at = after; },
  "revoked identity": f => { f.snapshot.identityEvidence.revoked_at = before; },
  "expired identity": f => { f.snapshot.identityEvidence.expires_at = before; },
  "revoked authority": f => { f.snapshot.authority.revocation_state = "revoked"; },
  "expired authority": f => { f.snapshot.authority.expires_at = before; },
  "inactive policy": f => { f.snapshot.policy.active = false; },
  "expired policy": f => { f.snapshot.policy.valid_until = before; },
  "future policy": f => { f.snapshot.policy.valid_from = after; },
  "caller supplied tenant": f => { f.heartbeat.tenant_id = f.context.tenantId; },
  "caller supplied result": f => { f.heartbeat.server_verified = true; },
  "invalid nonce": f => { f.heartbeat.event_id = "short"; },
})) test(`fails closed: ${name}`, () => {
  const f = fixture(); mutate(f);
  assert.throws(() => verifyControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, now));
});
for (const [offset, accepted] of [[-120000, true], [-120001, false], [30000, true], [30001, false]]) {
  test(`signed heartbeat freshness boundary ${offset}`, () => {
    const f = fixture(); f.heartbeat.issued_at = new Date(now + offset).toISOString(); f.resign();
    if (accepted) assert.equal(verifyControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, now).length, 2);
    else assert.throws(() => verifyControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, now), /HEARTBEAT_NOT_FRESH/);
  });
}
test("replay identifiers remain identical after changing timestamp and resigning", () => {
  const f = fixture(); const first = verifyControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, now);
  f.heartbeat.issued_at = new Date(now + 1000).toISOString(); f.resign();
  const second = verifyControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, now + 1000);
  assert.deepEqual(first.map(row => row.evidence_id), second.map(row => row.evidence_id));
  assert.notEqual(first[0].payload_hash, second[0].payload_hash);
});
test("later baseline changes invalidate earlier baseline digest", () => {
  const f = fixture(); const first = validateControlPlaneSnapshot(f.snapshot, f.context, now);
  f.snapshot.policy.policy_hash = "c".repeat(64);
  assert.notEqual(validateControlPlaneSnapshot(f.snapshot, f.context, now).baselineDigest, first.baselineDigest);
});
test("evidence lifetime is capped by current credential expiry", () => {
  const f = fixture(); f.snapshot.credential.expires_at = new Date(now + 1000).toISOString();
  assert.equal(verifyControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, now)[0].expires_at, f.snapshot.credential.expires_at);
});
test("SDK heartbeat signature is interoperable with the server", async () => {
  const f = fixture();
  const key = await webcrypto.subtle.importKey("jwk", f.privateKey.export({ format: "jwk" }), { name: "Ed25519" }, false, ["sign"]);
  const signed = await signHeartbeat(f.heartbeat, f.context.tenantId, f.context.audience, key);
  assert.equal(verifyControlPlaneHeartbeat(f.snapshot, f.context, signed, now).length, 2);
});
test("verified identity with explicitly unattested runtime remains eligible only for signed-declaration evidence", () => {
  const f = fixture(); f.snapshot.verification.status = "PARTIALLY_VERIFIED";
  f.snapshot.verification.unverified_claims = ["runtime_binding", "software_provenance"];
  assert.equal(verifyControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, now)[0].normalized_facts.configurationMeaning, "AUTHENTICATED_SIGNED_DECLARATION_ONLY");
});
test("database failure never returns verified evidence", async () => {
  const f = fixture(); let writes = 0;
  await assert.rejects(persistControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, async records => {
    writes++; assert.equal(records.length, 2); return { error: { code: "XX000" } };
  }, now), /CONTROL_PLANE_PERSISTENCE_FAILED/);
  assert.equal(writes, 1);
});
test("invalid heartbeat never calls the ledger writer", async () => {
  const f = fixture(); f.heartbeat.signature = "A".repeat(86);
  await assert.rejects(persistControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, async () => assert.fail("must not write"), now));
});
test("concurrent replay has one successful pair and one rejection under ledger uniqueness", async () => {
  const f = fixture(); const ledger = new Map();
  const insert = async rows => {
    if (rows.some(row => ledger.has(row.evidence_id))) return { error: { code: "23505" } };
    rows.forEach(row => ledger.set(row.evidence_id, row)); return { error: null };
  };
  const results = await Promise.allSettled([1, 2].map(() => persistControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, insert, now)));
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(results.find(result => result.status === "rejected").reason.code, "HEARTBEAT_REPLAY");
  assert.equal(ledger.size, 2);
});
test("canonical consumption revalidates both records throughout their bounded lifetime", () => {
  const f = fixture(); const rows = verifyControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, now);
  assert.equal(eligibleControlPlaneEvidence(f.snapshot, f.context, rows, now + 200_000).size, 2);
  assert.equal(eligibleControlPlaneEvidence(f.snapshot, f.context, rows, now + 300_000).size, 0);
  assert.equal(eligibleControlPlaneEvidence(f.snapshot, f.context, rows.slice(0, 1), now).size, 0);
  f.snapshot.authority.revocation_state = "revoked";
  assert.equal(eligibleControlPlaneEvidence(f.snapshot, f.context, rows, now).size, 0);
});
for (const [name, mutate] of Object.entries({
  "credential rotated": f => { f.snapshot.credential.state = "ROTATED"; },
  "verification stale": f => { f.snapshot.verification.expires_at = before; },
  "policy changed": f => { f.snapshot.policy.policy_hash = "c".repeat(64); },
  "manifest changed": f => { f.snapshot.manifest.manifest.ai.modelVersion = "changed"; },
  "authority changed": f => { f.snapshot.authority.contract.authorityVersion = "v2"; },
  "record payload changed": (f, rows) => { rows[0].normalized_facts.independence = "INDEPENDENT"; },
  "record expiry changed": (f, rows) => { rows[0].expires_at = after; },
  "record id changed": (f, rows) => { rows[0].evidence_id = "other"; },
  "record not server verified": (f, rows) => { rows[0].server_verified = false; },
})) test(`retained evidence becomes ineligible: ${name}`, () => {
  const f = fixture(); const rows = verifyControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, now);
  mutate(f, rows); assert.equal(eligibleControlPlaneEvidence(f.snapshot, f.context, rows, now).size, 0);
});

function publicManifestFixture() {
  const f = fixture(); const value = f.snapshot.manifest.manifest;
  value.signatureProfile = "PUBLIC_MANIFEST_V1";
  value.signedPublicManifest = {
    manifest_version: "1.0", operational_entity_id: f.context.agentId, entity_type: "AI_AGENT", owner_reference: "owner:real",
    model: { provider: "test", identifier: "model:real", version: null }, runtime: { framework: "node", runtime_type: "node", region: null, version: null, workload_identifier: null, deployment_identifier: null, build_digest: null },
    environment: "production", declared_capabilities: ["read_repository"], credential_id: f.heartbeat.credential_id,
    issued_at: value.issuedAt, expires_at: value.expiresAt, nonce: value.nonce,
  };
  const resignManifest = () => {
    value.manifestDigest = deriveManifestDigest(value);
    value.signature = sign(null, manifestSigningPayload(value), f.privateKey).toString("base64url");
    f.snapshot.manifest.manifest_digest = value.manifestDigest;
    f.snapshot.verification.manifest_digest = value.manifestDigest;
    f.snapshot.identityEvidence.manifest_digest = value.manifestDigest;
  };
  resignManifest(); return { ...f, resignManifest };
}
test("public manifest configuration digests cover signed claims, never unsigned projections", () => {
  const f = publicManifestFixture(); const original = validateControlPlaneSnapshot(f.snapshot, f.context, now);
  f.snapshot.manifest.manifest.runtime.runtimeVersion = "unsigned-projection-change";
  assert.equal(validateControlPlaneSnapshot(f.snapshot, f.context, now).baseline.runtimeConfigurationDigest, original.baseline.runtimeConfigurationDigest);
  f.snapshot.manifest.manifest.signedPublicManifest.runtime.version = "signed-configuration-change";
  assert.throws(() => validateControlPlaneSnapshot(f.snapshot, f.context, now));
  f.resignManifest();
  assert.notEqual(validateControlPlaneSnapshot(f.snapshot, f.context, now).baseline.runtimeConfigurationDigest, original.baseline.runtimeConfigurationDigest);
});
for (const field of ["credential_id", "owner_reference", "operational_entity_id", "environment"]) test(`signature-valid public manifest with wrong ${field} fails binding`, () => {
  const f = publicManifestFixture(); f.snapshot.manifest.manifest.signedPublicManifest[field] = "wrong"; f.resignManifest();
  assert.throws(() => verifyControlPlaneHeartbeat(f.snapshot, f.context, f.heartbeat, now), /SIGNED_CLAIMS_MISMATCH/);
});
