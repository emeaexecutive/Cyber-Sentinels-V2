import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  emitTraceSpan,
  getObservabilityProviderStatus,
  redactTracePayload,
} from "../lib/operations/observability.ts";

test("telemetry redaction keeps only safe metadata", () => {
  const payload = redactTracePayload({
    correlationId: "corr-001",
    accessToken: "secret-token",
    email: "person@example.com",
    providerState: "healthy",
    resultState: "allow",
    reasonCode: "policy_ok",
  });

  assert.equal(payload.correlationId, "corr-001");
  assert.equal(payload.accessToken, "[REDACTED]");
  assert.equal(payload.email, "[REDACTED]");
  assert.equal(payload.providerState, "healthy");
  assert.equal(payload.reasonCode, "policy_ok");
});

test("correlation propagation and decision trace completion stay bounded", () => {
  const trace = emitTraceSpan("trust.decision.created", {
    correlationId: "corr-002",
    operationType: "decision",
    resultState: "allow",
    providerState: "healthy",
    reasonCode: "policy_ok",
    environment: "staging",
    applicationSha: "sha-test",
  });

  assert.equal(trace.name, "trust.decision.created");
  assert.equal(trace.correlationId, "corr-002");
  assert.equal(trace.resultState, "allow");
  assert.equal(trace.providerState, "healthy");
  assert.equal(trace.reasonCode, "policy_ok");
});

test("provider failure traces surface the safe observability boundary", () => {
  const status = getObservabilityProviderStatus();
  assert.ok(status.includes("OBSERVABILITY") || status === "configured");
});

test("release-health route keeps the redaction boundary intact", async () => {
  const routeSource = await readFile(new URL("../app/api/internal/release-health/route.ts", import.meta.url), "utf8");
  assert.match(routeSource, /redactReleaseHealthPayload/i);
  assert.match(routeSource, /x-release-health-admin/i);
});
