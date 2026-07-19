import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../../supabase/migrations/202607190001_identity_signal_engine.sql", import.meta.url), "utf8");
const runtimeMigration = await readFile(new URL("../../supabase/migrations/202607190002_identity_signal_runtime.sql", import.meta.url), "utf8");
const tables = ["identity_subjects","identity_verification_requests","identity_provider_capabilities","identity_signal_evidence","identity_confidence_results","identity_provider_transactions","identity_audit_events"];

test("every Identity Signal Engine table enables RLS and denies anonymous access", () => {
  for (const table of tables) {
    assert.match(migration, new RegExp(`'${table}'`));
  }
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on public\.%I from anon, authenticated/i);
});

test("tenant-facing reads use trusted workspace membership and service-only writes", () => {
  for (const table of ["identity_subjects","identity_verification_requests","identity_provider_transactions","identity_signal_evidence","identity_confidence_results","identity_audit_events"]) {
    assert.match(migration, new RegExp(`tenant members read ${table.replaceAll("_", " ")}`, "i"));
  }
  assert.match(migration, /user_can_access_trust_workspace\(enterprise_id\)/);
  assert.doesNotMatch(migration, /grant insert[^;]+authenticated/i);
  assert.match(migration, /grant all privileges on public\.%I to service_role/i);
});

test("identity audit history is append-only and raw provider data is prohibited", () => {
  assert.match(migration, /Identity audit events are append-only/);
  assert.match(migration, /before update or delete/);
  assert.doesNotMatch(migration, /^\s+(raw_payload|raw_proof|client_secret|webhook_secret)\s+/im);
  assert.doesNotMatch(runtimeMigration, /^\s+(raw_payload|raw_proof|client_secret|webhook_secret)\s+/im);
});

test("runtime migration enforces scoped idempotency, provider uniqueness, and tenant-safe relationships", () => {
  assert.match(runtimeMigration, /enterprise_id, operation, idempotency_key/i);
  assert.match(runtimeMigration, /identity_provider_event_unique_idx/i);
  assert.match(runtimeMigration, /identity_provider_transaction_unique_idx/i);
  assert.match(runtimeMigration, /foreign key \(enterprise_id, subject_id\)/i);
  assert.match(runtimeMigration, /foreign key \(enterprise_id, verification_request_id\)/i);
  assert.match(runtimeMigration, /identity_provider_capabilities add constraint identity_provider_capabilities_id_pkey primary key \(id\)/i);
  assert.match(runtimeMigration, /identity_provider_capability_scope_unique_idx/i);
});

test("authorized operators can create requests while callbacks and capability mutation remain server controlled", () => {
  assert.match(runtimeMigration, /authorized operators create identity subjects/i);
  assert.match(runtimeMigration, /authorized operators create identity verification requests/i);
  assert.match(runtimeMigration, /identity_workspace_role\(enterprise_id\) in \('owner','admin','reviewer'\)/i);
  assert.doesNotMatch(runtimeMigration, /grant (insert|update|delete)[^;]+identity_(provider_transactions|signal_evidence|provider_capabilities|audit_events)[^;]+authenticated/i);
});

test("all required signal states and normalized evidence fields are constrained", () => {
  for (const status of ["PASS","FAIL","INCONCLUSIVE","UNAVAILABLE","UNSUPPORTED","BLOCKED","ERROR","PENDING"]) assert.match(runtimeMigration, new RegExp(`'${status}'`));
  for (const field of ["signature_verified","provider_event_id","provider_reference","payload_hash","normalized_value","provenance"]) assert.match(runtimeMigration, new RegExp(field));
  assert.equal((runtimeMigration.match(/do \$\$/gi) ?? []).length, (runtimeMigration.match(/end \$\$;/gi) ?? []).length);
});
