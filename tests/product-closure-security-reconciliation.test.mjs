import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260814153045_staging_product_closure_security_reconciliation.sql",
  "utf8",
);

test("workspace RLS has one non-recursive policy per operation", () => {
  assert.match(migration, /tenant members read trust workspaces/i);
  assert.match(migration, /user_can_access_trust_workspace\(id\)/i);
  assert.match(migration, /created_by = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /tenant members read workspace membership/i);
  assert.match(migration, /user_can_access_trust_workspace\(workspace_id\)/i);
  assert.match(migration, /having count\(\*\) > 1/i);
  assert.doesNotMatch(migration, /exists[\s\S]{0,160}workspace_members[\s\S]{0,160}trust_workspaces/i);
});

test("Data API grants and security definers are least privilege", () => {
  assert.match(migration, /revoke all on table public\.trust_workspaces from anon, authenticated/i);
  assert.match(migration, /grant select, insert, update on table public\.trust_workspaces to authenticated/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /procedure\.prosecdef/i);
  assert.match(migration, /revoke all on function %I\.%I\(%s\) from public, anon, authenticated/i);
  assert.match(migration, /identity_workspace_role[\s\S]*user_can_access_trust_workspace[\s\S]*user_has_trust_workspace_role/i);
});
