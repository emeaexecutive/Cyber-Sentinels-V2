import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function load(file, imports = {}) {
  const loadedModule = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => imports[name] ?? {}, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

function fixture(role = 'owner') {
  const owner = '11111111-1111-4111-8111-111111111111';
  const claims = { issuer: 'https://issuer.example.test', subject: 'subject:1', tenantId: 'tenant:1', workloadId: 'agent:1', scopes: ['trust:request'] };
  const binding = { binding_id: 'binding:1', tenant_id: claims.tenantId, operational_entity_id: claims.workloadId, issuer: claims.issuer, subject: claims.subject, scopes: claims.scopes, created_by: owner, client_id: 'client:1', expires_at: new Date(Date.now() + 60000).toISOString(), status: 'active', revoked_at: null };
  const state = { status: 'APPROVED', error: null, queries: [] };
  const db = { from(table) {
    const filters = {};
    const query = { select: () => query, eq: (k, v) => { filters[k] = v; return query; }, is: (k, v) => { filters[k] = v; return query; }, maybeSingle: async () => {
      state.queries.push({ table, filters });
      if (table === 'account_access_approvals') {
        assert.equal(filters.user_id, owner, 'Approval must bind to stored owner, never caller claims');
        return { data: state.status === null ? null : { status: state.status }, error: state.error };
      }
      return { data: table === 'public_api_workload_bindings' ? binding : table === 'trust_workspaces' ? { created_by: role === 'owner' ? owner : 'another-owner' } : table === 'workspace_members' ? { role } : null, error: null };
    } };
    return query;
  } };
  const { PublicApiError } = load('../lib/public-api/v1/contracts.ts');
  const { authenticateRegisteredWorkload } = load('../lib/public-api/v1/workload-identity.ts', {
    '@/lib/supabase/service-role': { createServiceRoleClient: () => db }, './contracts': { PublicApiError },
    './workload-token': { workloadIdentityConfig: () => ({ issuer: claims.issuer }), createWorkloadTokenVerifier: () => async () => claims },
  });
  const request = new Request('https://example.test', { headers: { authorization: 'Bearer synthetic' } });
  return { state, authenticate: () => authenticateRegisteredWorkload(request, claims.workloadId, 'trust:request') };
}

for (const role of ['owner', 'admin']) {
  test(`workload revalidates ${role} approval on every request without rebinding`, async () => {
    const { state, authenticate } = fixture(role);
    assert.equal((await authenticate()).principal.role, role);
    for (const status of ['SUSPENDED', 'REJECTED', 'PENDING', null, 'approved']) {
      state.status = status;
      await assert.rejects(authenticate(), error => error.code === 'ACCESS_APPROVAL_REQUIRED' && error.status === 403);
    }
    state.status = 'APPROVED';
    assert.equal((await authenticate()).bindingId, 'binding:1');
    assert.equal(state.queries.filter(q => q.table === 'account_access_approvals').length, 7);
  });
}

test('workload fails closed when current owner approval cannot be read', async () => {
  const { state, authenticate } = fixture();
  state.error = { code: 'DATABASE_UNAVAILABLE' };
  await assert.rejects(authenticate(), error => error.code === 'WORKLOAD_AUTH_UNAVAILABLE' && error.status === 503);
});
