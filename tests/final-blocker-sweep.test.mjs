import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("every literal Supabase policy creation has an idempotent drop guard", () => {
  const migrationFiles = readdirSync("supabase/migrations")
    .filter((name) => name.endsWith(".sql"));
  const unguarded = [];

  for (const file of migrationFiles) {
    const sql = read(`supabase/migrations/${file}`);
    for (const match of sql.matchAll(/create\s+policy\s+"([^"]+)"/gi)) {
      const escaped = match[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const guard = new RegExp(
        `drop\\s+policy\\s+if\\s+exists\\s+"${escaped}"`,
        "i"
      );
      if (!guard.test(sql)) unguarded.push(`${file}: ${match[1]}`);
    }
  }

  assert.deepEqual(unguarded, []);
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
