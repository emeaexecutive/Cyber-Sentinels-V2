import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("replay persistence fails closed and never reports an unrecorded save", () => {
  const replay = read("app/trust-replay/page.tsx");

  assert.match(replay, /const \{ error \} = await supabase\.from\("trust_replay_sessions"\)\.insert/);
  assert.match(replay, /params\.set\(error \? "replay_error" : "replay_saved", "1"\)/);
  assert.match(replay, /The underlying evidence was not changed/);
});

test("replay distinguishes unavailable sources from confirmed empty evidence", () => {
  const replay = read("app/trust-replay/page.tsx");

  assert.match(replay, /unavailableSources/);
  assert.match(replay, /Empty counts must not be treated as\s+confirmed absence/);
  assert.match(replay, /Replay operational snapshot/);
  for (const label of [
    "Trust Posture",
    "Evidence Chain",
    "Governance Review",
    "Authorization Lineage",
    "Session Integrity",
  ]) {
    assert.match(replay, new RegExp(label));
  }
});

test("replay does not fabricate provider-backed evidence from activity counts", () => {
  const replay = read("app/trust-replay/page.tsx");
  const panel = read("components/provider-evidence-panel.tsx");

  assert.doesNotMatch(replay, /identityConfidence:\s*snapshot\.evidence\.length/);
  assert.doesNotMatch(replay, /sessionIntegrity:\s*sessionIntegrity\.length/);
  assert.match(replay, /Array\.isArray\(metadata\.provider_signals\)/);
  assert.match(panel, /Workflow evidence context/);
  assert.match(panel, /does not infer a live provider result/);
});

test("deployment environment and admin boundaries remain fail closed", () => {
  const env = read("lib/env.ts");
  const adminPage = read("app/admin/integrations/page.tsx");
  const adminApi = read("app/api/admin/reviews/route.ts");

  assert.match(env, /throw new Error\(\s*`Missing required environment variables/);
  assert.match(adminPage, /requireAdminPageAccess/);
  assert.match(adminApi, /requireAdminApiAccess/);
});

test("homepage keeps exact positioning and strengthened wordmark without beta language", () => {
  const homepage = read("app/page.tsx");
  const styles = read("app/globals.css");

  assert.match(homepage, /Operational trust for intelligent systems\./);
  assert.match(homepage, /Understand identity, authenticity and trust across every workflow\./);
  assert.doesNotMatch(homepage, /Private Beta|Enterprise Pilot Ready/i);
  assert.match(styles, /\.brand-wordmark/);
  assert.match(styles, /font-weight:\s*800/);
});
