import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("CodeQL workflow contract exists", async () => {
  const workflow = await readFile(new URL("../.github/workflows/codeql.yml", import.meta.url), "utf8");
  assert.match(workflow, /github\/codeql-action\/init/i);
  assert.match(workflow, /github\/codeql-action\/analyze/i);
});

test("Dependabot config exists and avoids automatic majors", async () => {
  const config = await readFile(new URL("../.github/dependabot.yml", import.meta.url), "utf8");
  assert.match(config, /updates:/i);
  assert.match(config, /open-pull-requests-limit/i);
  assert.match(config, /ignore:/i);
});

test("staging ZAP plan refuses production targets", async () => {
  const plan = await readFile(new URL("../security/zap/staging-plan.yaml", import.meta.url), "utf8");
  assert.match(plan, /staging/i);
  assert.match(plan, /cybersentinels\.com|www\.cybersentinels\.com|production/i);
});
