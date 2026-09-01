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
  for (const field of ["decision_id", "transaction_id", "receipt_id", "replay_id", "agent_id", "authority_reference", "policy_reference", "correlation_id", "created_at"]) assert.ok(publicApiOpenApi.components.schemas.Decision.properties[field] || JSON.stringify(publicApiOpenApi).includes(`\"${field}\"`));
  for (const event of ["decision.created", "monitoring.coverage_gap", "deployment.reauthorization_required", "intent.execution_mismatch", "execution.outcome", "receipt.available"]) assert.match(JSON.stringify(publicApiOpenApi), new RegExp(event.replace(".", "\\.")));
  for (const decision of ["ALLOW", "REVIEW", "DENY"]) assert.match(JSON.stringify(publicApiOpenApi.paths["/api/v1/trust/decisions"]), new RegExp(decision));
  for (const field of ["request_id", "correlation_id", "api_version"]) assert.match(JSON.stringify(publicApiOpenApi.components.schemas.Error), new RegExp(field));
  assert.ok(publicApiOpenApi.paths["/api/v1/trust/decisions"].post.responses["413"]);
  assert.ok(publicApiOpenApi.paths["/api/v1/trust/decisions"].post.responses["429"].headers["Retry-After"]);
  assert.equal(publicApiOpenApi.paths["/api/v1/trust/transactions/{transactionId}/receipt"].get.responses["200"].content["application/json"].schema.$ref, "#/components/schemas/Receipt");
  assert.equal(publicApiOpenApi.paths["/api/v1/trust/transactions/{transactionId}/replay"].get.responses["200"].content["application/json"].schema.$ref, "#/components/schemas/Replay");
  assert.equal(publicApiOpenApi.components.schemas.Replay.properties.events.items.properties.source.const, "canonical_trust_transaction");
  assert.match(publicApiOpenApi.paths["/api/v1/trust/decisions"].post.description, /REVIEW requires the caller to stop/);
  assert.match(publicApiOpenApi.paths["/api/v1/agents"].post.description, /PENDING_IDENTITY/);
  for (const field of ["review_reference", "blocking_reason_codes", "required_evidence", "human_approval_required", "idempotent_replay"]) {
    assert.ok(publicApiOpenApi.paths["/api/v1/trust/decisions"].post.responses["201"].content["application/json"].schema.allOf[1].properties[field]);
  }
  const decisionContext = publicApiOpenApi.components.schemas.DecisionRequest.properties.context.properties;
  for (const field of ["intent_reference", "previous_transaction_id", "authority_version", "policy_version", "current_evidence_references", "material_change_references", "human_approval_reference"]) assert.ok(decisionContext[field], field);
  assert.ok(publicApiOpenApi.components.schemas.ConsequenceTime);
  assert.equal(publicApiOpenApi.components.schemas.ConsequenceTime.properties.previous_allow_standing_authorization.const, false);
  assert.equal(publicApiOpenApi.paths["/api/v1/trust/decisions"].post.responses["201"].content["application/json"].schema.allOf[1].properties.consequence_time.$ref, "#/components/schemas/ConsequenceTime");
  for (const field of ["authority_version", "current_condition_references", "material_change_references", "consequence_time"]) assert.ok(publicApiOpenApi.components.schemas.Receipt.properties[field]);
  for (const field of ["authority_version", "consequence_time", "decision_comparison", "outcome_evidence"]) assert.ok(publicApiOpenApi.components.schemas.Replay.properties[field]);
  assert.match(publicApiOpenApi.paths["/api/v1/trust/decisions"].post.description, /prior ALLOW.*never standing authorization/i);
});

test("OpenAPI freezes the least-privilege scope for every authenticated operation", () => {
  const expected = {
    "post /api/v1/agents": "agents:write",
    "get /api/v1/agents/{agentId}": "authority:read",
    "post /api/v1/agents/{agentId}/credentials": "agents:write",
    "post /api/v1/agents/{agentId}/manifest": "agents:write",
    "post /api/v1/agents/{agentId}/challenge": "agents:verify",
    "post /api/v1/agents/{agentId}/proof": "agents:verify",
    "get /api/v1/agents/{agentId}/authority": "authority:read",
    "get /api/v1/agents/{agentId}/trust-state": "authority:read",
    "post /api/v1/trust/decisions": "trust:request",
    "post /api/v1/evidence": "evidence:write",
    "get /api/v1/trust/transactions/{transactionId}": "trust:read",
    "get /api/v1/trust/transactions/{transactionId}/replay": "trust:read",
    "get /api/v1/trust/transactions/{transactionId}/receipt": "trust:read",
    "post /api/v1/trust/transactions/{transactionId}/outcomes": "outcomes:write",
  };
  for (const [operation, scope] of Object.entries(expected)) {
    const [method, path] = operation.split(" ");
    assert.deepEqual(publicApiOpenApi.paths[path][method]["x-required-scopes"], [scope], operation);
  }
});

test("quickstart curl paths are all real OpenAPI operations", async () => {
  const quickstart = await readFile(path.join(root, "app", "developers", "quickstart", "page.tsx"), "utf8");
  for (const route of Object.keys(publicApiOpenApi.paths)) {
    const stablePrefix = route.split("{")[0];
    assert.match(quickstart, new RegExp(stablePrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `Quickstart misses ${route}`);
  }
});
