import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/202608090002_native_enforcement_outcome_proof.sql", "utf8");
const core = readFileSync("lib/operational-entities/native-enforcement.ts", "utf8");
const server = readFileSync("lib/operational-entities/native-enforcement-server.ts", "utf8");
const route = readFileSync("app/api/operational-entities/[entityId]/enforcement/route.ts", "utf8");
const delegationServer = readFileSync("lib/operational-entities/delegated-authority-server.ts", "utf8");

test("decision, request, acknowledgement, claim, observation, contradiction and outcome remain separate records", () => {
  for (const table of [
    "native_enforcement_decision_bindings", "native_enforcement_requests", "native_enforcement_acknowledgements",
    "native_execution_claims", "native_runtime_execution_observations", "native_destination_observations",
    "native_execution_contradictions", "native_enforcement_outcomes",
  ]) assert.match(migration, new RegExp(`create table public\\.${table} \\(`));
  assert.match(migration, /evaluation\.decision<>'ALLOW' or tx\.decision<>'ALLOW'/);
  assert.match(migration, /ALLOW is never represented as proof of execution/);
});

test("Controlled Repository A is a separate, bounded destination with two actions", () => {
  assert.match(migration, /create table public\.controlled_destination_records/);
  assert.match(migration, /destination_id='controlled-repository-a'/);
  assert.match(migration, /action in \('READ','WRITE_TEST_RECORD'\)/);
  assert.match(migration, /target in \('repository:a','controlled-repository-a'\)/);
  assert.match(migration, /unique\(enterprise_id,destination_id,idempotency_key\)/);
  assert.match(server, /controlled_destination_records/);
  assert.match(server, /stored\.error && stored\.error\.code !== "23505"/);
});

test("enforcement reservation is tenant-bound, serialized and revalidates stale trust state", () => {
  const fn = migration.slice(migration.indexOf("reserve_native_enforcement_request_v1"), migration.indexOf("persist_native_enforcement_correlation_v1"));
  assert.match(fn, /pg_advisory_xact_lock/);
  assert.match(server, /String\(data\.status\) === "DUPLICATE"/);
  assert.match(server, /Concurrent enforcement reservation retrieval/);
  assert.match(fn, /evaluation\.decision<>'ALLOW' or tx\.decision<>'ALLOW'/);
  assert.match(fn, /for update/gi);
  assert.match(fn, /delegation\.status<>'ACTIVE'/);
  assert.match(fn, /parent\.revocation_state<>'active'/);
  assert.match(fn, /verification\.runtime_binding<>'RUNTIME_MATCH'/);
  assert.match(fn, /continuity_fingerprint<>expected_fingerprint/);
  assert.match(fn, /HUMAN_APPROVAL_REQUIRED/);
  assert.match(fn, /CANCELLED_AUTHORITY_CHANGED/);
  assert.match(fn, /CANCELLED_RUNTIME_CHANGED/);
});

test("DENY produces no enforcement request in both core and database boundary", () => {
  assert.match(core, /if \(input\.decision !== "ALLOW"\) return \{ requested: false, request: null/);
  assert.match(migration, /DENY or REVIEW cannot create an enforcement request/);
  assert.doesNotMatch(server, /decision:\s*"ALLOW"/);
});

test("outcome correlation opens an existing serious-incident lineage and material Trust Memory on execution after DENY", () => {
  const fn = migration.slice(migration.indexOf("persist_native_enforcement_correlation_v1"));
  assert.match(fn, /CONTROL_FAILURE_CRITICAL/);
  assert.match(fn, /insert into public\.incident_regulatory_assessments/);
  assert.match(fn, /insert into public\.incident_chronology_events/);
  assert.match(fn, /EXECUTION_OCCURRED_AFTER_DENY/);
  assert.match(fn, /insert into public\.trust_memory_index/);
  assert.match(fn, /NATIVE_OUTCOME_CORRELATED/);
});

test("all enforcement evidence is tenant-readable only and service-role writable", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.%I from public,anon,authenticated/);
  assert.match(migration, /grant select on public\.%I to authenticated/);
  assert.match(migration, /user_can_access_trust_workspace\(enterprise_id\)/);
  assert.match(migration, /prevent_trust_architecture_history_mutation/);
  assert.match(migration, /foreign key\(enterprise_id,transaction_id\) references public\.canonical_trust_transactions/);
  assert.match(migration, /foreign key\(enterprise_id,operational_entity_id\) references public\.operational_entities/);
});

test("authenticated API derives tenant and role, bounds bodies and exposes retrieval, ingestion and controlled failure proof", () => {
  assert.match(route, /resolveIdentityEnterprise\(request, \["owner", "admin", "reviewer", "observer"\]\)/);
  assert.match(route, /resolveIdentityEnterprise\(request, \["owner", "admin"\]\)/);
  assert.match(route, /MAX_BODY_BYTES = 131_072/);
  assert.match(route, /request_enforcement/);
  assert.match(route, /approve_enforcement/);
  assert.match(route, /ingest_destination_observation/);
  assert.match(route, /inject_control_failure/);
  assert.match(route, /private, no-store/);
  assert.doesNotMatch(route, /x-enterprise-id|x-actor-id/i);
});

test("high-consequence approval and Evidence Graph lineage are explicit product paths", () => {
  assert.match(server, /recordNativeEnforcementApproval/);
  assert.match(server, /lifetimeSeconds < 30 \|\| lifetimeSeconds > 900/);
  assert.match(server, /deriveEnforcementActionDigest/);
  assert.match(migration, /non_transferable boolean not null check\(non_transferable\)/);
  for (const edge of ["ENFORCEMENT_REQUESTED_FOR", "ACKNOWLEDGES_REQUEST", "CLAIMS_EXECUTION_OF", "RUNTIME_OBSERVED_EXECUTION", "DESTINATION_OBSERVED_EXECUTION", "OUTCOME_CORRELATED_FROM", "CONTROL_FAILURE_FOR"]) {
    assert.match(server + migration, new RegExp(edge));
  }
});

test("canonical delegated ALLOW is immutably bound before enforcement", () => {
  assert.match(delegationServer, /bind_native_enforcement_decision_v1/);
  assert.match(delegationServer, /p_evaluation_id: evaluationId/);
  assert.match(delegationServer, /p_transaction_id: receipt\.transactionId/);
  assert.match(migration, /unique\(enterprise_id,evaluation_id\)/);
  assert.match(migration, /unique\(enterprise_id,transaction_id\)/);
  assert.match(migration, /Canonical decision binding mismatch/);
});

test("algorithm registry identifiers and evidence integrity primitives are exact", () => {
  for (const version of ["enforcement-eligibility-v1", "execution-correlation-v1", "outcome-confirmation-v1"]) assert.match(core, new RegExp(version));
  assert.match(core, /createHmac\("sha256"/);
  assert.match(core, /timingSafeEqual/);
  assert.match(core, /DESTINATION_EVIDENCE_TAMPERED/);
  assert.match(core, /EXECUTION_UNCONFIRMED/);
  assert.match(core, /EXECUTION_EVIDENCE_CONFLICT/);
  assert.match(core, /EXECUTION_OCCURRED_AFTER_DENY/);
});
