import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("global loading and error boundaries provide safe recovery states", () => {
  assert.equal(existsSync("app/loading.tsx"), true);
  assert.equal(existsSync("app/error.tsx"), true);

  const loading = read("app/loading.tsx");
  const error = read("app/error.tsx");
  assert.equal(loading.includes('aria-busy="true"'), true);
  assert.equal(loading.includes("No trust state is inferred"), true);
  assert.equal(error.includes("reset"), true);
  assert.equal(error.includes("without changing workflow trust state"), true);
  assert.equal(error.includes("error.message"), false);
});

test("governance writes surface database failures before redirecting", () => {
  const governance = read("app/dashboard/governance/page.tsx");
  assert.equal(
    governance.includes("policy_error=write_failed"),
    true
  );
  assert.equal(
    governance.includes("action_error=write_failed"),
    true
  );
});

test("replay API distinguishes lookup failure, missing record, and missing lineage", () => {
  const replay = read("app/api/replay/[id]/route.ts");
  assert.equal(replay.includes("replayError"), true);
  assert.equal(replay.includes("Replay lookup could not be completed."), true);
  assert.equal(replay.includes("Replay not found or access is not permitted."), true);
  assert.equal(replay.includes("Replay has no workflow subject reference."), true);
});

test("runtime validation covers core public and protected operational surfaces", () => {
  const runner = read("lib/runtime-validation/runner.ts");
  for (const route of [
    "/governance",
    "/verification-replay",
    "/verification-receipts",
    "/admin/test-lab",
    "/admin/integrations",
    "/admin/fake-actors",
    "/dashboard/governance",
    "/trust-replay",
    "/trust-algorithm",
  ]) {
    assert.equal(runner.includes(`"${route}"`), true, `Missing runtime route: ${route}`);
  }
});
