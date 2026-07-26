import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(
  new URL("../../supabase/migrations/202607240003_continuous_trust_engine.sql", import.meta.url),
  "utf8",
);

test("all EPIC 24 tables enable RLS and authenticated users are read-only", () => {
  assert.match(sql, /execute format\('alter table public\.%I enable row level security'/);
  for (const table of [
    "trust_signals",
    "trust_signal_processing",
    "trust_policy_decisions",
    "trust_processing_failures",
    "trust_manual_reviews",
    "trust_manual_review_history",
    "trust_alert_history",
    "trust_manual_overrides",
  ]) {
    assert.match(sql, new RegExp(`'${table}'`));
  }
  assert.match(sql, /execute format\('revoke all on public\.%I from anon,authenticated'/);
  assert.match(sql, /grant select on public\.trust_signals,public\.trust_signal_processing/);
  assert.doesNotMatch(sql, /grant (insert|update|delete).*authenticated/i);
});

test("tenant read policies delegate to the canonical workspace membership predicate", () => {
  for (const policy of [
    "tenant reads continuous trust signals",
    "tenant reads signal processing",
    "tenant reads signal policy decisions",
    "tenant reads manual reviews",
    "tenant reads alert history",
    "tenant reads manual overrides",
  ]) assert.match(sql, new RegExp(policy));
  assert.match(sql, /user_can_access_trust_workspace\(tenant_id\)/);
});

test("all mutation RPCs are service-role only and explicitly revoked from callers", () => {
  for (const fn of [
    "ingest_continuous_trust_signal_v1",
    "record_continuous_trust_signal_rejection_v1",
    "claim_continuous_trust_signal_v1",
    "claim_continuous_trust_jobs_v1",
    "project_continuous_trust_signal_v1",
    "finalize_continuous_trust_signal_v1",
    "fail_continuous_trust_signal_v1",
    "transition_continuous_trust_review_v1",
    "apply_continuous_trust_override_v1",
    "transition_continuous_trust_alert_v2",
  ]) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${fn}[^;]+to service_role`));
  }
  assert.match(sql, /if auth\.role\(\)<>'service_role'/);
});

test("signals and decision history are immutable while workflows use bounded transitions", () => {
  for (const trigger of [
    "trust_signals_append_only",
    "trust_policy_decisions_append_only",
    "trust_processing_failures_append_only",
    "trust_manual_review_history_append_only",
    "trust_alert_history_append_only",
    "trust_manual_overrides_append_only",
  ]) assert.match(sql, new RegExp(trigger));
  assert.match(sql, /prevent_trust_architecture_history_mutation/);
  assert.match(sql, /Invalid manual review transition/);
  assert.match(sql, /Invalid alert transition/);
});

test("privacy constraints and tenant-first indexes are enforced in SQL", () => {
  assert.ok(sql.includes("raw.?payload"));
  assert.ok(sql.includes("biometric"));
  assert.ok(sql.includes("precise.?location"));
  for (const index of [
    "trust_signals_entity_time_idx",
    "trust_signal_processing_queue_idx",
    "trust_manual_reviews_queue_idx",
  ]) assert.match(sql, new RegExp(index));
});

test("human-authorized positive signals cannot self-assert positive trust evidence", () => {
  const projection = sql.slice(
    sql.indexOf("create or replace function public.project_continuous_trust_signal_v1"),
    sql.indexOf("create or replace function public.finalize_continuous_trust_signal_v1"),
  );
  assert.match(projection, /when 'POSITIVE' then 'INCONCLUSIVE'/);
  assert.match(projection, /CONTINUOUS_TRUST_POSITIVE_SIGNAL_CONTEXT_ONLY/);
});
