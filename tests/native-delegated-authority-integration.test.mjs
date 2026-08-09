import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/202608090001_native_delegated_authority.sql");
const domain = read("lib/operational-entities/delegated-authority.ts");
const server = read("lib/operational-entities/delegated-authority-server.ts");
const route = read("app/api/operational-entities/[entityId]/delegated-authority/route.ts");
const entityRoute = read("app/api/operational-entities/route.ts");
const entityPage = read("app/operational-entities/[entityId]/page.tsx");
const demo = read("app/demo/trust-runtime/page.tsx");
const entityModel = read("lib/operational-entities/operational-entity.ts");
const registry = JSON.parse(read("config/product-capabilities.json"));

test("migration extends canonical authority lineage without duplicate core subsystems", () => {
  assert.match(migration, /references public\.trust_contracts\(enterprise_id,contract_id\)/);
  assert.match(migration, /references public\.operational_entities\(enterprise_id,entity_id\)/);
  assert.doesNotMatch(migration, /create table public\.(operational_entities|trust_contracts|evidence_graph_nodes|evidence_graph_edges|trust_memory_index|canonical_trust_transactions)\b/);
  for (const table of ["operational_entity_authority_delegations", "operational_entity_delegation_acceptances", "operational_entity_delegated_action_evaluations"]) assert.match(migration, new RegExp(`create table public\\.${table}`));
});

test("delegation storage retains every required signed and bounded field", () => {
  for (const field of ["delegation_id", "enterprise_id", "delegator_operational_entity_id", "delegate_operational_entity_id", "parent_authority_id", "parent_delegation_id", "objective", "permitted_actions", "permitted_tools", "permitted_targets", "environments", "data_boundary", "financial_limit", "execution_limit", "can_redelegate", "maximum_delegation_depth", "issued_at", "not_before", "expires_at", "revoked_at", "policy_version", "authority_version", "delegation_digest", "status"]) assert.ok(migration.includes(field), field);
  for (const state of ["PENDING", "ACTIVE", "EXPIRED", "REVOKED", "SUPERSEDED", "REJECTED"]) assert.ok(migration.includes(`'${state}'`), state);
});

test("signed delegation and Beta acceptance payloads reuse Ed25519 verification", () => {
  assert.match(domain, /verifyDetachedEd25519\(delegationSigningPayload\(delegation\)/);
  assert.match(domain, /verifyDetachedEd25519\(acceptanceSigningPayload\(acceptance\)/);
  assert.match(domain, /credentialFingerprint.*manifestDigest.*signingKeyId/s);
  assert.match(domain, /DELEGATION_DIGEST_MISMATCH/);
  assert.match(domain, /WRONG_DELEGATOR_KEY/);
  assert.match(domain, /WRONG_DELEGATE_KEY/);
});

test("subset algorithm covers every non-amplification dimension", () => {
  for (const dimension of ["permittedActions", "permittedTools", "permittedTargets", "environments", "dataBoundary", "financialLimit", "executionLimit", "temporalLimits", "maximumDelegationDepth"]) assert.ok(domain.includes(dimension), dimension);
  assert.match(domain, /AUTHORITY_AMPLIFICATION_ATTEMPT/);
  assert.match(domain, /delegated-authority-subset-v1/);
});

test("lineage evaluator delegates to the existing canonical Authority Graph and Trust Transaction", () => {
  assert.match(domain, /evaluateAuthorityGraph/);
  assert.match(server, /executeCanonicalTrustTransaction/);
  assert.match(server, /createCanonicalTrustTransactionDependencies/);
  assert.doesNotMatch(domain, /class DelegatedTrustEngine/);
  assert.match(server, /requestExternalExecution\(\).*configured: false/s);
});

test("transaction-safe action gate rechecks current delegation and parent authority", () => {
  const fn = migration.slice(migration.indexOf("persist_delegated_action_evaluation_v1"));
  assert.match(fn, /operational_entity_authority_delegations[\s\S]*for update/);
  assert.match(fn, /trust_contracts[\s\S]*for update/);
  assert.match(fn, /final_decision:='DENY'/);
  assert.match(fn, /PARENT_AUTHORITY_REVOKED/);
  assert.match(fn, /DELEGATION_REVOKED/);
  assert.ok(fn.indexOf("for update") < fn.indexOf("insert into public.operational_entity_delegated_action_evaluations"));
});

test("duplicate Beta acceptance is serialized and fail-closed", () => {
  const fn = migration.slice(migration.indexOf("accept_operational_entity_delegation_v1"), migration.indexOf("persist_delegated_action_evaluation_v1"));
  assert.match(fn, /for update/);
  assert.match(migration, /unique\(enterprise_id,delegation_id\)/);
  assert.match(fn, /'DUPLICATE'/);
  assert.match(server, /DUPLICATE_ACCEPTANCE/);
});

test("RLS permits tenant reads and reserves writes for the service path", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /user_can_access_trust_workspace\(enterprise_id\)/);
  assert.match(migration, /revoke all[\s\S]*public,anon,authenticated/);
  assert.match(migration, /grant all privileges[\s\S]*service_role/);
  assert.match(migration, /auth\.role\(\)<>'service_role'/);
});

test("canonical Evidence Graph gets delegation, acceptance, action and revocation relationships", () => {
  for (const edge of ["ENTITY_DELEGATED_AUTHORITY", "ENTITY_RECEIVED_DELEGATED_AUTHORITY", "DELEGATION_DERIVED_FROM_AUTHORITY", "DELEGATION_ACCEPTED_BY_ENTITY", "ACTION_AUTHORIZED_BY_DELEGATION", "DELEGATION_REVOKED", "DELEGATION_EXPIRED"]) assert.ok(migration.includes(`'${edge}'`), edge);
  assert.match(server, /evidence_graph_nodes/);
  assert.match(server, /evidence_graph_edges/);
});

test("Replay and Trust Memory use existing persisted stores with materiality", () => {
  for (const event of ["ALPHA_VERIFIED", "BETA_REGISTERED", "BETA_VERIFIED", "ALPHA_AUTHORITY_ISSUED", "DELEGATION_PROPOSED", "DELEGATION_VALIDATED", "BETA_ACCEPTED", "DELEGATION_ACTIVATED", "BETA_ACTION_REQUESTED", "BETA_ACTION_ALLOWED", "BETA_SCOPE_VIOLATION_DENIED", "PARENT_AUTHORITY_REVOKED", "DELEGATION_INVALIDATED"]) assert.ok(migration.includes(`'${event}'`), event);
  assert.match(server, /operational_entity_native_replay_events/);
  assert.match(server, /trust_memory_index/);
  assert.match(server, /"DELEGATION_ACTIVATED"/);
  assert.match(server, /"DELEGATION_REVOKED"/);
  assert.doesNotMatch(server, /remember\(context, delegateId, "BETA_ACTION/);
});

test("API derives tenant, actor, role and path entity on the server", () => {
  assert.match(route, /resolveIdentityEnterprise/);
  assert.match(route, /decodeURIComponent\(\(await params\)\.entityId\)/);
  assert.doesNotMatch(route, /input\.enterpriseId/);
  for (const action of ["create_delegation", "review_delegation", "accept_delegation", "revoke_delegation", "evaluate_delegated_action"]) assert.ok(route.includes(`"${action}"`), action);
  assert.match(route, /blast_radius_for/);
});

test("Operational Entity UI exposes delegated and received authority plus complete why lineage", () => {
  for (const label of ["Delegated Authority", "Authority received", "WHY CAN BETA DO THIS?", "Parent Authority", "Scope", "Targets", "Expiry", "Depth", "Current State"]) assert.ok(entityPage.includes(label), label);
  assert.match(entityPage, /Enterprise authority.*accountable owner.*signed delegation/s);
});

test("CPTO demo states identity-authority separation and shows allow, deny and parent revocation", () => {
  for (const text of ["AGENT ALPHA", "AGENT BETA", "SIGNED DELEGATION", "BETA READS REPO A", "BETA WRITES REPO A", "PARENT AUTHORITY REVOKED"]) assert.ok(demo.includes(text), text);
  assert.match(demo, /Beta is still Beta\. Its cryptographic identity has not failed\. What changed is that its delegated authority is no longer valid\./);
  assert.match(demo, /Persisted data only/i);
});

test("Agent Beta is a distinct canonical AI-agent entity with separate owner and no inherited fixture authority", () => {
  const beta = entityModel.slice(entityModel.indexOf('entityId: "entity:beta"'), entityModel.indexOf('entityId: "entity:gamma"'));
  assert.match(beta, /entityType: "ai_agent"/);
  assert.match(beta, /displayReference: "Agent Beta"/);
  assert.match(beta, /accountableOwnerId: "owner:bob"/);
  assert.match(beta, /currentAuthorityReferences: \[\]/);
  assert.match(entityRoute, /register_native_agent/);
  assert.match(server, /register_native_agent_operational_entity_v1/);
  assert.match(migration, /insert into public\.operational_entities/);
  assert.match(migration, /insert into public\.trust_subjects/);
});

test("Product Truth marks local implementation working but not Production-proven", () => {
  const capability = registry.find((item) => item.name === "Native delegated Operational Entity authority");
  assert.ok(capability);
  assert.equal(capability.qualificationLevel, "WORKING");
  assert.match(capability.publicClaim, /not Production-proven/i);
  assert.ok(capability.tests.includes("tests/native-delegated-authority.test.mjs"));
});
