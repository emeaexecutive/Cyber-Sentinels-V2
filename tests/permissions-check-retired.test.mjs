import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../app/api/permissions/check/route.ts";

test("legacy permission endpoint cannot authorize caller-supplied approval signals", async () => {
  const request = new Request("https://app.example.test/api/permissions/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requested_action: "admin",
      policy_status: "approved",
      evidence_status: "complete",
      admin_approval_status: "approved",
      trust_score: 100,
    }),
  });

  const response = await POST(request);
  const body = await response.json();

  assert.equal(response.status, 410);
  assert.equal(body.error, "LEGACY_ADVISORY_ENDPOINT_RETIRED");
  assert.equal("decision" in body, false);
});