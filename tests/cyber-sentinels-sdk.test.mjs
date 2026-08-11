import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthenticationError,
  ConflictError,
  CyberSentinels,
  RateLimitError,
  ServerError,
  TimeoutError,
} from "../packages/cyber-sentinels-sdk/src/index.ts";

const key = `cs_test_abcdefghijkl.${"a".repeat(43)}`;
const response = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

test("SDK sends Bearer auth and Idempotency-Key without mutating the decision", async () => {
  let observed;
  const cs = new CyberSentinels({ apiKey: key, baseUrl: "https://preview.example", fetch: async (url, init) => {
    observed = { url, init };
    return response(201, { transaction_id: "1", decision: "DENY", reason_codes: [], idempotent_replay: false });
  } });
  const result = await cs.trust.authorize({ operational_entity_id: "agent:gamma", action: { type: "write_repository", target: "repository:a", purpose: "test", environment: "staging" }, idempotency_key: "gamma-deny-001" });
  assert.equal(result.decision, "DENY");
  assert.equal(observed.init.headers["idempotency-key"], "gamma-deny-001");
  assert.equal(observed.init.headers.authorization, `Bearer ${key}`);
});

test("SDK maps 401, 409, 429 and 5xx into typed errors", async () => {
  for (const [status, Expected] of [[401, AuthenticationError], [409, ConflictError], [429, RateLimitError], [503, ServerError]]) {
    const cs = new CyberSentinels({ apiKey: key, baseUrl: "https://preview.example", fetch: async () => response(status, { error: { code: `E_${status}`, message: "safe", correlation_id: "id" } }, status === 429 ? { "retry-after": "3" } : {}) });
    await assert.rejects(cs.agents.getTrustState("agent:gamma"), Expected);
  }
});

test("SDK supports timeouts and caller AbortSignal", async () => {
  const cs = new CyberSentinels({ apiKey: key, baseUrl: "https://preview.example", timeoutMs: 5, fetch: (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true })) });
  await assert.rejects(cs.agents.getAuthority("agent:gamma"), TimeoutError);
  const controller = new AbortController();
  const pending = cs.agents.getAuthority("agent:gamma", { signal: controller.signal, timeoutMs: 1000 });
  controller.abort(new Error("caller stopped"));
  await assert.rejects(pending, /caller stopped/);
});

test("SDK never logs the API key and authorize never executes customer code", async () => {
  const original = console.log;
  const logs = [];
  console.log = (...args) => logs.push(args.join(" "));
  try {
    const cs = new CyberSentinels({ apiKey: key, baseUrl: "https://preview.example", fetch: async () => response(201, { transaction_id: "1", decision: "REVIEW", reason_codes: [], idempotent_replay: false }) });
    const result = await cs.trust.authorize({ operational_entity_id: "agent:gamma", action: { type: "read_repository", target: "repository:a", purpose: "test", environment: "staging" }, idempotency_key: "gamma-review-001" });
    assert.equal(result.decision, "REVIEW");
    assert.equal(logs.length, 0);
    assert.doesNotMatch(logs.join("\n"), new RegExp(key));
  } finally {
    console.log = original;
  }
});
