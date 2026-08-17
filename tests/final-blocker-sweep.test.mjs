import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

test("forward Supabase policy changes use the canonical drift-detecting idempotency guard", () => {
  const migrationFiles = readdirSync("supabase/migrations")
    .filter((name) => name >= "202608010002" && name.endsWith(".sql"));
  const reconciliation = "20260814153045_staging_product_closure_security_reconciliation.sql";
  const sql = migrationFiles
    .filter((file) => file !== reconciliation)
    .map((file) => read(`supabase/migrations/${file}`))
    .join("\n");
  assert.match(sql, /ensure_policy_definition_v1/);
  assert.match(sql, /Conflicting policy definition/);
  assert.match(sql, /return 'UNCHANGED'/);
  assert.doesNotMatch(sql, /drop policy if exists/i);

  // Product Closure intentionally removes a closed set of obsolete policy
  // copies after the canonical forward repair. Deletion cannot be represented
  // by ensure_policy_definition_v2, so keep the exception exact and audited.
  const cleanup = read(`supabase/migrations/${reconciliation}`);
  const droppedPolicies = [...cleanup.matchAll(/drop policy if exists "([^"]+)"/gi)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(droppedPolicies, [
    "authenticated manage trust_workspaces",
    "authenticated manage workspace_members",
    "authenticated users create own workspaces",
    "tenant members read trust workspaces",
    "tenant members read workspace membership",
    "users create owned trust workspaces",
    "workspace owners administer trust workspaces",
    "workspace owners and members read workspaces",
    "workspace owners and self add members",
    "workspace owners create membership",
    "workspace owners update members",
    "workspace owners update membership",
    "workspace owners update workspaces",
    "workspace participants read members",
  ]);
  assert.match(cleanup, /Workspace policy reconciliation left overlapping permissive policies/);
});

test("RLS policies do not trust user-controlled auth metadata", () => {
  const migrationFiles = readdirSync("supabase/migrations")
    .filter((name) => name.endsWith(".sql"));
  const sql = migrationFiles
    .map((file) => read(`supabase/migrations/${file}`))
    .join("\n");

  assert.equal(/user_metadata|raw_user_meta_data/i.test(sql), false);
});

test("trusted hiring owner columns and policy guards precede policy creation", () => {
  const sql = read("supabase/migrations/202606060001_trusted_hiring_mvp.sql");
  const addUserId = sql.indexOf(
    "alter table public.interview_sessions\nadd column if not exists user_id"
  );
  const enableRls = sql.indexOf(
    "alter table public.interview_sessions enable row level security"
  );
  const dropPolicy = sql.indexOf(
    'drop policy if exists "interview sessions owner select"'
  );
  const createPolicy = sql.indexOf(
    'create policy "interview sessions owner select"'
  );

  assert.ok(addUserId >= 0);
  assert.ok(addUserId < enableRls);
  assert.ok(enableRls < dropPolicy);
  assert.ok(dropPolicy < createPolicy);
});

test("public Platform navigation excludes authenticated operational routes", () => {
  const navigation = read("components/global-navigation.tsx");
  const publicBlock = navigation.match(
    /const publicPlatformDropdownLinks = \[([\s\S]*?)\n\];/
  )?.[1] ?? "";

  for (const protectedRoute of [
    "/trust/transparency",
    "/trust-center",
    "/trust-posture",
    "/agents",
  ]) {
    assert.equal(
      publicBlock.includes(`"${protectedRoute}"`),
      false,
      `Public dropdown unexpectedly exposes ${protectedRoute}`
    );
  }
});
