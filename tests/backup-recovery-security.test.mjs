import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const wrapper = await readFile(new URL("../tools/release/backup-production.ps1", import.meta.url), "utf8");
const coordinator = await readFile(new URL("../tools/release/backup-recovery-point.mjs", import.meta.url), "utf8");

test("backup wrapper keeps credentials out of capture artifacts and hands config over stdin", () => {
  assert.match(wrapper, /Read-Host .*AsSecureString/);
  assert.match(wrapper, /\$env:PGPASSWORD = \[Runtime\.InteropServices\.Marshal\]::PtrToStringBSTR/);
  assert.match(wrapper, /\$captureConfigJson \| & node .*backup-recovery-point\.mjs'\) --stdin/);
  assert.doesNotMatch(wrapper, /capture-config\.private\.json|Set-Content .*captureConfigPath/);
  assert.match(wrapper, /\$env:PGPASSWORD = \$previousPassword/);
});

test("capture coordinator rejects password-bearing configuration and requires sanitized release inventory", () => {
  assert.match(coordinator, /config\.database\?\.password/);
  assert.match(coordinator, /deploymentInventory\(config\.deploymentConfigurationInventory,releaseSha\)/);
  assert.match(coordinator, /A Production application release SHA is required/);
  assert.match(coordinator, /Deployment inventory may contain names and status only; values are forbidden/);
  assert.match(coordinator, /process\.argv\[2\]==='--stdin'\?await readStdin\(\)/);
  assert.doesNotMatch(coordinator, /capture-config\.private\.json/);
});
const { captureRecoveryPoint } = await import("../tools/release/backup-recovery-point.mjs");
const sha = "a".repeat(40);
const inventory = { provider: "vercel", environment: "production", deploymentId: "dpl_abc123", releaseSha: sha, capturedAt: "2026-10-11T00:00:00Z", configuration: [{ name: "SUPABASE_URL", configured: true, scope: "server" }] };
const base = { projectRef: "kecgtsfibkypjuaxqbjx", directory: ".", database: { host: "127.0.0.1" }, applicationReleaseSha: sha, deploymentConfigurationInventory: inventory };

test("capture preflight fails closed before any database connection", async () => {
  const cases = [
    [{ ...base, database: { host: "127.0.0.1", password: "x" } }, /PGPASSWORD/],
    [{ ...base, applicationReleaseSha: "abc" }, /release SHA is required/],
    [{ ...base, deploymentConfigurationInventory: { ...inventory, environment: "staging" } }, /binding is invalid/],
    [{ ...base, deploymentConfigurationInventory: { ...inventory, releaseSha: "b".repeat(40) } }, /binding is invalid/],
    [{ ...base, deploymentConfigurationInventory: { ...inventory, configuration: [{ name: "SUPABASE_URL", configured: true, value: "secret" }] } }, /values are forbidden/],
    [{ ...base, deploymentConfigurationInventory: { ...inventory, extra: 1 } }, /schema is invalid/],
  ];
  for (const [config, pattern] of cases) await assert.rejects(() => captureRecoveryPoint(config), pattern);
});

test("quiescence attestation template cannot validate as a real attestation", async () => {
  const template = JSON.parse(await readFile(new URL("../docs/operations/templates/production-write-quiescence-attestation.template.json", import.meta.url), "utf8"));
  assert.notEqual(template.projectRef, "kecgtsfibkypjuaxqbjx");
  assert.ok(!Number.isFinite(Date.parse(template.startsAt)) && !Number.isFinite(Date.parse(template.endsAt)));
});
