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
const requestedAt = "2026-08-20T08:00:00.000Z";
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

test("SDK exposes provider evidence, outcome, authority and verification facades over existing public routes", async () => {
  const requests = [];
  const cs = new CyberSentinels({ apiKey: key, baseUrl: "https://preview.example", fetch: async (url, init) => {
    requests.push({ url, init });
    return response(201, { ok: true });
  } });
  await cs.evidence.submit({ provider: { key: "self", class: "APPLICATION_SIGNAL", event_id: "sensor-1", finding: "OBSTACLE_PRESENT" }, type: "AGENT_ACTIVITY_LOG", subject: { type: "AI_AGENT", id: "agent:alpha" }, evidence: { vision: "clear", lidar: "obstacle" } });
  await cs.outcomes.submit({ transactionId: "10000000-0000-4000-8000-000000000001", outcome: "SUCCEEDED", evidence: { destination: "warehouse:zone-b", target: "pallet:123", reference: "destination:event-1" } });
  await cs.authority.get("agent:alpha");
  await cs.agents.get("agent:alpha");
  await cs.agents.verify("agent:alpha", { challenge_id: "10000000-0000-4000-8000-000000000002", credential_id: "credential:1", signature: "signature", signed_payload: { challenge_id: "10000000-0000-4000-8000-000000000002", enterprise_id: "10000000-0000-4000-8000-000000000003", operational_entity_id: "agent:alpha", nonce: "nonce", audience: "cyber-sentinels", issuer: "agent:alpha", subject: "agent:alpha", manifest_digest: "a".repeat(64), signing_key_id: "key:1", issued_at: requestedAt, expires_at: requestedAt, submitted_at: requestedAt } });
  assert.match(requests[0].url, /\/api\/v1\/evidence$/);
  assert.match(requests[1].url, /\/outcomes$/);
  assert.match(requests[2].url, /\/authority$/);
  assert.match(requests[3].url, /\/agents\/agent%3Aalpha$/);
  assert.match(requests[4].url, /\/proof$/);
});

test("SDK exposes the productized V1 aliases without removing compatibility methods", async () => {
  const requests = [];
  const cs = new CyberSentinels({ apiKey: key, baseUrl: "https://preview.example", fetch: async (url, init) => {
    requests.push({ url, init });
    return response(200, { transaction_id: "10000000-0000-4000-8000-000000000001", decision: "DENY", reason_codes: [] });
  } });
  await cs.agents.get("agent:alpha");
  await cs.agents.authority("agent:alpha");
  await cs.decisions.create({ operational_entity_id: "agent:alpha", action: { type: "write_repository", target: "repository:a", purpose: "test", environment: "staging" }, idempotency_key: "alias-test-001" });
  await cs.transactions.get("10000000-0000-4000-8000-000000000001");
  await cs.transactions.receipt("10000000-0000-4000-8000-000000000001");
  await cs.transactions.replay("10000000-0000-4000-8000-000000000001");
  assert.equal(requests.length, 6);
  assert.match(requests[2].url, /\/api\/v1\/trust\/decisions$/);
});

test("SDK rejects a response that advertises an incompatible V1 date", async () => {
  const cs = new CyberSentinels({ apiKey: key, baseUrl: "https://preview.example", fetch: async () => response(200, {}, { "x-cyber-sentinels-api-version": "2099-01-01" }) });
  await assert.rejects(cs.agents.get("agent:alpha"), (error) => error.code === "API_VERSION_MISMATCH");
});

test("SDK surfaces request, correlation, version, and rate-limit response metadata", async () => {
  let metadata;
  const cs = new CyberSentinels({ apiKey: key, baseUrl: "https://preview.example", fetch: async () => response(200, {}, {
    "x-request-id": "22222222-2222-4222-8222-222222222222",
    "x-correlation-id": "11111111-1111-4111-8111-111111111111",
    "x-cyber-sentinels-api-version": "2026-08-29",
    "x-ratelimit-limit": "240",
    "x-ratelimit-remaining": "239",
    "x-ratelimit-reset": "2026-08-29T10:01:00.000Z",
  }) });
  await cs.agents.get("agent:alpha", { onResponse: (value) => { metadata = value; } });
  assert.deepEqual(metadata, {
    status: 200,
    requestId: "22222222-2222-4222-8222-222222222222",
    correlationId: "11111111-1111-4111-8111-111111111111",
    apiVersion: "2026-08-29",
    rateLimit: { limit: 240, remaining: 239, resetAt: "2026-08-29T10:01:00.000Z", retryAfter: null },
  });
});

test("SDK defaults to the canonical non-redirecting Production origin", async () => {
  let observedUrl;
  const cs = new CyberSentinels({ apiKey: key, fetch: async (url) => {
    observedUrl = url;
    return response(200, {});
  } });
  await cs.agents.get("agent:alpha");
  assert.match(observedUrl, /^https:\/\/www\.cybersentinels\.com\/api\/v1\/agents\//);
});
