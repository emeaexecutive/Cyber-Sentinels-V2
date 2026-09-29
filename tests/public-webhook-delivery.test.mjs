import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import test from "node:test";
import ts from "typescript";

const executable = ts.transpileModule(
  readFileSync(new URL("../lib/public-api/v1/webhook-delivery.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function harness({ configured = true, insertError = null, updateError = null, updateThrows = false, status = 200, fetchThrows = false,
  url = "https://destination.example/hook", fetchImplementation = null } = {}) {
  const calls = { inserted: [], fetched: [], updated: [], filters: [], issues: [] };
  const modules = {
    "server-only": {},
    "@/lib/supabase/service-role": { createServiceRoleClient: () => ({ from: (table) => {
      assert.equal(table, "public_api_webhook_events");
      return {
        insert: async (row) => { calls.inserted.push(row); return { error: insertError }; },
        update: (row) => {
          calls.updated.push(row);
          const query = {
            eq: (key, value) => { calls.filters.push([key, value]); return query; },
            then: (resolve, reject) => (updateThrows
              ? Promise.reject(new Error("sensitive-database-details"))
              : Promise.resolve({ error: updateError })).then(resolve, reject),
          };
          return query;
        },
      };
    } }) },
    "@/src/lib/trust-core/hash": { hashCanonical: () => "fixture-digest" },
    "@/lib/operational-monitoring": { captureOperationalIssue: (...args) => calls.issues.push(args) },
    "./webhooks": { signPublicWebhookPayload: () => "fixture-signature", publicWebhookBackoffSeconds: () => 30 },
  };
  const loaded = { exports: {} };
  new Function("require", "module", "exports", "process", "fetch", executable)(
    (name) => { assert.ok(Object.hasOwn(modules, name)); return modules[name]; }, loaded, loaded.exports,
    { env: configured ? { PUBLIC_API_WEBHOOK_URL: url, PUBLIC_API_WEBHOOK_SECRET: "fixture-only" } : {} },
    async (...args) => {
      calls.fetched.push(args);
      if (fetchImplementation) return fetchImplementation(...args);
      if (fetchThrows) throw new Error("sensitive-transport-details");
      return { ok: status >= 200 && status < 300, status };
    },
  );
  return { calls, run: () => loaded.exports.emitPublicApiWebhookEvent("tenant-fixture", "decision.created", "subject-fixture") };
}

test("failed event persistence is visible and prevents delivery without logging database details", async () => {
  const h = harness({ insertError: { code: "XX000", message: "sensitive-database-details" } });
  await h.run();
  assert.equal(h.calls.fetched.length, 0);
  assert.equal(h.calls.updated.length, 0);
  assert.equal(h.calls.issues[0][2], "WEBHOOK_EVENT_PERSISTENCE_FAILED");
  assert.equal(h.calls.issues[0][3].error_code, "XX000");
  assert.doesNotMatch(JSON.stringify(h.calls.issues), /sensitive/);
});

test("duplicate and unconfigured events never dispatch", async () => {
  for (const options of [{ insertError: { code: "23505" } }, { configured: false }]) {
    const h = harness(options);
    await h.run();
    assert.equal(h.calls.fetched.length, 0);
    assert.equal(h.calls.updated.length, 0);
    assert.equal(h.calls.issues.length, 0);
    if (options.configured === false) assert.equal(h.calls.inserted[0].delivery_state, "NOT_CONFIGURED");
  }
});

test("transport rejection remains queued, observable and scoped to its tenant", async () => {
  const h = harness({ status: 503 });
  await h.run();
  assert.equal(h.calls.fetched.length, 1);
  assert.equal(h.calls.updated[0].delivery_state, "QUEUED");
  assert.equal(h.calls.updated[0].attempt_count, 1);
  assert.ok(h.calls.updated[0].next_attempt_at);
  assert.deepEqual(h.calls.filters, [["event_id", h.calls.inserted[0].event_id], ["tenant_id", "tenant-fixture"]]);
  assert.equal(h.calls.issues[0][2], "WEBHOOK_DELIVERY_REJECTED");
  assert.equal(h.calls.issues[0][3].http_status, 503);
});

test("unknown transport failure is recorded without leaking the exception", async () => {
  const h = harness({ fetchThrows: true });
  await h.run();
  assert.equal(h.calls.updated[0].delivery_state, "QUEUED");
  assert.equal(h.calls.issues[0][2], "WEBHOOK_DELIVERY_UNCONFIRMED");
  assert.doesNotMatch(JSON.stringify(h.calls.issues), /sensitive|fixture-only|destination\.example/);
});

test("acknowledgement followed by state persistence failure never dispatches twice", async () => {
  for (const options of [{ updateError: { code: "bad-sensitive-code" } }, { updateThrows: true }]) {
    const h = harness(options);
    await h.run();
    assert.equal(h.calls.fetched.length, 1);
    assert.equal(h.calls.updated.length, 1);
    assert.equal(h.calls.updated[0].delivery_state, "DELIVERED");
    assert.equal(h.calls.updated[0].next_attempt_at, null);
    assert.equal(h.calls.issues[0][2], "WEBHOOK_DELIVERY_STATE_FAILED");
    assert.equal(h.calls.issues[0][3].transport_acknowledged, true);
    assert.equal(h.calls.issues[0][3].error_code, "UNKNOWN");
    assert.doesNotMatch(JSON.stringify(h.calls.issues), /sensitive/);
  }
});

test("successful first delivery retains event identity and records its transport acknowledgement", async () => {
  const h = harness();
  await h.run();
  const request = h.calls.fetched[0][1];
  assert.equal(request.headers["idempotency-key"], h.calls.inserted[0].event_id);
  assert.equal(JSON.parse(request.body).event_id, h.calls.inserted[0].event_id);
  assert.equal(h.calls.updated[0].delivery_state, "DELIVERED");
  assert.equal(h.calls.issues.length, 0);
});

test("real HTTP redirects never forward signed events and remain queued with unconfirmed delivery", async () => {
  const redirectedRequests = [];
  const initialRequests = [];
  const otherOrigin = createServer((req, res) => {
    redirectedRequests.push({ method: req.method, headers: req.headers });
    req.resume();
    res.end("This unrelated destination must never receive the event");
  });
  const configuredOrigin = createServer((req, res) => {
    initialRequests.push({ method: req.method, signed: Boolean(req.headers["x-cyber-sentinels-signature"]) });
    req.resume();
    res.writeHead(Number(req.url.slice(1)), { location: `http://127.0.0.1:${otherOrigin.address().port}/unexpected` });
    res.end();
  });
  try {
    await Promise.all([otherOrigin, configuredOrigin].map((server) => new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))));
    for (const status of [301, 302, 303, 307, 308]) {
      const h = harness({
        url: `http://127.0.0.1:${configuredOrigin.address().port}/${status}`,
        fetchImplementation: globalThis.fetch,
      });
      await h.run();
      assert.equal(h.calls.fetched.length, 1);
      assert.equal(h.calls.updated.length, 1);
      assert.equal(h.calls.updated[0].delivery_state, "QUEUED", `${status} is not a delivery acknowledgement`);
      assert.equal(h.calls.updated[0].attempt_count, 1);
      assert.ok(h.calls.updated[0].next_attempt_at);
      assert.equal(h.calls.issues.length, 1);
      assert.equal(h.calls.issues[0][2], "WEBHOOK_DELIVERY_UNCONFIRMED");
      assert.doesNotMatch(JSON.stringify(h.calls.issues), /fixture-signature|fixture-only|127\.0\.0\.1/);
      assert.equal(redirectedRequests.length, 0, `${status} must not reach the redirected origin`);
    }
    assert.deepEqual(initialRequests, Array.from({ length: 5 }, () => ({ method: "POST", signed: true })));
  } finally {
    await Promise.all([otherOrigin, configuredOrigin].map((server) => new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    })));
  }
});
