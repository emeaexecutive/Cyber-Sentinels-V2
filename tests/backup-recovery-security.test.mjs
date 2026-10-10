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