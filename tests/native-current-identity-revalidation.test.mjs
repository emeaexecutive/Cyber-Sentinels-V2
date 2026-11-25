import { currentNativeDelegationChain } from "../lib/operational-entities/native-delegation-current.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const id = '11111111-1111-4111-8111-111111111111';
function fixture() {
  const future = new Date(Date.now() + 60000).toISOString();
  const rows = {
    native_enforcement_decision_bindings: { decision_digest: 'digest' },
    operational_entity_delegated_action_evaluations: { delegation_id: id },
    canonical_trust_transactions: { decision: 'ALLOW', action_type: 'READ', action_resource: 'repository:a', action_environment: 'test' },
    operational_entity_authority_delegations: { parent_authority_id: id, status: 'ACTIVE', revoked_at: null, expires_at: future },
    trust_contracts: { revocation_state: 'active', expires_at: future },
    operational_entity_native_verifications: { verification_id: id, credential_id: id, status: 'VERIFIED', expires_at: future, runtime_binding: 'RUNTIME_MATCH' },
    operational_entity_owner_bindings: { state: 'CONFIRMED', effective_from: '2026-01-01T00:00:00Z', effective_to: null },
    operational_entity_native_credentials: { state: 'ACTIVE', revoked_at: null, valid_from: '2026-01-01T00:00:00Z', expires_at: future },
    native_entity_identity_evidence: { revoked_at: null, expires_at: future },
    operational_entities: { lifecycle_state: 'active' },
  };
  const errors = new Set(); const queries = []; let dependencies;
  const db = { from(table) {
    const filters = {};
    const query = { select: () => query, eq: (k, v) => { filters[k] = v; return query; }, order: () => query, limit: () => query,
      maybeSingle: async () => { queries.push({table, filters}); return { data: rows[table] ?? null, error: errors.has(table) ? { code: 'SYNTHETIC_DB_FAILURE' } : null }; } };
    return query;
  } };
  const loadedModule = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL('../lib/operational-entities/native-enforcement-server.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => ({
    './native-delegation-current': { currentNativeDelegationChain },
    '@/lib/supabase/service-role': { createServiceRoleClient: () => db },
    './native-enforcement': { executeAuthorizedAction: async (_input, deps) => { dependencies = deps; return { requested: false, request: null, eligibility: { reasonCodes: [] } }; } },
  })[name] ?? {}, loadedModule, loadedModule.exports);
  return { rows, errors, queries, async current() {
    if (!dependencies) await loadedModule.exports.requestNativeEnforcement({ enterpriseId: 'tenant:1', role: 'owner', user: { id } }, 'agent:1', { transactionId: id, evaluationId: id, idempotencyKey: 'synthetic:request' });
    return dependencies.loadCurrentState({ authorityId: id, delegationId: id });
  } };
}

test('native factory re-reads credential, evidence and lifecycle on final identity checks', async () => {
  const f = fixture();
  assert.equal((await f.current()).identityVerified, true);
  for (const [table, field, value] of [
    ['operational_entity_native_credentials', 'state', 'REVOKED'],
    ['operational_entity_native_credentials', 'revoked_at', '2026-01-01T00:00:00Z'],
    ['operational_entity_native_credentials', 'valid_from', 'malformed'],
    ['operational_entity_native_credentials', 'expires_at', '2000-01-01T00:00:00Z'],
    ['native_entity_identity_evidence', 'revoked_at', '2026-01-01T00:00:00Z'],
    ['native_entity_identity_evidence', 'expires_at', 'malformed'],
    ['operational_entities', 'lifecycle_state', 'suspended'],
  ]) {
    const prior = f.rows[table][field]; f.rows[table][field] = value;
    const current = await f.current();
    assert.equal(current.identityVerified, false, `${table}.${field}`);
    assert.equal(current.runtimeContinuity, 'UNKNOWN');
    f.rows[table][field] = prior;
  }
  for (const table of ['operational_entity_native_credentials', 'native_entity_identity_evidence', 'operational_entities']) {
    const prior = f.rows[table]; f.rows[table] = null;
    assert.equal((await f.current()).identityVerified, false, `missing ${table}`);
    f.rows[table] = prior;
    const query = f.queries.find(q => q.table === table);
    assert.equal(query.filters.enterprise_id, 'tenant:1');
    assert.equal(query.filters[table === 'operational_entities' ? 'entity_id' : 'operational_entity_id'], 'agent:1');
  }
  assert.equal((await f.current()).identityVerified, true);
});

for (const table of ['operational_entity_native_credentials', 'native_entity_identity_evidence', 'operational_entities']) {
  test(`native factory fails closed on ${table} read error`, async () => {
    const f = fixture(); f.errors.add(table);
    await assert.rejects(f.current(), error => error.code === 'NATIVE_ENFORCEMENT_PERSISTENCE_FAILED' && error.status === 503);
  });
}

test('native factory requires the current owner binding effective interval',async()=>{const f=fixture();assert.equal((await f.current()).ownerConfirmed,true);f.rows.operational_entity_owner_bindings.effective_to='2000-01-01T00:00:00Z';assert.equal((await f.current()).ownerConfirmed,false);f.rows.operational_entity_owner_bindings.effective_to=null;f.rows.operational_entity_owner_bindings.effective_from=new Date(Date.now()+60000).toISOString();assert.equal((await f.current()).ownerConfirmed,false);});
