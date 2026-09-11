import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { prepareMigrationContext } from "../tools/release/prepare-migration-context.mjs";

test("production migration context includes required config and template files", () => {
  const result = prepareMigrationContext("production");
  const root = result.workdir;

  assert.ok(root, "context workdir should be returned");
  assert.ok(fs.existsSync(path.join(root, "supabase", "config.toml")), "config.toml should be copied");
  assert.ok(
    fs.existsSync(path.join(root, "supabase", "templates", "recovery.html")),
    "recovery email template should be copied",
  );
  assert.ok(
    fs.existsSync(path.join(root, "supabase", "migrations", "202609060001_world_id_durable_replay_guard.sql")),
    "World ID replay guard migration should be present",
  );
  assert.ok(
    fs.existsSync(path.join(root, "supabase", "migrations", "202609060002_world_id_replay_hardening.sql")),
    "World ID replay hardening migration should be present",
  );

  const config = fs.readFileSync(path.join(root, "supabase", "config.toml"), "utf8");
  assert.match(config, /content_path = ".\/supabase\/templates\/recovery\.html"/);
  assert.doesNotMatch(config, /project-ref|project_ref|\.temp/);
});
