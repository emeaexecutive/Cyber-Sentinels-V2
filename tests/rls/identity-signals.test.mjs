import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../../supabase/migrations/202607190001_identity_signal_engine.sql", import.meta.url), "utf8");
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
});
