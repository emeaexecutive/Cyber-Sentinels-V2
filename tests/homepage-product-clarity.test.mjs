import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("homepage presents an action-led decision story with simple outcomes", () => {
  assert.match(source, /Before an AI agent acts, prove it has the authority to do so\./);
  assert.match(source, /ALLOW · REVIEW · DENY/);
  assert.match(source, /01 IDENTITY/);
  assert.match(source, /Trusted to do what\?/);
  assert.match(source, /DECIDE/);
  assert.match(source, /PROVE/);
  assert.match(source, /REPLAY/);
  assert.doesNotMatch(source, /Trust Narrative™|Trust Explanation™|Trust Confidence™|Trust Drift™|Trust Stability™|Trust Prediction™|Trust Recommendation™|Trust Advisor™|Trust Recovery™/);
});
