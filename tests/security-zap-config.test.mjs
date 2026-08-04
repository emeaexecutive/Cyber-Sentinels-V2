import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { spawnSync } from "node:child_process";

test("staging ZAP runner refuses production aliases", () => {
  const result = spawnSync("node", ["scripts/security-zap-staging.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, ZAP_TARGET: "www.cybersentinels.com" },
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refusing unsafe ZAP target/i);
});

test("staging ZAP runner accepts a staging-only target", () => {
  const result = spawnSync("node", ["scripts/security-zap-staging.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, ZAP_TARGET: "staging.cybersentinels.example" },
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Staging ZAP plan accepted/i);
});

test("staging ZAP plan enforces a passive guard", async () => {
  const plan = await readFile(new URL("../security/zap/staging-plan.yaml", import.meta.url), "utf8");
  assert.match(plan, /scanMode: passive/i);
  assert.match(plan, /allowHosts:/i);
});
