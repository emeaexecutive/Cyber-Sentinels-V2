import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Execute real server factory and route code. Replace framework/auth/persistence
// edges; keep the execution-disabling branch itself under test.
function load(file, imports) {
  const loaded = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => imports[name] ?? {}, loaded, loaded.exports);
  return loaded.exports;
}

test('decision-only API dependencies record no configured relay and make zero external calls', async () => {
  const calls = [];
  const server = load('../lib/trust-transaction/server.ts', {
    '@/lib/supabase/service-role': { createServiceRoleClient: () => ({ rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: { requestReference: 'synthetic:request' }, error: null };
    } }) },
  });
  const priorUrl = process.env.TRUST_ACTION_RELAY_URL;
  const priorSecret = process.env.TRUST_ACTION_RELAY_SECRET;
  const priorFetch = globalThis.fetch;
  process.env.TRUST_ACTION_RELAY_URL = 'https://relay.example.test';
  process.env.TRUST_ACTION_RELAY_SECRET = 'synthetic-test-only';
  globalThis.fetch = async () => assert.fail('Decision-only credentials must never dispatch');
  try {
    const dependencies = server.createCanonicalTrustTransactionDependenciesForApiClient({
      enterpriseId: 'tenant:1', clientId: 'client:1', allowExternalExecution: false,
    });
    const result = await dependencies.requestExternalExecution({ enterpriseId: 'tenant:1', transactionId: 'tx:1', actorId: 'client:1', correlationId: 'correlation:1', decision: 'ALLOW' });
    assert.equal(result.configured, false);
    assert.equal(result.acknowledgement, null);
    assert.equal(result.outcome, null);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].args.p_configured, false);
  } finally {
    globalThis.fetch = priorFetch;
    if (priorUrl === undefined) delete process.env.TRUST_ACTION_RELAY_URL; else process.env.TRUST_ACTION_RELAY_URL = priorUrl;
    if (priorSecret === undefined) delete process.env.TRUST_ACTION_RELAY_SECRET; else process.env.TRUST_ACTION_RELAY_SECRET = priorSecret;
  }
});

test('workload decision route binds the authenticated agent and disables relay server-side', async () => {
  let captured;
  const route = load('../app/api/v1/workloads/[agentId]/decisions/route.ts', {
    '@/lib/public-api/v1/contracts': {
      boundedJson: request => request.json(),
      publicApiResponse: (body, init) => Response.json(body, init),
    },
    '@/lib/public-api/v1/handler': { withWorkloadApi: async (_request, _options, handler) => handler({ principal: { tenantId: 'tenant:1' }, correlationId: 'correlation:1', requestId: 'request:1', agentId: 'agent:bound' }) },
    '@/lib/public-api/v1/runtime': { requestExternalDecision: async (...args) => {
      captured = args;
      return { decision: 'ALLOW', idempotent_replay: false };
    } },
  });
  const response = await route.POST(new Request('https://example.test/api/v1/workloads/agent:bound/decisions', {
    method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'synthetic-key-123' },
    body: JSON.stringify({ action: { type: 'READ', target: 'resource:1' } }),
  }), { params: Promise.resolve({ agentId: 'agent:bound' }) });
  assert.equal(response.status, 201);
  assert.equal(captured[1].operational_entity_id, 'agent:bound');
  assert.deepEqual(captured[5], { allowExternalExecution: false });
});
