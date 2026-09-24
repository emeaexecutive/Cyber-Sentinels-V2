import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { prepareMigrationContext } from "../tools/release/prepare-migration-context.mjs";

// Match a whole path component, including paths quoted in TOML, not `.template`.
const temporaryContextPath = /(?:^|[\\/"'\s])\.temp(?=$|[\\/"'\s])/m;

function removeTemporaryDirectory(directory, prefix) {
  const resolved = fs.realpathSync(directory);
  assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
  assert.ok(path.basename(resolved).startsWith(prefix));
  fs.rmSync(resolved, { recursive: true, force: true });
}

test("production migration context includes required config and template files", (t) => {
  const result = prepareMigrationContext("production");
  const root = result.workdir;
  t.after(() => removeTemporaryDirectory(root, "cyber-v1-production-"));

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
  assert.doesNotMatch(config, /project-ref|project_ref/);
  assert.doesNotMatch(config, temporaryContextPath);
});

test("temporary context validation identifies .temp path components only", () => {
  for (const value of [
    ".temp",
    ".temp/project-ref",
    "supabase/.temp/project-ref",
    "C:\\release\\supabase\\.temp\\project-ref",
    'content_path = "./supabase/.temp/recovery.html"',
    'workdir = ".temp"',
  ]) {
    assert.match(value, temporaryContextPath, value);
  }

  for (const value of [
    ".template",
    ".template/recovery.html",
    "supabase/.template/recovery.html",
    "C:\\release\\supabase\\.template\\recovery.html",
    "[auth.email.template.recovery]",
    'content_path = "./supabase/templates/.template/recovery.html"',
    "supabase/.temporary/recovery.html",
    "supabase/recovery.temp.html",
  ]) {
    assert.doesNotMatch(value, temporaryContextPath, value);
  }
});

test("context copies legitimate .template entries and excludes nested .temp entries", (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "cyber-context-test-"));
  t.after(() => removeTemporaryDirectory(fixture, "cyber-context-test-"));
  const config = '[auth.email.template.recovery]\ncontent_path = "./supabase/templates/.template/recovery.html"\n';

  for (const directory of [
    "migrations",
    "history/production",
    "templates/.temp",
    "templates/.template/.temp",
  ]) {
    fs.mkdirSync(path.join(fixture, "supabase", directory), { recursive: true });
  }
  fs.writeFileSync(path.join(fixture, "supabase", "config.toml"), config);
  fs.writeFileSync(path.join(fixture, "supabase/templates/.temp/project-ref"), "fixture-project");
  fs.writeFileSync(path.join(fixture, "supabase/templates/.template/.temp/project-ref"), "nested-fixture-project");
  fs.writeFileSync(path.join(fixture, "supabase/templates/.template/recovery.html"), "<p>Recovery template fixture</p>");

  const originalDirectory = process.cwd();
  let result;
  try {
    process.chdir(fixture);
    result = prepareMigrationContext("production");
  } finally {
    process.chdir(originalDirectory);
  }
  t.after(() => removeTemporaryDirectory(result.workdir, "cyber-v1-production-"));

  const copiedRoot = path.join(result.workdir, "supabase");
  assert.equal(fs.readFileSync(path.join(copiedRoot, "config.toml"), "utf8"), config);
  assert.equal(
    fs.readFileSync(path.join(copiedRoot, "templates/.template/recovery.html"), "utf8"),
    "<p>Recovery template fixture</p>",
  );
  assert.equal(fs.existsSync(path.join(copiedRoot, "templates/.temp")), false);
  assert.equal(fs.existsSync(path.join(copiedRoot, "templates/.template/.temp")), false);
  assert.doesNotMatch(config, temporaryContextPath);
});
