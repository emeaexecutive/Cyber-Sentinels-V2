import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PUBLIC_V1_ROUTE_CONTRACT } from "../lib/public-api/v1/contracts.ts";
import { publicApiOpenApi } from "../lib/public-api/v1/openapi.ts";

const read = (url) => readFile(new URL(url, import.meta.url), "utf8");
const [sdk, typescriptGamma, powershell, quickstart, developerLanding, sdkReadme] = await Promise.all([
  read("../packages/cyber-sentinels-sdk/src/index.ts"),
  read("../examples/agent-gamma/gamma.mjs"),
  read("../examples/powershell/agent-gamma.ps1"),
  read("../app/developers/quickstart/page.tsx"),
  read("../app/developers/page.tsx"),
  read("../packages/cyber-sentinels-sdk/README.md"),
]);

const clientTokens = {
  "POST /api/v1/agents": ["/api/v1/agents", 'Invoke-CyberSentinelsApi "POST" "/api/v1/agents"', "POST /api/v1/agents"],
  "GET /api/v1/agents/{agentId}": ["GET\", `/api/v1/agents/${encodeURIComponent(agentId)}`", 'Invoke-CyberSentinelsApi "GET" "/api/v1/agents/$encodedAgentId"', "GET  /api/v1/agents/{agentId}"],
  "POST /api/v1/agents/{agentId}/credentials": ["/credentials", 'Get-AgentPath $agentId "credentials"', "POST /api/v1/agents/{agentId}/credentials"],
  "POST /api/v1/agents/{agentId}/manifest": ["/manifest", 'Get-AgentPath $agentId "manifest"', "POST /api/v1/agents/{agentId}/manifest"],
  "POST /api/v1/agents/{agentId}/challenge": ["/challenge", 'Get-AgentPath $agentId "challenge"', "POST /api/v1/agents/{agentId}/challenge"],
  "POST /api/v1/agents/{agentId}/proof": ["/proof", 'Get-AgentPath $agentId "proof"', "POST /api/v1/agents/{agentId}/proof"],
  "GET /api/v1/agents/{agentId}/authority": ["/authority", 'Get-AgentPath $agentId "authority"', "GET  /api/v1/agents/{agentId}/authority"],
  "GET /api/v1/agents/{agentId}/authorities": ["list: (agentId", 'Invoke-CyberSentinelsApi "GET" $authorityPath', "GET  /api/v1/agents/{agentId}/authorities"],
  "POST /api/v1/agents/{agentId}/authorities": ["grant: (agentId", 'Invoke-CyberSentinelsApi "POST" $authorityPath', "POST /api/v1/agents/{agentId}/authorities"],
  "GET /api/v1/agents/{agentId}/authorities/{authorityId}": ["getVersion: (agentId", 'Invoke-CyberSentinelsApi "GET" "$authorityPath/', "GET  /api/v1/agents/{agentId}/authorities/{authorityId}"],
  "POST /api/v1/agents/{agentId}/authorities/{authorityId}/revoke": ["revoke: (agentId", 'Invoke-CyberSentinelsApi "POST" "$authorityPath/', "POST /api/v1/agents/{agentId}/authorities/{authorityId}/revoke"],
  "GET /api/v1/agents/{agentId}/trust-state": ["/trust-state", 'Get-AgentPath $agentId "trust-state"', "GET  /api/v1/agents/{agentId}/trust-state"],
  "POST /api/v1/trust/decisions": ["/api/v1/trust/decisions", 'Invoke-CyberSentinelsApi "POST" "/api/v1/trust/decisions"', "POST /api/v1/trust/decisions"],
  "POST /api/v1/evidence": ["/api/v1/evidence", "/api/v1/evidence", "POST /api/v1/evidence"],
  "GET /api/v1/trust/transactions/{transactionId}": ["/api/v1/trust/transactions/", 'Invoke-CyberSentinelsApi "GET" "/api/v1/trust/transactions/', "GET  /api/v1/trust/transactions/{transactionId}"],
  "GET /api/v1/trust/transactions/{transactionId}/replay": ["/replay", "/replay", "GET  /api/v1/trust/transactions/{transactionId}/replay"],
  "GET /api/v1/trust/transactions/{transactionId}/receipt": ["/receipt", "/receipt", "GET  /api/v1/trust/transactions/{transactionId}/receipt"],
  "POST /api/v1/trust/transactions/{transactionId}/outcomes": ["/outcomes", "/outcomes", "POST /api/v1/trust/transactions/{transactionId}/outcomes"],
  "GET /api/v1/reviews/{reviewReference}": ["get: (reviewReference", 'Invoke-CyberSentinelsApi "GET" $reviewPath', "GET  /api/v1/reviews/{reviewReference}"],
  "POST /api/v1/reviews/{reviewReference}/resolve": ["resolve: (reviewReference", 'Invoke-CyberSentinelsApi "POST" "$reviewPath/resolve"', "POST /api/v1/reviews/{reviewReference}/resolve"],
};

test("TypeScript SDK, PowerShell and curl expose every OpenAPI operation", () => {
  const openApiOperations = Object.entries(publicApiOpenApi.paths).flatMap(([path, item]) =>
    Object.keys(item).filter((method) => ["get", "post", "put", "patch", "delete"].includes(method)).map((method) => `${method.toUpperCase()} ${path}`));
  assert.deepEqual(Object.keys(clientTokens).sort(), openApiOperations.sort());
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

test("public developer surfaces do not advertise an unpublished registry install", () => {
  assert.doesNotMatch(developerLanding, /npm install @cyber-sentinels\/sdk/, "developer landing advertises an unpublished package.");
  assert.match(developerLanding, /repository-local|not published|unpublished/i);
  assert.match(sdkReadme, /Do not use\s+`npm install @cyber-sentinels\/sdk`/i);
});
