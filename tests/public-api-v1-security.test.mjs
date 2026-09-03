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
import { createApiKeyMaterial, createRotatedApiKeyMaterial, verifyApiKeyHash } from "../lib/public-api/v1/api-key-crypto.ts";
import { validateApiKeyRecord } from "../lib/public-api/v1/api-key-lifecycle.ts";
import { assertOnlyFields, boundedJson, publicApiErrorResponse, publicApiResponse, PublicApiError, stablePublicErrorCode } from "../lib/public-api/v1/contracts.ts";
import {
  resolveClientEvidenceProvider,
  resolveClientEvidenceType,
  verifyClientEvidenceDigest,
} from "../lib/public-api/v1/client-evidence.ts";

const migration = await readFile(new URL("../supabase/migrations/202608110001_external_agent_trust_api.sql", import.meta.url), "utf8");
const closureMigration = await readFile(new URL("../supabase/migrations/20260828165913_close_public_api_security_contract.sql", import.meta.url), "utf8");
const rateLimitIsolationMigration = await readFile(new URL("../supabase/migrations/20260829094528_harden_public_api_rate_limit_isolation.sql", import.meta.url), "utf8");
const customerZeroMigration = await readFile(new URL("../supabase/migrations/20260829164824_close_public_api_customer_zero.sql", import.meta.url), "utf8");
const replaySubjectFixMigration = await readFile(new URL("../supabase/migrations/20260831121500_fix_public_api_replay_subject.sql", import.meta.url), "utf8");
const replayEventTypeFixMigration = await readFile(new URL("../supabase/migrations/20260831124000_expand_canonical_replay_event_types.sql", import.meta.url), "utf8");
const trustMemorySourceFixMigration = await readFile(new URL("../supabase/migrations/20260831125500_fix_public_api_trust_memory_source_id.sql", import.meta.url), "utf8");
const apiKeyPrivilegeMigration = await readFile(new URL("../supabase/migrations/20260901120000_grant_service_role_api_keys_privileges.sql", import.meta.url), "utf8");
const keyCryptoSource = await readFile(new URL("../lib/public-api/v1/api-key-crypto.ts", import.meta.url), "utf8");
const runtimeSource = await readFile(new URL("../lib/public-api/v1/runtime.ts", import.meta.url), "utf8");
const handlerSource = await readFile(new URL("../lib/public-api/v1/handler.ts", import.meta.url), "utf8");
const apiKeyLifecycleSource = await readFile(new URL("../lib/public-api/v1/api-key-lifecycle.ts", import.meta.url), "utf8");
const webhookDeliverySource = await readFile(new URL("../lib/public-api/v1/webhook-delivery.ts", import.meta.url), "utf8");
const authorityServerSource = await readFile(new URL("../lib/operational-entities/delegated-authority-server.ts", import.meta.url), "utf8");
const enforcementServerSource = await readFile(new URL("../lib/operational-entities/native-enforcement-server.ts", import.meta.url), "utf8");
const apiKeyManagerSource = await readFile(new URL("../app/developers/api-keys/api-key-manager.tsx", import.meta.url), "utf8");
const apiKeyPageSource = await readFile(new URL("../app/developers/api-keys/page.tsx", import.meta.url), "utf8");
const apiKeyRouteSource = await readFile(new URL("../app/api/developer/api-keys/route.ts", import.meta.url), "utf8");
const readinessRouteSource = await readFile(new URL("../app/api/ready/route.ts", import.meta.url), "utf8");
const canonicalSource = await readFile(new URL("../src/lib/trust-transaction/canonical.ts", import.meta.url), "utf8");

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
    assert.match(apiKeyLifecycleSource, new RegExp(lifecycle));
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

test("service_role retains the narrow api_keys table grants required by the public V1 API", () => {
  assert.match(apiKeyPrivilegeMigration, /grant select, insert, update, delete\s+on table public\.api_keys\s+to service_role/i);
  assert.doesNotMatch(apiKeyPrivilegeMigration, /grant all privileges/i);
  assert.doesNotMatch(apiKeyPrivilegeMigration, /grant\s+(select,\s*)?insert,\s*update,\s*delete\s+on table public\.api_keys\s+to (anon|authenticated|public)/i);
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
  for (const scope of ["agents:write", "agents:verify", "authority:read", "authority:write", "trust:request", "trust:read", "evidence:write", "outcomes:write", "review:read", "review:write"]) {
    assert.match(apiKeyManagerSource, new RegExp(scope));
  }
  for (const boundaryField of ["authority_actions", "authority_target_prefixes", "authority_purposes", "authority_environments", "authority_max_ttl_seconds"]) assert.match(apiKeyManagerSource, new RegExp(boundaryField));
  assert.match(apiKeyManagerSource, /CUSTOMER_ZERO_ADMIN/);
  assert.doesNotMatch(apiKeyManagerSource, /cs_(test|live)_[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{43}/);
});

test("outcome source self is server-resolved to the authenticated API client", () => {
  assert.match(runtimeSource, /requestedSourceId === "self" \? `api-client:\$\{principal\.clientId\}`/);
  assert.match(runtimeSource, /sourceId !== `api-client:\$\{principal\.clientId\}`/);
});

test("public authority purpose matches the SDK and quickstart decision contract", () => {
  const registration = runtimeSource.slice(runtimeSource.indexOf("export async function registerExternalAgent"), runtimeSource.indexOf("export async function getExternalAgent"));
  const grant = runtimeSource.slice(runtimeSource.indexOf("export async function grantExternalAuthority"), runtimeSource.indexOf("export async function getExternalTrustState"));
  assert.doesNotMatch(registration, /validateTrustContract|authorizedObjective/);
  assert.match(grant, /authorizedObjective: purpose/);
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

test("API-key rotation is atomic, concurrency-safe, and retry recoverable without stored raw material", () => {
  const context = {
    tenantId: "11111111-1111-4111-8111-111111111111",
    keyId: "22222222-2222-4222-8222-222222222222",
    rotationRequestId: "33333333-3333-4333-8333-333333333333",
  };
  const first = createRotatedApiKeyMaterial("live", context, "r".repeat(32));
  const retry = createRotatedApiKeyMaterial("live", context, "r".repeat(32));
  const anotherRequest = createRotatedApiKeyMaterial("live", { ...context, rotationRequestId: "44444444-4444-4444-8444-444444444444" }, "r".repeat(32));
  assert.equal(first.rawKey, retry.rawKey);
  assert.notEqual(first.rawKey, anotherRequest.rawKey);
  assert.equal(verifyApiKeyHash(first.rawKey, first.secretHash), true);
  assert.throws(() => createRotatedApiKeyMaterial("test", context, "short"), /PUBLIC_API_KEY_ROTATION_SECRET_REQUIRED/);

  for (const invariant of [
    /create or replace function public\.rotate_public_api_key_v1/,
    /pg_advisory_xact_lock/,
    /for update/,
    /api_keys_rotation_request_uidx/,
    /insert into public\.api_keys[\s\S]*update public\.api_keys[\s\S]*insert into public\.trust_architecture_audit_log/,
    /if not found then[\s\S]*API_KEY_ROTATION_CONFLICT/,
    /source_key\.status<>'active' or source_key\.revoked_at is not null/,
    /rotated_from_id=p_key_id and rotation_request_id=p_rotation_request_id/,
    /'idempotentReplay',true/,
    /source_key\.expires_at is not null and source_key\.expires_at<=now_at/,
    /where tenant_id=p_tenant_id and id=p_key_id for update/,
    /workspace\.created_by=p_actor_user_id[\s\S]*member\.role='admin'/,
    /revoke all on function public\.rotate_public_api_key_v1[\s\S]*from public,anon,authenticated/,
  ]) assert.match(customerZeroMigration, invariant);
  assert.doesNotMatch(customerZeroMigration, /raw_api_key|plaintext_api_key|encrypted_api_key/i);
  assert.match(apiKeyRouteSource, /db\.rpc\("rotate_public_api_key_v1"/);
  assert.doesNotMatch(apiKeyRouteSource, /from\("api_keys"\)\.insert\([\s\S]*rotated_from_id: keyId/);
  assert.match(apiKeyManagerSource, /sessionStorage/);
  assert.match(apiKeyManagerSource, /Rotation response was uncertain/);
});

test("readiness fails closed unless the complete canonical API contract is present", () => {
  assert.match(readinessRouteSource, /PUBLIC_API_KEY_ROTATION_SECRET/);
  assert.match(readinessRouteSource, /db\.rpc\("public_api_readiness_v1"\)/);
  for (const check of ["canonicalPersistence", "authority", "humanReview", "rateLimiting", "apiKeyRotation"]) {
    assert.match(readinessRouteSource, new RegExp(check));
  }
  for (const contract of [
    "consume_public_api_rate_limit_v1",
    "persist_canonical_trust_transaction_decision_v1",
    "persist_public_api_authority_v1",
    "revoke_public_api_authority_v1",
    "create_public_api_review_v1",
    "resolve_canonical_manual_review_v1",
    "resolve_public_api_review_v1",
    "rotate_public_api_key_v1",
  ]) assert.match(customerZeroMigration, new RegExp(contract));
  assert.match(customerZeroMigration, /revoke all on function public\.public_api_readiness_v1\(\) from public,anon,authenticated/);
});

test("public authority administration is tenant/client/role/boundary constrained and version preserving", () => {
  for (const required of [
    /public_api_key_has_current_role_v1/,
    /array\['owner','admin'\]/,
    /key\.tenant_id=p_tenant_id and key\.client_id=p_client_id/,
    /binding\.tenant_id=p_tenant_id and binding\.client_id=p_client_id and binding\.operational_entity_id=p_agent_id/,
    /authority_management_boundary is null/,
    /Authority grant exceeds management boundary/,
    /Verified current agent identity required/,
    /supersedesContractId/,
    /Authority version conflict/,
    /revoke_trust_contract_with_delegation_cascade_v1/,
  ]) assert.match(customerZeroMigration, required);
  assert.match(runtimeSource, /authorityAdministration\(principal\)/);
  assert.match(runtimeSource, /\["owner", "admin"\]\.includes\(principal\.role\)/);
  assert.doesNotMatch(runtimeSource, /export async function updateExternalAuthority/);
});

test("public REVIEW resolution is isolated, immutable, and cannot become an executable ALLOW", () => {
  for (const required of [
    /decision='REVIEW'/,
    /p_expected_client_id is null or requested_client_id=p_expected_client_id/,
    /resolve_canonical_manual_review_v1\(p_tenant_id,key\.created_by,p_client_id/,
    /array\['owner','admin','reviewer'\]/,
    /Review already resolved/,
    /Review expired/,
    /originalDecision','REVIEW'/,
    /the original canonical decision remains REVIEW/,
  ]) assert.match(customerZeroMigration, required);
  assert.match(runtimeSource, /\["owner", "admin", "reviewer"\]\.includes\(principal\.role\)/);
  assert.match(runtimeSource, /next_action: review\.data\.status === "APPROVED" \? "SUBMIT_NEW_CANONICAL_EVALUATION"/);
  assert.doesNotMatch(customerZeroMigration, /update public\.canonical_trust_transactions set decision='ALLOW'/i);
});

test("API key lifecycle and least-privilege scopes are enforced as executable behavior", () => {
  const material = createApiKeyMaterial("test");
  const valid = {
    key_hash: material.secretHash,
    status: "active",
    revoked_at: null,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    scopes: ["agents:write", "trust:request", "trust:read"],
    tenant_id: "11111111-1111-4111-8111-111111111111",
    client_id: "22222222-2222-4222-8222-222222222222",
    created_by: "33333333-3333-4333-8333-333333333333",
  };
  assert.deepEqual(validateApiKeyRecord(valid, material.rawKey, ["trust:request"]).scopes, valid.scopes);
  assert.throws(() => validateApiKeyRecord(valid, material.rawKey, ["evidence:write"]), (error) => error.code === "INSUFFICIENT_SCOPE" && error.status === 403);
  assert.throws(() => validateApiKeyRecord({ ...valid, status: "revoked", revoked_at: new Date().toISOString() }, material.rawKey, []), (error) => error.code === "API_KEY_REVOKED");
  assert.throws(() => validateApiKeyRecord({ ...valid, expires_at: new Date(Date.now() - 1).toISOString() }, material.rawKey, []), (error) => error.code === "API_KEY_EXPIRED");
  assert.throws(() => validateApiKeyRecord(valid, `${material.rawKey.slice(0, -1)}x`, []), (error) => error.code === "API_KEY_INVALID");
});

test("client evidence is subject-bound and cannot spoof another client or tenant", () => {
  const section = runtimeSource.slice(runtimeSource.indexOf("submitExternalEvidence"), runtimeSource.lastIndexOf("emitDecisionWebhooks"));
  assert.match(section, /await entityFor\(principal, subjectId\)/);
  assert.match(runtimeSource, /eq\("tenant_id", principal\.tenantId\).*eq\("client_id", principal\.clientId\).*eq\("operational_entity_id", agentId\)/s);
  assert.match(section, /PUBLIC_API_AGENT_BINDING/);
});

test("consequence-time references are tenant-bound pins, never client-created proof", () => {
  const section = runtimeSource.slice(runtimeSource.indexOf("export async function requestExternalDecision"), runtimeSource.indexOf("async function transactionRows"));
  assert.match(section, /previous_transaction_id/);
  assert.match(section, /canonical_trust_transactions.*enterprise_id.*principal\.tenantId.*actor_id.*principal\.clientId.*operational_entity_id.*agentId/s);
  assert.match(section, /trust_manual_reviews.*tenant_id.*principal\.tenantId.*requested_client_id.*principal\.clientId.*entity_id.*agentId/s);
  assert.match(section, /sourceClassification: "human_reviewed"/);
  assert.match(section, /sourceClassification: "agent_asserted"/);
  assert.match(section, /currentEvidenceReferences/);
  assert.match(section, /clientAssertedMaterialChanges/);
  assert.doesNotMatch(section, /previous.*decision\s*===\s*"ALLOW".*executionAuthorization/s);
});

test("public clients cannot forge provider identity or decision-eligible evidence namespaces", () => {
  assert.deepEqual(resolveClientEvidenceProvider({ key: "self", class: "APPLICATION_SIGNAL" }, "client:alpha"), {
    providerKey: "api-client:client:alpha",
    providerClass: "APPLICATION_SIGNAL",
  });
  assert.throws(() => resolveClientEvidenceProvider({ key: "cyber_sentinels_native", class: "APPLICATION_SIGNAL" }, "client:alpha"), (error) => error instanceof PublicApiError && error.code === "PROVIDER_IDENTITY_RESERVED");
  assert.throws(() => resolveClientEvidenceProvider({ key: "self", class: "IDENTITY_PROVIDER" }, "client:alpha"), (error) => error instanceof PublicApiError && error.code === "PROVIDER_AUTHENTICATION_REQUIRED");
  for (const type of ["NATIVE_ENTITY_IDENTITY_PROOF", "PROVIDER_VERIFIED_IDENTITY", "POLICY_EVIDENCE", "RUNTIME_AUTHORITY_EVIDENCE"]) {
    assert.throws(() => resolveClientEvidenceType(type), (error) => error instanceof PublicApiError && error.code === "EVIDENCE_TYPE_RESERVED");
  }
});

test("client evidence digest is server authoritative and bad caller digests are rejected", () => {
  const computed = "a".repeat(64);
  assert.equal(verifyClientEvidenceDigest(null, computed), computed);
  assert.equal(verifyClientEvidenceDigest(computed, computed), computed);
  assert.throws(() => verifyClientEvidenceDigest("b".repeat(64), computed), (error) => error instanceof PublicApiError && error.code === "EVIDENCE_DIGEST_MISMATCH");
  assert.match(runtimeSource, /const computedDigest = hashCanonical\(normalizedFacts\)/);
  assert.match(runtimeSource, /payload_hash: computedDigest/);
});

test("AGENT_ASSERTED evidence cannot become independent proof or satisfy canonical completeness", () => {
  assert.match(runtimeSource, /evidence_classification: CLIENT_EVIDENCE_CLASSIFICATION/);
  assert.match(runtimeSource, /source_type: "PUBLIC_API_CLIENT_ASSERTION"/);
  assert.match(runtimeSource, /result: "INCONCLUSIVE"/);
  assert.match(runtimeSource, /server_verified: false/);
  assert.match(canonicalSource, /\["agent_asserted", "unconfirmed"\]/);
  assert.match(canonicalSource, /decisionEligibleEvidence/);
});

test("decision context cannot forge assurance, monitoring, sensor, or signed-intent provenance", () => {
  const section = runtimeSource.slice(runtimeSource.indexOf("requestExternalDecision"), runtimeSource.indexOf("transactionRows"));
  assert.match(section, /Decision-eligible assurance evidence must arrive through an authenticated provider ingestion path/);
  assert.match(section, /Signed human intent must be resolved through an existing verified intent path/);
  assert.match(section, /providerClass: "APPLICATION_SIGNAL"/);
  assert.match(section, /providerKey: `api-client:\$\{principal\.clientId\}`/);
  assert.match(section, /outcome: "ASSERTED"/);
  assert.doesNotMatch(section, /monitoringCoverage = .*"covered"/);
});

test("public client evidence is immutable and evidence:write is a valid prepared API-key scope", () => {
  assert.match(closureMigration, /'evidence:write'/);
  assert.match(closureMigration, /PUBLIC_API_CLIENT_ASSERTION/);
  assert.match(closureMigration, /before update or delete on public\.evidence_objects/);
  assert.match(closureMigration, /append-only/);
});

test("public Replay is canonical transaction history, never tenant-created replay sessions", () => {
  const section = runtimeSource.slice(runtimeSource.indexOf("getExternalReplay"), runtimeSource.indexOf("getExternalReceipt"));
  assert.match(section, /transactionRows\(principal, transactionId\)/);
  assert.match(section, /canonical_trust_transaction/);
  assert.doesNotMatch(section, /trust_replay_sessions/);
});

test("transactions, receipts, and Replay are tenant-filtered before retrieval", () => {
  const section = runtimeSource.slice(runtimeSource.indexOf("transactionRows"), runtimeSource.indexOf("submitExternalOutcome"));
  for (const table of ["canonical_trust_transactions", "canonical_trust_transaction_events", "public_api_outcome_submissions", "native_enforcement_outcomes"]) {
    assert.match(section, new RegExp(`from\\(\"${table}\"\\).*principal\\.tenantId`, "s"));
  }
  assert.match(section, /from\("canonical_trust_transactions"\).*eq\("enterprise_id", principal\.tenantId\).*eq\("actor_id", principal\.clientId\).*eq\("transaction_id", transactionId\)/s);
  assert.ok(section.indexOf("if (!transaction.data)") < section.indexOf("Promise.all"), "child lookups must occur only after client ownership is proven");
});

test("public client adversarial matrix derives authorization from the authenticated principal", () => {
  const transactionSection = runtimeSource.slice(runtimeSource.indexOf("transactionRows"), runtimeSource.indexOf("submitExternalOutcome"));
  const evidenceSection = runtimeSource.slice(runtimeSource.indexOf("submitExternalEvidence"), runtimeSource.lastIndexOf("emitDecisionWebhooks"));
  assert.match(runtimeSource, /public_api_agent_bindings.*tenant_id.*principal\.tenantId.*client_id.*principal\.clientId.*operational_entity_id.*agentId/s);
  assert.match(transactionSection, /actor_id", principal\.clientId/);
  assert.match(evidenceSection, /await entityFor\(principal, subjectId\)/);
  assert.match(runtimeSource.slice(runtimeSource.indexOf("submitExternalOutcome"), runtimeSource.indexOf("submitExternalEvidence")), /transactionRows\(principal, transactionId\)/);
  for (const projection of ["getExternalTransaction", "getExternalReceipt", "getExternalReplay"]) {
    const start = runtimeSource.indexOf(`export async function ${projection}`);
    assert.match(runtimeSource.slice(start, start + 400), /transactionRows\(principal, transactionId\)/);
  }
});

test("rate limits are atomic and separated by endpoint class", () => {
  assert.match(migration, /consume_public_api_rate_limit_v1/);
  assert.match(migration, /on conflict\(client_id,route_class,window_started_at\) do update/);
  for (const routeClass of ["registration", "challenge", "proof", "decision", "read", "evidence", "outcome"]) {
    assert.match(handlerSource, new RegExp(`${routeClass}: \\{ limit:`));
  }
  assert.match(handlerSource, /RATE_LIMIT_EXCEEDED/);
  assert.match(rateLimitIsolationMigration, /primary key\(tenant_id,client_id,route_class,window_started_at\)/);
  assert.match(rateLimitIsolationMigration, /on conflict\(tenant_id,client_id,route_class,window_started_at\)/);
  assert.match(handlerSource, /x-ratelimit-remaining/);
});

test("public responses expose stable request, correlation and version metadata without caching", async () => {
  const requestId = "22222222-2222-4222-8222-222222222222";
  const correlationId = "11111111-1111-4111-8111-111111111111";
  const response = publicApiResponse({ resource_id: "resource:1" }, {}, correlationId, requestId);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-request-id"), requestId);
  assert.equal(response.headers.get("x-correlation-id"), correlationId);
  assert.deepEqual(await response.json(), {
    resource_id: "resource:1",
    request_id: requestId,
    correlation_id: correlationId,
    api_version: "2026-08-29",
  });
});

test("public failures normalize stable codes and never expose unexpected error details", async () => {
  assert.equal(stablePublicErrorCode("INVALID_API_KEY"), "API_KEY_INVALID");
  assert.equal(stablePublicErrorCode("RATE_LIMIT_EXCEEDED"), "RATE_LIMITED");
  assert.equal(stablePublicErrorCode("PROVIDER_IDENTITY_RESERVED"), "PROVIDER_NAMESPACE_RESERVED");
  assert.equal(stablePublicErrorCode("RATE_LIMIT_UNAVAILABLE", 503), "READINESS_UNAVAILABLE");
  assert.equal(stablePublicErrorCode("CALLER_AUTHORITY_CLAIM_REJECTED", 400), "INVALID_REQUEST");
  assert.equal(stablePublicErrorCode("OUTCOME_SOURCE_NOT_APPROVED", 403), "TENANT_ACCESS_DENIED");
  assert.equal(stablePublicErrorCode("EVIDENCE_EVENT_CONFLICT", 409), "IDEMPOTENCY_CONFLICT");
  assert.equal(stablePublicErrorCode("SUPABASE_PRIVATE_DETAIL", 500), "INTERNAL_ERROR");
  const response = publicApiErrorResponse(new Error("Supabase service_role SQL stack"), "11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222");
  const body = await response.json();
  assert.equal(response.status, 500);
  assert.equal(body.error.code, "INTERNAL_ERROR");
  assert.doesNotMatch(JSON.stringify(body), /Supabase|service_role|SQL|stack/i);
});

test("mutating JSON routes reject missing or incorrect content types", async () => {
  await assert.rejects(
    boundedJson(new Request("https://preview.example/api/v1/agents", { method: "POST", body: "{}" })),
    (error) => error instanceof PublicApiError && error.status === 415,
  );
});

test("decision idempotency is client scoped and changed retries map to 409", () => {
  assert.match(runtimeSource, /idempotencyKey: `\$\{principal\.clientId\}:\$\{idempotencyKey\}`/);
  assert.match(runtimeSource, /IDEMPOTENCY_CONFLICT/);
  assert.match(runtimeSource, /409/);
  assert.match(runtimeSource, /context: deploymentContext \?\? null/);
  assert.match(runtimeSource, /payloadDigest: requestDigest/);
});

test("public resource identifiers are stable transaction projections", () => {
  for (const field of ["decision_id", "transaction_id", "receipt_id", "replay_id", "agent_id", "correlation_id"]) {
    assert.match(runtimeSource, new RegExp(field));
  }
  assert.match(runtimeSource, /receipt_id: receipt\.transactionId/);
  assert.match(runtimeSource, /replay_id: receipt\.transactionId/);
});

test("public API Replay uses the canonical transaction UUID instead of casting an opaque workflow ID", () => {
  assert.match(replaySubjectFixMigration, /'trust_transaction',p_transaction_id/);
  assert.doesNotMatch(replaySubjectFixMigration, /workflow_id\s*::\s*uuid/i);
  assert.match(replaySubjectFixMigration, /canonical_transaction_id/);
  assert.match(replaySubjectFixMigration, /REPLAY_WRITTEN/);
});

test("canonical Replay accepts every controlled decision-time projection event class", () => {
  for (const eventType of [
    "AUTHORITY_BOUND_PARAMETERS_SNAPSHOTTED",
    "TRUST_TWIN_PROJECTED",
    "TRUST_PRESSURE_EVALUATED",
    "TRUST_BUDGET_EVALUATED",
    "TRUST_FORECAST_EVALUATED",
    "TRUST_FORECAST_CHANGED",
    "TRUST_FORECAST_CONTROL_RECOMMENDED",
    "ADAPTIVE_VERIFICATION_EVALUATED",
  ]) assert.match(replayEventTypeFixMigration, new RegExp(`'${eventType}'`));
  assert.match(replayEventTypeFixMigration, /drop constraint if exists canonical_trust_transaction_events_event_type_check/);
  assert.match(replayEventTypeFixMigration, /add constraint canonical_trust_transaction_events_event_type_check/);
});

test("canonical Trust Memory extracts projection event IDs before text concatenation", () => {
  assert.match(trustMemorySourceFixMigration, /p_transaction_id::text\s*\|\|\s*':'\s*\|\|\s*\(item->>'eventId'\)/);
  assert.doesNotMatch(trustMemorySourceFixMigration, /\|\|\s*item->>'eventId'/);
  assert.match(trustMemorySourceFixMigration, /emit_canonical_trust_transaction_memory_v1/);
  assert.match(trustMemorySourceFixMigration, /to service_role/);
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
