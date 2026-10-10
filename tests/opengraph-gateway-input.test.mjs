import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inspectOpenGraphGatewayInput } from "../lib/public-api/v1/opengraph-gateway-input.ts";

const route = await readFile(new URL("../app/api/v1/tools/opengraph/site/route.ts", import.meta.url), "utf8");
const gateway = await readFile(new URL("../lib/public-api/v1/opengraph-gateway.ts", import.meta.url), "utf8");

test("OpenGraph V1 gateway accepts only a bound entity and a bounded safe HTTPS target", () => {
  const input = inspectOpenGraphGatewayInput({
    operational_entity_id: "agent:fixture-alpha",
    target_url: "https://example.com/docs",
  });
  assert.equal(input.operationalEntityId, "agent:fixture-alpha");
  assert.equal(input.target.domain, "example.com");
  assert.equal(input.target.url, "https://example.com/docs");
  for (const body of [
    { operational_entity_id: "agent:fixture-alpha", target_url: "http://example.com" },
    { operational_entity_id: "agent:fixture-alpha", target_url: "https://127.0.0.1" },
    { operational_entity_id: "agent:fixture-alpha", target_url: "https://example.com?token=secret" },
    { operational_entity_id: "agent:fixture-alpha", target_url: "https://example.com", decision: "ALLOW" },
    { operational_entity_id: "agent:fixture-alpha", target_url: "https://example.com", tenant_id: "tenant:forged" },
    { operational_entity_id: "agent:fixture-alpha", target_url: "https://example.com", authority: "approved" },
  ]) assert.throws(() => inspectOpenGraphGatewayInput(body));
});

test("gateway is V1 API-key authenticated and delegates only to the existing canonical transaction", () => {
  assert.match(route, /withPublicApi/);
  assert.match(route, /scopes:\s*\["trust:request"\]/);
  assert.match(route, /idempotency-key/i);
  assert.match(gateway, /getExternalAuthority\(principal, operationalEntityId\)/);
  assert.match(gateway, /DELEGATED_AUTHORITY_PATH_REQUIRED/);
  assert.match(gateway, /createCanonicalTrustTransactionDependenciesForApiClient/);
  assert.match(gateway, /governOpenGraphRequest\(/);
  assert.match(gateway, /OPENGRAPH_PROVIDER_QUALIFIED === "true"/);
  assert.match(gateway, /createOpenGraphTestAdapter\(\)/);
  assert.match(gateway, /NEXT_PUBLIC_SUPABASE_URL !== "https:\/\/agpyhygpfmppjkxwcpac\.supabase\.co"/);
});