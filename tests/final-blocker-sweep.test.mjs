import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

test("forward Supabase policy changes use the canonical drift-detecting idempotency guard", () => {
  const migrationFiles = readdirSync("supabase/migrations")
    .filter((name) => name >= "202608010002" && name.endsWith(".sql"));
  const sql = migrationFiles.map((file) => read(`supabase/migrations/${file}`)).join("\n");
  assert.match(sql, /ensure_policy_definition_v1/);
  assert.match(sql, /Conflicting policy definition/);
  assert.match(sql, /return 'UNCHANGED'/);
  assert.doesNotMatch(sql, /drop policy if exists/i);
});

test("RLS policies do not trust user-controlled auth metadata", () => {
  const migrationFiles = readdirSync("supabase/migrations")
    .filter((name) => name.endsWith(".sql"));
  const sql = migrationFiles
    .map((file) => read(`supabase/migrations/${file}`))
    .join("\n");

  assert.equal(/user_metadata|raw_user_meta_data/i.test(sql), false);
});

test("forward RLS remediation replaces all nine unsafe Production admin policies", () => {
  const migration = read(
    "supabase/migrations/20260818075145_remove_user_metadata_rls_authorization.sql"
  );
  const protectedPolicies = [
    ["trust_assistant_questions", "admin manage trust_assistant_questions"],
    ["knowledge_articles", "admin manage knowledge_articles"],
    ["message_threads", "admin manage message_threads"],
    ["message_events", "admin manage message_events"],
    ["appeals", "admin manage appeals"],
    ["agents", "admin manage agents"],
    ["trust_events", "admin manage trust_events"],
    ["agent_permissions", "admin manage agent_permissions"],
    ["api_keys", "admin manage api_keys"],
  ];

  for (const [table, policy] of protectedPolicies) {
    assert.match(
      migration,
      new RegExp(
        `'public',\\s*'${table}',\\s*'${policy}'[\\s\\S]*?'intentional_replace'`
      )
    );
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`)
    );
  }

  assert.equal(
    (migration.match(/select public\.ensure_policy_definition_v2\(/g) ?? [])
      .length,
    9
  );
  assert.match(migration, /auth\.jwt\(\) -> ''app_metadata''/);
  assert.doesNotMatch(migration, /auth\.jwt\(\) -> ''user_metadata''/);
  assert.doesNotMatch(migration, /drop policy if exists/i);
  assert.match(migration, /schema_version IS DISTINCT FROM ''trust-event-v1''/);
});

test("main requires a controlled Vercel production release", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.equal(config.git?.deploymentEnabled?.main, false);
});

test("enterprise governance reconciles the legacy Production provenance shape", () => {
  const migration = read(
    "supabase/migrations/202606180001_enterprise_ai_trust_governance.sql"
  );
  const reconciliation = migration.indexOf(
    "alter table public.provenance_events\n  add column if not exists subject_type"
  );
  const subjectIndex = migration.indexOf(
    "create index if not exists provenance_events_subject_idx"
  );

  assert.ok(reconciliation >= 0);
  assert.ok(reconciliation < subjectIndex);
  assert.match(migration, /event_title = coalesce\(event_title, event_type\)/);
  assert.match(migration, /alert_title = coalesce\(alert_title, title\)/);
  assert.match(migration, /risk_level = coalesce\(risk_level, severity\)/);
  assert.doesNotMatch(migration, /drop column if exists event_detail/i);
  assert.doesNotMatch(migration, /drop column if exists report_id/i);
});

test("Hopae migration preserves and reconciles the legacy Production tables", () => {
  const migration = read(
    "supabase/migrations/202606190003_hopae_connect_upstream_identity.sql"
  );
  const reconciliation = migration.indexOf(
    "alter table public.hopae_verifications\n  add column if not exists owner_user_id"
  );
  const ownerIndex = migration.indexOf(
    "create index if not exists hopae_verifications_owner_idx"
  );

  assert.ok(reconciliation >= 0);
  assert.ok(reconciliation < ownerIndex);
  assert.match(migration, /owner_user_id = coalesce\(owner_user_id, user_id\)/);
  assert.match(migration, /raw_event = coalesce\(raw_event, payload\)/);
  assert.doesNotMatch(migration, /drop column if exists user_id/i);
  assert.doesNotMatch(migration, /drop column if exists payload/i);
});

test("continuous trust reuses the legacy zero-row signal table fail-closed", () => {
  const migration = read(
    "supabase/migrations/202607240003_continuous_trust_engine.sql"
  );

  assert.match(migration, /create table if not exists public\.trust_signals/);
  assert.match(migration, /add column if not exists tenant_id uuid/);
  assert.match(
    migration,
    /Legacy trust_signals rows require an explicit tenant-safe forward mapping/
  );
  assert.doesNotMatch(migration, /drop table(?: if exists)? public\.trust_signals/i);
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
