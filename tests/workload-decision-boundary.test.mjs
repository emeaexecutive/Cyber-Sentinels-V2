import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { publicApiOpenApi } from '../lib/public-api/v1/openapi.ts';

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
  process.env.TRUST_ACTION_RELAY_SECRET = 'test';
  globalThis.fetch = async () => assert.fail('Decision-only credentials must never dispatch');
  try {
    for (const execution of [{ allowExternalExecution: false }, {}]) {
    const dependencies = server.createCanonicalTrustTransactionDependenciesForApiClient({
      enterpriseId: 'tenant:1', clientId: 'client:1',
      ...execution,
    });
    const result = await dependencies.requestExternalExecution({ enterpriseId: 'tenant:1', transactionId: 'tx:1', actorId: 'client:1', correlationId: 'correlation:1', decision: 'ALLOW' });
    assert.equal(result.configured, false);
    assert.equal(result.acknowledgement, null);
    assert.equal(result.outcome, null);
    assert.equal(calls.at(-1).args.p_configured, false);
    }
    assert.equal(calls.length, 2);
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

test('workload route enforces the documented header bounds before evaluation', async () => {
  let evaluations = 0;
  const { PublicApiError } = load('../lib/public-api/v1/contracts.ts', {});
  const route = load('../app/api/v1/workloads/[agentId]/decisions/route.ts', {
    '@/lib/public-api/v1/contracts': { PublicApiError, boundedJson: r => r.json(), publicApiResponse: (b, i) => Response.json(b, i) },
    '@/lib/public-api/v1/handler': { withWorkloadApi: (_r, _o, h) => h({ principal: {}, agentId: 'agent:1' }) },
    '@/lib/public-api/v1/runtime': { requestExternalDecision: async () => { evaluations++; return {}; } },
  });
  for (const key of ['', 'short', 'x'.repeat(121), 'bad key!']) {
    await assert.rejects(route.POST(new Request('https://example.test/api/v1/workloads/agent:1/decisions', {
      method: 'POST', headers: { 'idempotency-key': key }, body: '{}',
    }), { params: Promise.resolve({ agentId: 'agent:1' }) }), { code: 'IDEMPOTENCY_KEY_REQUIRED' });
  }
  assert.equal(evaluations, 0);
  for (const key of ['x'.repeat(8), 'x'.repeat(120)]) {
    assert.equal((await route.POST(new Request('https://example.test/api/v1/workloads/agent:1/decisions', {
      method: 'POST', headers: { 'idempotency-key': key }, body: '{}',
    }), { params: Promise.resolve({ agentId: 'agent:1' }) })).status, 201);
  }
  assert.equal(evaluations, 2);
});

test('re-registering a revoked subject selects only the active tenant binding', async () => {
  const { PublicApiError } = load('../lib/public-api/v1/contracts.ts', {});
  const owner = '11111111-1111-4111-8111-111111111111';
  const claims = { issuer: 'https://issuer.example.test', subject: 'subject:1', tenantId: 'tenant:1', workloadId: 'agent:1', scopes: ['trust:request'] };
  const base = { tenant_id: claims.tenantId, operational_entity_id: claims.workloadId, issuer: claims.issuer, subject: claims.subject, scopes: claims.scopes, created_by: owner, client_id: 'client:1', expires_at: new Date(Date.now() + 60000).toISOString() };
  const rows = [ { ...base, binding_id: 'old', status: 'revoked', revoked_at: '2026-01-01' }, { ...base, binding_id: 'new', status: 'active', revoked_at: null } ];
  const db = { from(table) {
    let selected = table === 'public_api_workload_bindings' ? rows : table === 'trust_workspaces' ? [{ id: claims.tenantId, created_by: owner }] : table === 'account_access_approvals' ? [{ user_id: owner, status: 'APPROVED' }] : [];
    const query = { select: () => query, eq: (k, v) => { selected = selected.filter(r => r[k] === v); return query; }, is: (k, v) => { selected = selected.filter(r => r[k] === v); return query; }, maybeSingle: async () => ({ data: selected[0] ?? null, error: selected.length > 1 ? { code: 'CARDINALITY' } : null }) };
    return query;
  } };
  const mod = load('../lib/public-api/v1/workload-identity.ts', {
    '@/lib/supabase/service-role': { createServiceRoleClient: () => db },
    './contracts': { PublicApiError },
    './workload-token': { workloadIdentityConfig: () => ({ issuer: claims.issuer }), createWorkloadTokenVerifier: () => async () => claims },
  });
  const request = new Request('https://example.test', { headers: { authorization: 'Bearer fixture' } });
  assert.equal((await mod.authenticateRegisteredWorkload(request, 'agent:1', 'trust:request')).bindingId, 'new');
  rows[1].expires_at = 'malformed';
  await assert.rejects(mod.authenticateRegisteredWorkload(request, 'agent:1', 'trust:request'), { code: 'WORKLOAD_BINDING_INACTIVE' });
});

test('workload OpenAPI accepts the SDK body without a caller-selected identity', () => {
  const op = publicApiOpenApi.paths['/api/v1/workloads/{agentId}/decisions'].post;
  assert.equal(op.requestBody.content['application/json'].schema.$ref, '#/components/schemas/WorkloadDecisionRequest');
  const schema = publicApiOpenApi.components.schemas.WorkloadDecisionRequest;
  assert.deepEqual(schema.required, ['action']);
  assert.equal(schema.additionalProperties, false);
  assert.equal(Object.hasOwn(schema.properties, 'operational_entity_id'), false);
  const key = op.parameters.find(p => p.name === 'Idempotency-Key').schema;
  assert.equal(key.minLength, 8); assert.equal(key.maxLength, 120);
});
