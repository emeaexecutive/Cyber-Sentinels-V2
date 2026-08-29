import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { PUBLIC_V1_ROUTE_CONTRACT } from "../lib/public-api/v1/contracts.ts";
import { publicApiOpenApi } from "../lib/public-api/v1/openapi.ts";

const root = path.resolve(import.meta.dirname, "..");

test("OpenAPI is 3.1 and does not drift from the public route contract", async () => {
  assert.equal(publicApiOpenApi.openapi, "3.1.0");
  const operations = [];
  for (const [route, value] of Object.entries(publicApiOpenApi.paths)) {
    for (const method of ["get", "post", "patch", "put", "delete"]) if (Object.hasOwn(value, method)) operations.push([method, route]);
  }
  assert.deepEqual(operations.sort(), [...PUBLIC_V1_ROUTE_CONTRACT].map((item) => [...item]).sort());
  for (const [method, route] of PUBLIC_V1_ROUTE_CONTRACT) {
    const file = path.join(root, "app", ...route.replace("/api/v1/", "api/v1/").replaceAll("{", "[").replaceAll("}", "]").split("/"), "route.ts");
    await assert.doesNotReject(access(file), `${method.toUpperCase()} ${route} has no route implementation.`);
  }
});

test("OpenAPI documents auth, errors, idempotency, limits, webhooks and strict decision inputs", () => {
  assert.equal(publicApiOpenApi.components.securitySchemes.bearerApiKey.scheme, "bearer");
  assert.equal(publicApiOpenApi.components.schemas.DecisionRequest.additionalProperties, false);
  assert.deepEqual(publicApiOpenApi.components.schemas.Decision.properties.decision.enum, ["ALLOW", "REVIEW", "DENY"]);
  assert.match(JSON.stringify(publicApiOpenApi), /IDEMPOTENCY_CONFLICT/);
  assert.match(JSON.stringify(publicApiOpenApi), /decision\.review_required/);
  assert.match(JSON.stringify(publicApiOpenApi), /correlation_id/);
  assert.match(JSON.stringify(publicApiOpenApi), /240\/min/);
  assert.ok(publicApiOpenApi.components.schemas.Decision.properties.continuity);
  assert.ok(publicApiOpenApi.components.schemas.Decision.properties.provider_neutral_evidence);
  assert.ok(publicApiOpenApi.paths["/api/v1/evidence"].post);
  assert.equal(publicApiOpenApi.components.schemas.EvidenceRequest.additionalProperties, false);
  assert.match(JSON.stringify(publicApiOpenApi), /AGENT_ASSERTED/);
  assert.equal(publicApiOpenApi.components.schemas.EvidenceRequest.properties.provider.properties.key.enum[0], "self");
  for (const field of ["decision_id", "transaction_id", "receipt_id", "replay_id", "agent_id", "authority_reference", "correlation_id", "created_at"]) assert.ok(publicApiOpenApi.components.schemas.Decision.properties[field]);
  for (const event of ["decision.created", "monitoring.coverage_gap", "deployment.reauthorization_required", "intent.execution_mismatch", "execution.outcome", "receipt.available"]) assert.match(JSON.stringify(publicApiOpenApi), new RegExp(event.replace(".", "\\.")));
});

test("quickstart curl paths are all real OpenAPI operations", async () => {
  const quickstart = await readFile(path.join(root, "app", "developers", "quickstart", "page.tsx"), "utf8");
  for (const route of Object.keys(publicApiOpenApi.paths)) {
    const stablePrefix = route.split("{")[0];
    assert.match(quickstart, new RegExp(stablePrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `Quickstart misses ${route}`);
  }
});
