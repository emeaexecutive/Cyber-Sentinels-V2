import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const windowsOnly = process.platform === "win32" ? test : test.skip;

windowsOnly("audit runner continues after failure, writes all later stages, and aggregates exit code", () => {
  const fixture = mkdtempSync(join(tmpdir(), "cs-audit-resilience-"));
  const bin = join(fixture, "bin");
  for (const directory of [bin, join(fixture, "app", "api", "health"), join(fixture, "lib", "providers"), join(fixture, "lib", "identity-signals"), join(fixture, "supabase", "migrations")]) mkdirSync(directory, { recursive: true });
  writeFileSync(join(fixture, "package.json"), JSON.stringify({ name: "audit-fixture", version: "1.0.0", private: true, scripts: { lint: "fixture", typecheck: "fixture", test: "fixture", "test:providers": "fixture", "test:provider-rls": "fixture", build: "fixture" } }));
  writeFileSync(join(fixture, "package-lock.json"), JSON.stringify({ name: "audit-fixture", version: "1.0.0", lockfileVersion: 3, requires: true, packages: { "": { name: "audit-fixture", version: "1.0.0" } } }));
  writeFileSync(join(fixture, "app", "api", "health", "route.ts"), "export function GET() { return Response.json({ ok: true }); }\n");
  writeFileSync(join(fixture, "lib", "providers", "capability-truth.ts"), "export const providerCapabilityStates = [];\n");
  writeFileSync(join(fixture, "lib", "providers", "hopae-rc1-server.ts"), "export const hopae = true;\n");
  writeFileSync(join(fixture, "lib", "identity-signals", "adapters.ts"), "export const adapters = [];\n");
  const tables = ["identity_subjects", "identity_verification_requests", "identity_provider_capabilities", "identity_provider_transactions", "identity_signal_evidence", "identity_confidence_results", "identity_audit_events"];
  writeFileSync(join(fixture, "supabase", "migrations", "202607190001_identity.sql"), tables.map((name) => `create table public.${name}(id uuid);\nalter table public.${name} enable row level security;`).join("\n"));
  writeFileSync(join(bin, "npm.cmd"), "@echo off\r\nif \"%1\"==\"run\" if \"%2\"==\"lint\" (echo intentional lint failure 1>&2 & exit /b 7)\r\necho simulated npm %*\r\nexit /b 0\r\n");
  execFileSync("git", ["init", "-b", "main"], { cwd: fixture, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: fixture, stdio: "ignore" });

  const script = resolve("scripts/audit-cs-eng-002.ps1");
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-RepositoryPath", fixture, "-SkipInstall", "-SkipTests", "-SkipBuild", "-PauseAtEnd", "-NonInteractive"], { cwd: fixture, encoding: "utf8", timeout: 60_000, env: { ...process.env, PATH: `${bin};${process.env.PATH}`, CI: "true" } });
  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  const reports = readdirSync(join(fixture, "reports")).filter((name) => name.endsWith(".md"));
  assert.equal(reports.length, 1);
  const report = readFileSync(join(fixture, "reports", reports[0]), "utf8");
  const runner = readFileSync(script, "utf8");
  assert.match(report, /\| lint \| FAIL \|/);
  assert.match(report, /\| type-check \| PASS \|/);
  assert.match(report, /\| route inventory \| PASS \|/);
  assert.match(report, /\| provider inventory \| PASS \|/);
  assert.match(report, /\| migration and RLS inventory \| PASS \|/);
  assert.match(report, /\| secret scan \| PASS \|/);
  assert.match(report, /Final exit code: \*\*2\*\*/);
  const logDirectory = readdirSync(join(fixture, "reports")).find((name) => name.endsWith("-logs"));
  assert.match(readFileSync(join(fixture, "reports", logDirectory, "lint.log"), "utf8"), /intentional lint failure/);
  assert.equal((runner.match(/^\s*exit\s+/gim) ?? []).length, 1, "runner must have one aggregate exit only");
  assert.match(result.stdout, /report generation/);
});
