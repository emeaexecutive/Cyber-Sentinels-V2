import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { canonicalize } from "../src/lib/trust-core/canonicalize.ts";
import {
  credentialFingerprint,
  deriveManifestDigest,
  verifySignedManifest,
} from "../lib/operational-entities/native-verification.ts";
import { signPublicWebhookPayload, verifyPublicWebhookPayload } from "../lib/public-api/v1/webhooks.ts";
import { createApiKeyMaterial, verifyApiKeyHash } from "../lib/public-api/v1/api-key-crypto.ts";
import { assertOnlyFields, boundedJson, PublicApiError } from "../lib/public-api/v1/contracts.ts";

const migration = await readFile(new URL("../supabase/migrations/202608110001_external_agent_trust_api.sql", import.meta.url), "utf8");
const keyCryptoSource = await readFile(new URL("../lib/public-api/v1/api-key-crypto.ts", import.meta.url), "utf8");
const runtimeSource = await readFile(new URL("../lib/public-api/v1/runtime.ts", import.meta.url), "utf8");
const handlerSource = await readFile(new URL("../lib/public-api/v1/handler.ts", import.meta.url), "utf8");
const authenticationSource = await readFile(new URL("../lib/public-api/v1/authentication.ts", import.meta.url), "utf8");
const webhookDeliverySource = await readFile(new URL("../lib/public-api/v1/webhook-delivery.ts", import.meta.url), "utf8");
const authorityServerSource = await readFile(new URL("../lib/operational-entities/delegated-authority-server.ts", import.meta.url), "utf8");
const enforcementServerSource = await readFile(new URL("../lib/operational-entities/native-enforcement-server.ts", import.meta.url), "utf8");
const apiKeyManagerSource = await readFile(new URL("../app/developers/api-keys/api-key-manager.tsx", import.meta.url), "utf8");
const apiKeyPageSource = await readFile(new URL("../app/developers/api-keys/page.tsx", import.meta.url), "utf8");

test("API client credentials are tenant scoped, hashed, expirable, revocable, scoped and auditable", () => {
  for (const field of ["tenant_id", "client_id", "key_prefix", "key_hash", "scopes", "expires_at", "revoked_at", "last_used_at", "rotated_from_id"]) {
    assert.match(migration, new RegExp(field));
  }
  assert.match(keyCryptoSource, /timingSafeEqual/);
  assert.match(keyCryptoSource, /scryptSync/);
  assert.doesNotMatch(migration, /plaintext_api_key|raw_api_key|secret_plaintext/i);
  assert.match(migration, /public_api_audit_events/);
  assert.match(handlerSource, /safe_error_code/);
  assert.match(migration, /revoke insert,update,delete on table public\.api_keys from authenticated/);
  for (const lifecycle of ["API_KEY_REVOKED", "API_KEY_EXPIRED", "API_KEY_INACTIVE", "INSUFFICIENT_SCOPE"]) {
    assert.match(authenticationSource, new RegExp(lifecycle));
  }
});

test("API key material is high entropy, one-time reconstructable and hash verified", () => {
  const material = createApiKeyMaterial("test");
  assert.match(material.rawKey, /^cs_test_[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{43}$/);
  assert.equal(material.rawKey.includes(material.secretHash), false);
  assert.equal(verifyApiKeyHash(material.rawKey, material.secretHash), true);
  assert.equal(verifyApiKeyHash(`${material.rawKey.slice(0, -1)}x`, material.secretHash), false);
  assert.match(material.secretHash, /^scrypt\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/);
  assert.match(keyCryptoSource, /PUBLIC_API_KEY_PATTERN = \/\^cs_\(test\|live\)_\(\[a-zA-Z0-9_-\]\{12\}\)/);
});

test("developer API-key UI binds every lifecycle request to the resolved session tenant", () => {
  assert.match(apiKeyPageSource, /resolveOperationalEntityTenantId\(supabase, user\)/);
  assert.match(apiKeyPageSource, /<ApiKeyManager enterpriseId=\{enterpriseId\}/);
  assert.equal(apiKeyManagerSource.match(/"x-enterprise-id": enterpriseId/g)?.length, 3);
});

test("developer API-key UI documents one-time handling and the complete Gamma scope set", () => {
  assert.match(apiKeyManagerSource, /SECRET SHOWN ONCE/);
  assert.match(apiKeyManagerSource, /CYBER_SENTINELS_BASE_URL/);
  assert.match(apiKeyManagerSource, /CYBER_SENTINELS_API_KEY/);
  assert.match(apiKeyManagerSource, /<paste the one-time secret>/);
  for (const scope of ["agents:write", "agents:verify", "authority:read", "trust:request", "trust:read", "evidence:write", "outcomes:write"]) {
    assert.match(apiKeyManagerSource, new RegExp(scope));
  }
  assert.doesNotMatch(apiKeyManagerSource, /cs_(test|live)_[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{43}/);
});

test("outcome source self is server-resolved to the authenticated API client", () => {
  assert.match(runtimeSource, /requestedSourceId === "self" \? `api-client:\$\{principal\.clientId\}`/);
  assert.match(runtimeSource, /sourceId !== `api-client:\$\{principal\.clientId\}`/);
});

test("public authority purpose matches the SDK and quickstart decision contract", () => {
  assert.equal(runtimeSource.match(/purpose: "deployment_evidence_review"/g)?.length, 1);
  assert.equal(runtimeSource.match(/authorizedObjective: "deployment_evidence_review"/g)?.length, 1);
});

test("RLS and service-only writes isolate public API tenants", () => {
  for (const table of ["public_api_agent_bindings", "public_api_audit_events", "public_api_rate_limit_windows", "public_api_outcome_submissions", "public_api_webhook_events"]) {
    assert.match(migration, new RegExp(`alter table public\\.%I enable row level security|${table}`, "i"));
  }
  assert.match(migration, /user_can_access_trust_workspace\(tenant_id\)/);
  assert.match(migration, /auth\.role\(\)<>'service_role'/);
  assert.match(runtimeSource, /eq\("enterprise_id", principal\.tenantId\)/);
  assert.match(runtimeSource, /eq\("tenant_id", principal\.tenantId\)/);
});

test("public agents are bound to one API client so Gamma cannot claim Alpha or Beta", () => {
  assert.match(migration, /create table public\.public_api_agent_bindings/);
  assert.match(runtimeSource, /from\("public_api_agent_bindings"\).*eq\("client_id", principal\.clientId\).*eq\("operational_entity_id", agentId\)/s);
  assert.match(runtimeSource, /The agent is not bound to this API client/);
});

test("rate limits are atomic and separated by endpoint class", () => {
  assert.match(migration, /consume_public_api_rate_limit_v1/);
  assert.match(migration, /on conflict\(client_id,route_class,window_started_at\) do update/);
  for (const routeClass of ["registration", "challenge", "proof", "decision", "read", "evidence", "outcome"]) {
    assert.match(handlerSource, new RegExp(`${routeClass}: \\{ limit:`));
  }
  assert.match(handlerSource, /RATE_LIMIT_EXCEEDED/);
});

test("decision idempotency is client scoped and changed retries map to 409", () => {
  assert.match(runtimeSource, /idempotencyKey: `\$\{principal\.clientId\}:\$\{idempotencyKey\}`/);
  assert.match(runtimeSource, /IDEMPOTENCY_CONFLICT/);
  assert.match(runtimeSource, /409/);
});

test("caller-controlled decision, trust and verification fields are rejected", () => {
  assert.match(runtimeSource, /assertOnlyFields\(body, \["operational_entity_id", "action", "idempotency_key", "decision_type", "context"\]\)/);
  for (const forbidden of ["risk_level", "trust_score", "confidence_score", "verified", "evidence_independence", "ALLOW"]) {
    assert.doesNotMatch(runtimeSource.slice(runtimeSource.indexOf("requestExternalDecision"), runtimeSource.indexOf("transactionRows")), new RegExp(`body\\.${forbidden}`));
  }
});

test("body-size and unexpected-field guards fail closed", async () => {
  assert.throws(() => assertOnlyFields({ operational_entity_id: "agent:gamma", trust_score: 100 }, ["operational_entity_id"]), (error) => error instanceof PublicApiError && error.code === "UNEXPECTED_FIELD");
  const request = new Request("https://preview.example/api/v1/agents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: "x".repeat(2048) }) });
  await assert.rejects(boundedJson(request, 1024), (error) => error instanceof PublicApiError && error.status === 413);
});

test("public Manifest v1 remains verified by the canonical native Ed25519 runtime", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicJwk = publicKey.export({ format: "jwk" });
  Object.assign(publicJwk, { kid: "gamma-key-1", alg: "EdDSA", use: "sig", key_ops: ["verify"] });
  const publicClaims = {
    manifest_version: "1.0", operational_entity_id: "agent:gamma", entity_type: "AI_AGENT", owner_reference: "owner:gamma",
    model: { provider: "declared-provider", identifier: "declared-model", version: "0.1" },
    runtime: { framework: "custom", runtime_type: "node", region: null, version: "22", workload_identifier: "gamma", deployment_identifier: "proof", build_digest: null },
    environment: "staging", declared_capabilities: ["read_repository"], credential_id: "credential:gamma",
    issued_at: new Date(Date.now() - 1000).toISOString(), expires_at: new Date(Date.now() + 60_000).toISOString(), nonce: "a".repeat(32),
  };
  const signature = sign(null, Buffer.from(canonicalize(publicClaims)), privateKey).toString("base64url");
  const manifest = {
    manifestVersion: "1.0", operationalEntityId: "agent:gamma", entityType: "AI_AGENT", displayName: "Agent Gamma", enterpriseId: "11111111-1111-4111-8111-111111111111",
    owner: { accountableOwnerId: "owner:gamma", organizationId: "tenant:gamma" }, software: { applicationId: null, version: null, buildDigest: null, sourceDigest: null, artifactDigest: null, packageReference: null },
    ai: { modelProvider: "declared-provider", modelIdentifier: "declared-model", modelVersion: "0.1", agentFramework: "custom", declaredTools: [] },
    runtime: { runtimeType: "node", environment: "staging", region: null, workloadIdentifier: "gamma", deploymentIdentifier: "proof", runtimeVersion: "22" },
    authority: { authorityReference: null }, credentials: { publicCredentialReferences: ["gamma-key-1"] }, declaredCapabilities: ["read_repository"],
    issuedAt: publicClaims.issued_at, expiresAt: publicClaims.expires_at, nonce: publicClaims.nonce, signingKeyId: "gamma-key-1",
    signature, manifestDigest: "", signatureProfile: "PUBLIC_MANIFEST_V1", signedPublicManifest: publicClaims,
  };
  manifest.manifestDigest = deriveManifestDigest(manifest);
  const credential = { credentialId: "credential:gamma", enterpriseId: manifest.enterpriseId, operationalEntityId: manifest.operationalEntityId, signingKeyId: "gamma-key-1", algorithm: "Ed25519", publicJwk, credentialFingerprint: credentialFingerprint(publicJwk), state: "ACTIVE", validFrom: publicClaims.issued_at, expiresAt: publicClaims.expires_at, revokedAt: null, rotatedFromCredentialId: null };
  assert.equal(verifySignedManifest(manifest, credential), true);
  const tampered = { ...manifest, signedPublicManifest: { ...publicClaims, environment: "production" } };
  assert.throws(() => verifySignedManifest(tampered, credential), /digest|signature/i);
});

test("outcome assertions never self-promote into independent destination evidence", () => {
  assert.match(runtimeSource, /independence: "AGENT_ASSERTED"/);
  assert.match(runtimeSource, /independent_destination_evidence: false/);
  assert.match(runtimeSource, /OUTCOME_SOURCE_NOT_APPROVED/);
  assert.match(runtimeSource, /OUTCOME_CONTRADICTS_DECISION/);
});

test("execution authorization is transaction bound and ALLOW only", () => {
  const section = runtimeSource.slice(runtimeSource.indexOf("function executionAuthorization"), runtimeSource.indexOf("requestExternalDecision"));
  assert.match(section, /receipt\.decision !== "ALLOW"/);
  for (const field of ["transaction_id", "operational_entity_id", "action", "target", "decision_digest", "nonce", "audience", "expires_at"]) assert.match(section, new RegExp(field));
});

test("webhook signatures reject spoofing, stale delivery and replay", () => {
  const timestamp = new Date().toISOString();
  const payload = { event_id: "11111111-1111-4111-8111-111111111111", timestamp, event_type: "decision.denied", subject_reference: "transaction:1" };
  const signature = signPublicWebhookPayload(payload, "test-webhook-secret");
  const seenEventIds = new Set();
  assert.equal(verifyPublicWebhookPayload({ payload, signature, secret: "test-webhook-secret", seenEventIds }), true);
  assert.equal(verifyPublicWebhookPayload({ payload, signature, secret: "test-webhook-secret", seenEventIds }), false);
  assert.equal(verifyPublicWebhookPayload({ payload: { ...payload, event_type: "decision.review_required" }, signature, secret: "test-webhook-secret" }), false);
  assert.equal(verifyPublicWebhookPayload({ payload, signature, secret: "wrong-secret" }), false);
  assert.equal(verifyPublicWebhookPayload({ payload, signature, secret: "test-webhook-secret", now: Date.now() + 301_000 }), false);
});

test("all declared outbound webhook events are durably queued from canonical state changes", () => {
  assert.match(webhookDeliverySource, /public_api_webhook_events/);
  assert.match(webhookDeliverySource, /signPublicWebhookPayload/);
  assert.match(runtimeSource, /decision\.review_required/);
  assert.match(runtimeSource, /decision\.denied/);
  assert.match(runtimeSource, /trust\.material_change/);
  assert.match(authorityServerSource, /authority\.revoked/);
  assert.match(enforcementServerSource, /outcome\.contradiction/);
});
