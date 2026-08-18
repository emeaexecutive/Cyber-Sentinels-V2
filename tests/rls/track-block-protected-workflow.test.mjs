import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../../supabase/migrations/20260817173631_track_block_protected_workflow.sql", import.meta.url), "utf8");
const canonical = readFileSync(new URL("../../supabase/migrations/202608060002_end_to_end_trust_transaction.sql", import.meta.url), "utf8");

test("Protected Workflow and interventions are tenant isolated under RLS", () => {
  assert.match(sql, /alter table public\.protected_workflows enable row level security/);
  assert.match(sql, /alter table public\.workflow_interventions enable row level security/);
  assert.match(sql, /ensure_policy_definition_v2/);
  assert.match(sql, /'user_can_access_trust_workspace\(workspace_id\)'/);
  assert.doesNotMatch(sql, /drop policy if exists/i);
  assert.match(sql, /foreign key\(workspace_id,workflow_id\) references public\.protected_workflows\(workspace_id,id\)/);
  assert.match(sql, /foreign key\(workspace_id,canonical_transaction_id\) references public\.canonical_trust_transactions\(enterprise_id,transaction_id\)/);
  assert.doesNotMatch(sql, /disable row level security/);
});

test("ordinary clients cannot inject evidence or interventions", () => {
  assert.match(sql, /revoke all on public\.protected_workflows,public\.workflow_interventions from anon,authenticated/);
  assert.match(sql, /grant select on public\.protected_workflows,public\.workflow_interventions to authenticated/);
  assert.doesNotMatch(sql, /grant insert on public\.(protected_workflows|workflow_interventions) to authenticated/);
});

test("Track + Block evidence and canonical decisions are immutable", () => {
  assert.match(sql, /if old\.source_type='PROTECTED_WORKFLOW_SIGNAL'/);
  assert.match(sql, /before update or delete on public\.evidence_objects/);
  assert.match(sql, /protect_canonical_decision_fields_v1/);
  assert.match(sql, /Canonical trust decision fields are immutable/);
  assert.match(canonical, /canonical_trust_transaction_events_append_only/);
});

test("schema adds no duplicate decision, evidence, Replay, Memory or registry", () => {
  for (const forbidden of ["track_block_decisions", "track_block_signals", "track_block_replay", "track_block_trust_memory", "track_block_identity_registry"]) assert.doesNotMatch(sql, new RegExp(`create table(?: if not exists)? public\\.${forbidden}`, "i"));
  assert.equal((sql.match(/create table(?: if not exists)? public\./g) ?? []).length, 2);
});
