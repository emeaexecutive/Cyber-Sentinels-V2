import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../app/api/restricted-preview/v1/execute/route.ts";

const original = { ...process.env };

test.afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in original)) delete process.env[key];
  }
  Object.assign(process.env, original);
});

test("restricted Preview route is disabled unless explicitly enabled", async () => {
  delete process.env.RESTRICTED_PREVIEW_ENABLED;
  const response = await POST(new Request("https://preview.example.test/api/restricted-preview/v1/execute", {
    method: "POST",
    headers: {
      authorization: "Bearer invalid",
      "content-type": "application/json",
      "x-acceptance-run-id": "run:synthetic",
    },
    body: JSON.stringify({ operation: "qualification.schema.read", payload: {} }),
  }));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "GATEWAY_NOT_ENABLED" });
});

test("restricted Preview route rejects non-preview environments", async () => {
  process.env.RESTRICTED_PREVIEW_ENABLED = "true";
  process.env.VERCEL_ENV = "production";
  const response = await POST(new Request("https://preview.example.test/api/restricted-preview/v1/execute", {
    method: "POST",
    headers: {
      authorization: "Bearer invalid",
      "content-type": "application/json",
      "x-acceptance-run-id": "run:synthetic",
    },
    body: JSON.stringify({ operation: "qualification.schema.read", payload: {} }),
  }));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "GATEWAY_PREVIEW_ONLY" });
});

test("restricted Preview route rejects malformed transport requests", async () => {
  delete process.env.RESTRICTED_PREVIEW_ENABLED;
  const response = await POST(new Request("https://preview.example.test/api/restricted-preview/v1/execute", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "not-json",
  }));
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: "CONTENT_TYPE_INVALID" });
});
