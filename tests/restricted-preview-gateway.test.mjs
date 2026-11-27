import assert from "node:assert/strict";
import test from "node:test";

import {
  issueRestrictedPreviewCapability,
  RestrictedPreviewGateway,
  RestrictedPreviewTestAdapter,
} from "../lib/qualification/restricted-preview-gateway.ts";
import { RestrictedPreviewClient } from "../lib/qualification/restricted-preview-client.ts";

const signingKey = "restricted-preview-test-signing-key-000000";
const tenantId = "tenant:synthetic-a";
const subjectId = "subject:synthetic-a";
const runId = "run:qualification-18";
const destination = "synthetic:restricted-preview";
const now = new Date("2026-11-20T12:00:00.000Z");

function capability(operation = "qualification.schema.read", overrides = {}) {
  return issueRestrictedPreviewCapability(signingKey, {
    audience: "cyber-sentinels:restricted-preview-gateway:v1",
    operationIds: [operation],
    tenantId,
    subjectId,
    runId,
    expiresAt: "2026-11-20T12:05:00.000Z",
    ...overrides,
  });
}

function fixture() {
  const audits = [];
  const adapter = new RestrictedPreviewTestAdapter();
  const gateway = new RestrictedPreviewGateway({
    signingKey,
    allowedTenantIds: [tenantId],
    allowedSubjectIds: [subjectId],
    allowedRunIds: [runId],
    allowedDestinations: [destination],
    audit: async (record) => audits.push(record),
    adapter,
    now: () => now,
  });
  return { audits, adapter, gateway };
}

function request(overrides = {}) {
  return {
    requestId: "request:restricted-preview:1",
    operation: "qualification.schema.read",
    tenantId,
    runId,
    subjectId,
    destination,
    payload: {},
    capability: capability(),
    ...overrides,
  };
}

test("restricted gateway executes only exact allowlisted synthetic operations", async () => {
  const { audits, adapter, gateway } = fixture();
  const result = await gateway.execute(request());
  assert.equal(result.status, "VERIFIED");
  assert.equal(adapter.commands.length, 1);
  assert.deepEqual(audits.map((entry) => entry.decision), ["ALLOW"]);
  assert.match(audits[0].requestDigest, /^[a-f0-9]{64}$/);
});

test("restricted gateway denies cross-tenant, cross-run and stale capabilities", async () => {
  for (const [input, code] of [
    [request({ tenantId: "tenant:other" }), "GATEWAY_SYNTHETIC_SCOPE_REQUIRED"],
    [request({ runId: "run:other" }), "GATEWAY_SYNTHETIC_SCOPE_REQUIRED"],
    [request({ capability: capability("qualification.schema.read", { expiresAt: "2026-11-20T11:59:59.000Z" }) }), "GATEWAY_CAPABILITY_EXPIRED"],
  ]) {
    const { audits, adapter, gateway } = fixture();
    await assert.rejects(gateway.execute(input), (error) => error.code === code);
    assert.equal(adapter.commands.length, 0);
    assert.equal(audits.at(-1).decision, "DENY");
  }
});

test("restricted gateway denies operation, destination, payload and escalation bypasses", async () => {
  const cases = [
    [request({ operation: "database.query" }), "GATEWAY_OPERATION_NOT_ALLOWED"],
    [request({ destination: "production:database" }), "GATEWAY_DESTINATION_NOT_ALLOWED"],
    [request({ payload: { table: "auth.users" } }), "GATEWAY_PAYLOAD_FIELD_NOT_ALLOWED"],
    [request({
      operation: "qualification.decision.create",
      payload: {
        agentId: "agent:synthetic-a",
        action: "DELETE_DATABASE",
        target: "production:customer-data",
        purpose: "qualification",
        consequence: "HIGH",
      },
      capability: capability("qualification.decision.create"),
    }), "GATEWAY_DESTRUCTIVE_OPERATION_DENIED"],
  ];
  for (const [input, code] of cases) {
    const { adapter, gateway } = fixture();
    await assert.rejects(gateway.execute(input), (error) => error.code === code);
    assert.equal(adapter.commands.length, 0);
  }
});

test("restricted gateway binds a capability to its exact subject, operation and run", async () => {
  const { gateway, adapter } = fixture();
  const changedSubject = request({
    capability: capability("qualification.schema.read", { subjectId: "subject:other" }),
  });
  await assert.rejects(gateway.execute(changedSubject), (error) => error.code === "GATEWAY_CAPABILITY_SCOPE_MISMATCH");
  assert.equal(adapter.commands.length, 0);
});

test("acceptance client refuses privileged fallback credentials and unsafe origins", async () => {
  const previousUrl = process.env.ACCEPTANCE_GATEWAY_URL;
  const previousServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.ACCEPTANCE_GATEWAY_URL = "https://acceptance.example.test/api/restricted-preview/v1/execute";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const safe = new RestrictedPreviewClient({
      gatewayUrl: process.env.ACCEPTANCE_GATEWAY_URL,
      capabilityToken: "opaque-capability",
      runId,
      fetchImpl: async () => new Response(JSON.stringify({ status: "VERIFIED" }), { status: 200 }),
    });
    assert.deepEqual(await safe.execute("qualification.schema.read", {}), { status: "VERIFIED" });
    process.env.SUPABASE_SERVICE_ROLE_KEY = "must-not-be-present";
    await assert.rejects(safe.execute("qualification.schema.read", {}), /CREDENTIAL_BOUNDARY_INVALID/);
  } finally {
    if (previousUrl === undefined) delete process.env.ACCEPTANCE_GATEWAY_URL;
    else process.env.ACCEPTANCE_GATEWAY_URL = previousUrl;
    if (previousServiceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRole;
  }
  const unsafe = new RestrictedPreviewClient({
    gatewayUrl: "https://acceptance.example.test/arbitrary",
    capabilityToken: "opaque-capability",
    runId,
  });
  process.env.ACCEPTANCE_GATEWAY_URL = "https://acceptance.example.test/api/restricted-preview/v1/execute";
  try {
    await assert.rejects(unsafe.execute("qualification.schema.read", {}), /PATH_INVALID/);
  } finally {
    if (previousUrl === undefined) delete process.env.ACCEPTANCE_GATEWAY_URL;
    else process.env.ACCEPTANCE_GATEWAY_URL = previousUrl;
  }
});

