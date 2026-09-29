import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../app/api/badges/verify/route.ts";

test("public badge verification never returns demonstration trust for an arbitrary subject", async () => {
  for (const badge of ["unknown", "verified-human"]) {
    const response = await POST(new Request("https://example.test/api/badges/verify", {
      method: "POST", body: JSON.stringify({ badge_id: badge, subject_id: "unverified-subject" }),
    }));
    assert.equal(response.status, 501);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.code, "BADGE_VERIFICATION_NOT_CONFIGURED");
    assert.equal(body.trust_score, undefined);
    assert.equal(body.badge_status, undefined);
  }
});

test("badge endpoint retains input validation while disabled", async () => {
  for (const body of ["invalid", "null", "{}", JSON.stringify({ badge_id: "x", subject_id: "x".repeat(161) })]) {
    assert.equal((await POST(new Request("https://example.test/api/badges/verify", { method: "POST", body }))).status, 400);
  }
});
