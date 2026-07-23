import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { node22FailureMessage, requireNode22 } from "../tools/release/node-version.ts";

test("Node guard accepts only major 22 and emits the required failure", () => {
  assert.equal(requireNode22("22.12.0"), "22.12.0");
  assert.throws(() => requireNode22("21.9.0"), { message: node22FailureMessage("21.9.0") });
  assert.throws(() => requireNode22("23.0.0"), /Release aborted\./);
});

test("release manager uses explicit process argument arrays and rejects unknown flags", async () => {
  const source = await readFile(new URL("../tools/release/release-manager.ts", import.meta.url), "utf8");
  assert.match(source, /spawnSync\(executable, args,/);
  assert.match(source, /shell: false/);
  assert.match(source, /dirname\(process\.execPath\).*delimiter/);
  assert.match(source, /env: childEnvironment/);
  assert.match(source, /Unknown release flag/);
  assert.match(source, /"audit", "--omit=dev", "--json"/);
  assert.match(source, /Critical production dependency advisories detected/);
  for (const flag of ["--full", "--migrate", "--skip-install", "--skip-build", "--dry-run", "--help"]) assert.match(source, new RegExp(flag));
  assert.doesNotMatch(source, /execSync|execFileSync\([^,]+\+|shell:\s*true/);
});

test("release manager generates all required reports on pass or failure paths", async () => {
  const source = await readFile(new URL("../tools/release/release-manager.ts", import.meta.url), "utf8");
  for (const report of ["DeploymentReport.md", "EnvironmentReport.md", "ConsentReport.md", "MigrationReport.md", "SecurityReport.md", "BuildReport.md", "TrustInfrastructureReport.md", "KnownIssues.md"]) assert.match(source, new RegExp(report.replace(".", "\\.")));
  assert.match(source, /finalReports\(options\)/);
  assert.match(source, /Overall \.{12} \$\{ready \? "READY" : "NOT READY"\}/);
});

test("PowerShell is a thin Node 22 launcher", async () => {
  const launcher = await readFile(new URL("../scripts/release-node22.ps1", import.meta.url), "utf8");
  assert.match(launcher, /npm\.Source run release -- @ReleaseArguments/);
  assert.match(launcher, /exit \$releaseExitCode/);
  assert.doesNotMatch(launcher, /npm ci|test:consent|supabase db|npm run build|npm run lint/);
});

test("migration verification SQL is read-only and covers release invariants", async () => {
  const sql = await readFile(new URL("../supabase/verification/production-verification.sql", import.meta.url), "utf8");
  assert.doesNotMatch(sql, /\b(insert|update|delete|alter|drop|create|truncate)\b/i);
  for (const token of ["pg_policies", "indisvalid", "candidate_profiles", "interview_sessions", "relrowsecurity", "trust_events", "evidence_objects", "trust_memory_index"]) assert.match(sql, new RegExp(token, "i"));
});

test("consent and candidate backfill safeguards remain intact", async () => {
  const manager = await readFile(new URL("../src/components/consent/ConsentManager.tsx", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/202606090001_hiring_security_interview_integrity.sql", import.meta.url), "utf8");
  assert.match(manager, /const showConsentBanner = ready && decisionState === "undecided";/);
  assert.doesNotMatch(manager, /decisionState === "undecided" \|\| saving/);
  assert.match(migration, /information_schema\.columns[\s\S]*candidate_profile_id[\s\S]*execute \$sql\$/i);
  assert.doesNotMatch(migration, /add column if not exists candidate_profile_id/i);
});
