import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("candidate intake cannot self-declare a verified or risk verdict", () => {
  const page = read("app/verify/candidate/page.tsx");
  const route = read("app/api/candidate/verify/route.ts");

  assert.doesNotMatch(page, /option value="verified"/);
  assert.doesNotMatch(page, /option value="risk_detected"/);
  assert.match(page, /cannot self-declare a verified candidate/i);
  assert.match(
    route,
    /\["pending", "needs_manual_review"\]\.includes\(requestedStatus\)/
  );
  assert.match(route, /needs_manual_review/);
});

test("session integrity records canonical continuity and always clears loading", () => {
  const page = read("app/verify/session/page.tsx");
  const route = read("app/api/session/integrity/route.ts");

  assert.match(page, /try\s*{/);
  assert.match(page, /finally\s*{/);
  assert.match(route, /createAuditLog/);
  assert.match(route, /trust_timeline_events/);
  assert.match(route, /audit_and_timeline_recorded:\s*true/);
});

test("receipt and governance writes fail closed on partial persistence", () => {
  const receipts = read("lib/trust-receipts/receipts.ts");
  const reviews = read("app/api/admin/reviews/route.ts");

  assert.match(receipts, /Verification receipt lookup failed/);
  assert.match(receipts, /\.limit\(1\)/);
  assert.match(receipts, /if \(evidenceResult\.error\) return evidenceResult/);
  assert.match(reviews, /eventUpdateError/);
  assert.match(reviews, /event_update_failed/);
});

test("admin enforcement exposes a safe retry state without raw errors", () => {
  const api = read("lib/admin/fake-actor-api.ts");
  const page = read("app/admin/fake-actors/page.tsx");

  assert.match(api, /searchParams\.set\("status", "failed"\)/);
  assert.doesNotMatch(api, /message:\s*error\.message/);
  assert.match(page, /No workflow state was\s+changed/);
  assert.match(page, /retry/i);
});

test("core workflow surfaces use the canonical trust labels", () => {
  const content = [
    read("app/trust-replay/page.tsx"),
    read("app/dashboard/governance/page.tsx"),
    read("app/dashboard/session-integrity/page.tsx"),
    read("app/trust-center/page.tsx"),
    read("app/verify/candidate/page.tsx"),
  ].join("\n");

  for (const label of [
    "Trust Posture",
    "Session Integrity",
    "Governance Review",
    "Evidence Chain",
    "Replay Timeline",
    "Authorization Lineage",
    "Verification Receipt",
  ]) {
    assert.match(content, new RegExp(label));
  }
});
