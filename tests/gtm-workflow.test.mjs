import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("GTM workflow keeps drafts unpublished and agent tools restricted", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/gtm/validate-workflow.mjs"],
    { cwd: repositoryRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /8 unpublished drafts, 6 restricted agents, USD 0 external spend/);
});
