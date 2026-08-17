import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260814124644_customer_workspace_bootstrap.sql", "utf8");
const bootstrap = readFileSync("lib/onboarding/customer-workspace.ts", "utf8");
const page = readFileSync("app/operational-entities/page.tsx", "utf8");

test("workspace bootstrap is tenant scoped, atomic and concurrency safe", () => {
  assert.match(migration, /unique index if not exists workspace_members_workspace_user_uidx/i);
  assert.match(migration, /after insert on public\.trust_workspaces/i);
  assert.match(migration, /on conflict \(workspace_id, user_id\)/i);
  assert.match(migration, /private\.establish_workspace_owner_membership/i);
  assert.match(bootstrap, /created_by: user\.id/);
  assert.match(bootstrap, /customer-\$\{userId\.toLowerCase\(\)\}/);
  assert.match(bootstrap, /created\.error\.code !== "23505"/);
  assert.doesNotMatch(bootstrap, /service.role|service_role|createServiceRoleClient/i);
});

test("empty and failed workspace states remain truthful", () => {
  assert.match(page, /Create your first Operational Entity/);
  assert.match(page, /identity, authority and trust remain unverified/i);
  assert.match(page, /Support reference:/);
  assert.doesNotMatch(page, /initializeControlledAgentAlpha/);
});
