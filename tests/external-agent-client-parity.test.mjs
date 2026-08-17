import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PUBLIC_V1_ROUTE_CONTRACT } from "../lib/public-api/v1/contracts.ts";
import { publicApiOpenApi } from "../lib/public-api/v1/openapi.ts";

const read = (url) => readFile(new URL(url, import.meta.url), "utf8");
const [sdk, typescriptGamma, powershell, quickstart] = await Promise.all([
  read("../packages/cyber-sentinels-sdk/src/index.ts"),
  read("../examples/agent-gamma/gamma.mjs"),
  read("../examples/powershell/agent-gamma.ps1"),
  read("../app/developers/quickstart/page.tsx"),
]);

const clientTokens = {
  "/api/v1/agents": ["/api/v1/agents", "/api/v1/agents", "/api/v1/agents"],
  "/api/v1/agents/{agentId}/credentials": ["/credentials", 'Get-AgentPath $agentId "credentials"', "/credentials"],
  "/api/v1/agents/{agentId}/manifest": ["/manifest", 'Get-AgentPath $agentId "manifest"', "/manifest"],
  "/api/v1/agents/{agentId}/challenge": ["/challenge", 'Get-AgentPath $agentId "challenge"', "/challenge"],
  "/api/v1/agents/{agentId}/proof": ["/proof", 'Get-AgentPath $agentId "proof"', "/proof"],
  "/api/v1/agents/{agentId}/authority": ["/authority", 'Get-AgentPath $agentId "authority"', "/authority"],
  "/api/v1/agents/{agentId}/trust-state": ["/trust-state", 'Get-AgentPath $agentId "trust-state"', "/trust-state"],
  "/api/v1/trust/decisions": ["/api/v1/trust/decisions", "/api/v1/trust/decisions", "/api/v1/trust/decisions"],
  "/api/v1/trust/transactions/{transactionId}": ["/api/v1/trust/transactions/", "/api/v1/trust/transactions/", "/api/v1/trust/transactions/"],
  "/api/v1/trust/transactions/{transactionId}/replay": ["/replay", "/replay", "/replay"],
  "/api/v1/trust/transactions/{transactionId}/receipt": ["/receipt", "/receipt", "/receipt"],
  "/api/v1/trust/transactions/{transactionId}/outcomes": ["/outcomes", "/outcomes", "/outcomes"],
};

test("TypeScript SDK, PowerShell and curl expose every OpenAPI operation", () => {
  assert.deepEqual(Object.keys(clientTokens).sort(), Object.keys(publicApiOpenApi.paths).sort());
  assert.equal(PUBLIC_V1_ROUTE_CONTRACT.length, Object.keys(clientTokens).length);
  for (const [route, tokens] of Object.entries(clientTokens)) {
    for (const [source, token, name] of [[sdk, tokens[0], "TypeScript SDK"], [powershell, tokens[1], "PowerShell"], [quickstart, tokens[2], "curl"]]) {
      assert.ok(source.includes(token), `${name} misses ${route} (${token}).`);
    }
  }
});

test("read_repository on repository:a has identical canonical meaning in all clients", () => {
  for (const [name, source] of [["TypeScript", typescriptGamma], ["PowerShell", powershell], ["curl", quickstart]]) {
    assert.match(source, /read_repository/, `${name} misses the action type.`);
    assert.match(source, /repository:a/, `${name} misses the target.`);
    assert.match(source, /deployment_evidence_review/, `${name} misses the purpose.`);
    assert.match(source, /staging/, `${name} misses the environment.`);
    assert.match(source, /api\/v1\/trust\/decisions|\.trust\.authorize/, `${name} bypasses the public decision contract.`);
  }
});

test("no client receives language-specific database or application privilege", () => {
  assert.doesNotMatch(typescriptGamma, /supabase|service.role|postgres|database|from "@\/|from "\.\.\/\.\.\/lib/i);
  assert.doesNotMatch(powershell, /SUPABASE|SERVICE_ROLE|postgres|database credential|Import-Module.*Cyber/i);
  assert.doesNotMatch(quickstart.slice(quickstart.indexOf("Equivalent curl sequence")), /SUPABASE|SERVICE_ROLE|postgres/i);
});
