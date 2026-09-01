#!/usr/bin/env node

import { performance } from "node:perf_hooks";

const productionHosts = new Set(["cybersentinels.com", "www.cybersentinels.com"]);
const baseUrl = String(process.env.CYBER_SENTINELS_BASE_URL ?? "").replace(/\/$/, "");
const apiKey = String(process.env.CYBER_SENTINELS_API_KEY ?? "");
const agentId = String(process.env.CYBER_SENTINELS_AGENT_ID ?? "");
const reviewReference = String(process.env.CYBER_SENTINELS_REVIEW_REFERENCE ?? "");
const vercelProtectionCookie = String(process.env.VERCEL_PROTECTION_COOKIE ?? "");
const iterations = boundedInteger(process.env.CYBER_SENTINELS_PERF_ITERATIONS, 5, 1, 20, "iterations");
const concurrency = boundedInteger(process.env.CYBER_SENTINELS_PERF_CONCURRENCY, 1, 1, 5, "concurrency");

if (process.argv.includes("--help")) {
  console.log(`Bounded non-Production V1 API performance harness

Required:
  CYBER_SENTINELS_BASE_URL       local, Preview, or Staging URL
  CYBER_SENTINELS_API_KEY        tenant-scoped test API key
  CYBER_SENTINELS_AGENT_ID       verified agent with read_repository authority

Optional:
  CYBER_SENTINELS_PERF_ITERATIONS  1..20 (default 5)
  CYBER_SENTINELS_PERF_CONCURRENCY 1..5  (default 1)
  CYBER_SENTINELS_REVIEW_REFERENCE Optional open/closed canonical review to measure read latency

The harness refuses Cyber Sentinels Production hosts and prints no credentials.`);
  process.exit(0);
}

if (process.versions.node.split(".")[0] !== "22") fail("NODE_22_REQUIRED");
if (!baseUrl || !apiKey || !agentId) fail("PERFORMANCE_ENV_REQUIRED");
if (/[\r\n;]/.test(vercelProtectionCookie)) fail("VERCEL_PROTECTION_COOKIE_INVALID");

let parsedBaseUrl;
try {
  parsedBaseUrl = new URL(baseUrl);
} catch {
  fail("BASE_URL_INVALID");
}
if (productionHosts.has(parsedBaseUrl.hostname.toLowerCase())) fail("PRODUCTION_LOAD_TEST_REFUSED");
if (parsedBaseUrl.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(parsedBaseUrl.hostname)) fail("HTTPS_REQUIRED");

const measurements = {
  authentication_and_agent_read: [],
  authority_retrieval: [],
  decision_evaluation_and_persistence: [],
  transaction_persistence_confirmation: [],
  receipt_retrieval: [],
  replay_retrieval: [],
  review_retrieval: [],
};

function boundedInteger(raw, fallback, minimum, maximum, name) {
  const value = raw === undefined || raw === "" ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) fail(`INVALID_${name.toUpperCase()}`);
  return value;
}

function fail(code) {
  console.error(code);
  process.exit(1);
}

async function timed(name, operation) {
  const started = performance.now();
  const value = await operation();
  measurements[name].push(performance.now() - started);
  return value;
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: "application/json",
      ...(vercelProtectionCookie ? { cookie: `_vercel_jwt=${vercelProtectionCookie}` } : {}),
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = body?.error?.code ?? `HTTP_${response.status}`;
    throw new Error(`REQUEST_FAILED:${response.status}:${code}`);
  }
  return body;
}

async function sample(index) {
  const correlationId = crypto.randomUUID();
  await timed("authentication_and_agent_read", () => request(`/api/v1/agents/${encodeURIComponent(agentId)}`, {
    headers: { "x-correlation-id": correlationId },
  }));
  await timed("authority_retrieval", () => request(`/api/v1/agents/${encodeURIComponent(agentId)}/authority`, {
    headers: { "x-correlation-id": correlationId },
  }));
  if (reviewReference) {
    await timed("review_retrieval", () => request(`/api/v1/reviews/${encodeURIComponent(reviewReference)}`, {
      headers: { "x-correlation-id": correlationId },
    }));
  }
  const idempotencyKey = `perf-${Date.now()}-${index}-${crypto.randomUUID()}`;
  const decision = await timed("decision_evaluation_and_persistence", () => request("/api/v1/trust/decisions", {
    method: "POST",
    headers: { "idempotency-key": idempotencyKey, "x-correlation-id": correlationId },
    body: JSON.stringify({
      operational_entity_id: agentId,
      action: {
        type: "read_repository",
        target: "repository:a",
        purpose: "deployment_evidence_review",
        environment: "staging",
      },
      idempotency_key: idempotencyKey,
    }),
  }));
  if (!decision.transaction_id) throw new Error("DECISION_TRANSACTION_ID_MISSING");
  const transactionId = encodeURIComponent(decision.transaction_id);
  await timed("transaction_persistence_confirmation", () => request(`/api/v1/trust/transactions/${transactionId}`, { headers: { "x-correlation-id": correlationId } }));
  await timed("receipt_retrieval", () => request(`/api/v1/trust/transactions/${transactionId}/receipt`, { headers: { "x-correlation-id": correlationId } }));
  await timed("replay_retrieval", () => request(`/api/v1/trust/transactions/${transactionId}/replay`, { headers: { "x-correlation-id": correlationId } }));
}

function percentile(values, quantile) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * quantile) - 1)];
}

async function main() {
  let cursor = 0;
  async function worker() {
    while (cursor < iterations) {
      const index = cursor;
      cursor += 1;
      await sample(index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, iterations) }, () => worker()));
  const result = Object.fromEntries(Object.entries(measurements).map(([name, values]) => [name, values.length ? {
    samples: values.length,
    p50_ms: Number(percentile(values, 0.50).toFixed(2)),
    p95_ms: Number(percentile(values, 0.95).toFixed(2)),
    p99_ms: Number(percentile(values, 0.99).toFixed(2)),
  } : { samples: 0, status: "NOT_MEASURED" }]));
  console.log(JSON.stringify({
    classification: "NON_PRODUCTION_BASELINE",
    target_origin: parsedBaseUrl.origin,
    iterations,
    concurrency,
    note: "HTTP measurements include network/runtime overhead. Decision evaluation and persistence are reported as one canonical operation; no production performance claim is made.",
    measurements: result,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "PERFORMANCE_HARNESS_FAILED");
  process.exitCode = 1;
});
