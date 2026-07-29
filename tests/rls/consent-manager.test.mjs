import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const migration = await readFile(new URL("../../supabase/migrations/202607200002_enterprise_trust_consent_manager.sql", import.meta.url), "utf8");
const trustEventFoundation = await readFile(new URL("../../supabase/migrations/202607200001_canonical_trust_event_foundation.sql", import.meta.url), "utf8");
const tables = ["consent_policy_versions","consent_categories","consent_purposes","consent_providers","consent_cookies","consent_tracker_catalogue","consent_preferences","consent_receipts","consent_events","consent_region_profiles","consent_audit_log"];
test("all consent tables use RLS and service-only mutation", () => { for (const table of tables) assert.match(migration,new RegExp(`'${table}'`)); assert.match(migration,/enable row level security/i); assert.match(migration,/revoke all on public\.%I from anon, authenticated/i); assert.doesNotMatch(migration,/grant (insert|update|delete)[^;]+authenticated/i); });
test("users read only their own consent state and anonymous access stays server controlled", () => { assert.match(migration,/users read own consent preferences[\s\S]*user_id=auth\.uid\(\)/i); assert.match(migration,/users read own consent receipts[\s\S]*user_id=auth\.uid\(\)/i); assert.match(migration,/user_can_access_trust_workspace/i); assert.doesNotMatch(migration,/to anon[\s\S]*using/i); });
test("receipt, timeline and audit history are append-only", () => { assert.match(migration,/consent_receipts_append_only/); assert.match(migration,/consent_events_append_only/); assert.match(migration,/consent_audit_append_only/); assert.match(migration,/Consent history is append-only/); });
test("unknown trackers cannot become Essential and raw IP storage is absent", () => { assert.match(migration,/unknown_trackers_not_essential/); assert.match(migration,/classification_status <> 'UNKNOWN' or category_key is null/); assert.doesNotMatch(migration,/\b(ip_address|raw_ip|full_ip)\b/i); });
test("receipt persistence is idempotent, transactional and appends a Trust Event", () => { assert.match(migration,/persist_consent_change_v1/); assert.match(migration,/existing\.request_hash=p_request_hash/); assert.match(migration,/DUPLICATE/); assert.match(migration,/CONFLICT/); assert.match(migration,/append_trust_event_v1/); assert.match(migration,/pg_advisory_xact_lock/); });
test("consent RPC dependencies, parameters, and stable result shape are migration-backed", () => {
  assert.match(trustEventFoundation, /create table if not exists public\.trust_event_chain_heads/);
  assert.match(trustEventFoundation, /create or replace function public\.append_trust_event_v1/);
  assert.match(migration, /persist_consent_change_v1\(p_receipt jsonb,p_subject_key text,p_idempotency_key text,p_request_hash text,p_trust_events jsonb,p_correlation_id uuid\)/);
  for (const table of ["consent_receipts", "consent_preferences", "consent_events", "consent_audit_log"]) {
    assert.match(migration, new RegExp(`(?:insert into|from) public\\.${table}`));
  }
  for (const field of ["status", "receiptId", "receiptHash", "expiresAt", "categories"]) {
    assert.match(migration, new RegExp(`'${field}'`));
  }
});
test("EEA, UK and unknown region rows use strict configuration", () => { assert.match(migration,/'EEA','\{"optionalDefault":false/); assert.match(migration,/'UK','\{"optionalDefault":false/); assert.match(migration,/'GLOBAL_DEFAULT','\{"optionalDefault":false/); });
