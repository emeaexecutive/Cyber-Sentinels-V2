import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("the exact demo path is linked and deterministic", () => {
  const demo = read("app/demo/page.tsx");
  const replay = read("app/replay/[id]/page.tsx");
  const receipt = read("app/trust/receipt/[id]/page.tsx");

  assert.match(demo, /\/replay\/demo/);
  assert.match(demo, /\/verification\/receipt\/demo/);
  assert.match(replay, /if \(id === "demo"\)\s*{\s*return <DemoReplay \/>/);
  assert.match(receipt, /if \(id === "demo"\)\s*{\s*return <DemoReceipt \/>/);
  assert.ok(replay.indexOf('if (id === "demo")') < replay.indexOf("createClient()"));
  assert.ok(receipt.indexOf('if (id === "demo")') < receipt.indexOf("createClient()"));
});

test("demo replay answers the six operational questions", () => {
  const replay = read("app/replay/[id]/page.tsx");

  for (const marker of [
    "Replay Timeline",
    "What changed",
    "Evidence available",
    "Reviewer",
    "Trust Posture",
    "30 Jun 2026",
  ]) {
    assert.match(replay, new RegExp(marker));
  }
  assert.match(replay, /simulated evidence/i);
  assert.match(replay, /not provider accuracy, biometric certainty/i);
});

test("demo receipt is evidence-first and explicitly synthetic", () => {
  const receipt = read("app/trust/receipt/[id]/page.tsx");

  assert.match(receipt, /DEMO-RECEIPT-001/);
  assert.match(receipt, /Evidence Chain/);
  assert.match(receipt, /Governance Review/);
  assert.match(receipt, /Simulated provider-response fixture/);
  assert.match(receipt, /does not prove identity, guarantee authenticity/);
});

test("provider runtime status uses only the four demo-safe states", () => {
  const page = read("app/admin/integrations/page.tsx");
  const api = read("app/api/providers/route.ts");

  for (const state of ["Live", "Simulated", "Awaiting credentials", "Disabled"]) {
    assert.match(page, new RegExp(state));
    assert.match(api, new RegExp(state));
  }
  assert.doesNotMatch(api, /return "real"|return "placeholder"|return "simulated"/);
});

test("homepage, auth affordances and admin protection remain locked", () => {
  const homepage = read("app/page.tsx");
  const login = read("app/login/page.tsx");
  const verifyEmail = read("app/verify-email/page.tsx");
  const layout = read("app/layout.tsx");
  const testLab = read("app/admin/test-lab/page.tsx");

  assert.match(homepage, /Operational trust for intelligent systems\./);
  assert.match(homepage, /Understand identity, authenticity and trust across every workflow\./);
  assert.doesNotMatch(homepage, /Private Beta|Enterprise Pilot Ready/i);
  for (const marker of ["Sign in", "Create account", "Confirm Password", "Use magic link", "Forgot password"]) {
    assert.match(login, new RegExp(marker, "i"));
  }
  assert.match(verifyEmail, /Please verify your email before continuing/);
  assert.match(layout, /Administrative access/i);
  assert.match(testLab, /requireAdminPageAccess/);
});

test("demo overview contains no early-stage beta notice", () => {
  const demo = read("app/demo/page.tsx");

  assert.doesNotMatch(demo, /PrivateBetaNotice|Private Beta|Controlled Preview/i);
});
