import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const historicalName = '20260909163513_operational_incident_evidence_foundation.sql';
const repairName = '20260913132642_fix_operational_incident_api_key_revocation_check.sql';
const historical = await readFile(`supabase/migrations/${historicalName}`, 'utf8');
const repair = await readFile(`supabase/migrations/${repairName}`, 'utf8');

test('forward repair changes only the invalid legacy key predicate and retains grants', async () => {
  const originalFunction = historical.slice(historical.indexOf('create function public.persist_operational_incident_v2('));
  const repairedFunction = repair.slice(repair.indexOf('create or replace function public.persist_operational_incident_v2('));
  assert.equal(repairedFunction, originalFunction.replace('create function ', 'create or replace function ').replace(' and not coalesce(k.revoked,false)', ''));
  const chain = (await readdir('supabase/migrations')).filter(name => name.endsWith('.sql')).sort();
  let effectiveDefinition;
  for (const name of chain) {
    const sql = await readFile(`supabase/migrations/${name}`, 'utf8');
    if (/create(?: or replace)? function public\.persist_operational_incident_v2\(/i.test(sql)) effectiveDefinition = sql;
  }
  assert.equal(effectiveDefinition, repair);
  assert.doesNotMatch(repair, /k\.revoked\b|add\s+(?:column\s+)?revoked\b/i);
});

test('real repaired RPC enforces key lifecycle and actor ownership without a revoked column', async t => {
  const db = new PGlite();
  try {
    // Preserve the captured Staging fixture; explicitly model Production's missing legacy column.
    const schema = (await readFile('tests/fixtures/v2-staging-column-contract.sql', 'utf8')).replace(/^revoked boolean default false,\r?\n/m, '');
    await db.exec(schema);
    await db.exec(historical);
    const tenant = randomUUID(), client = randomUUID(), key = randomUUID(), tx = randomUUID();
    async function seed(table, values) {
      const columns = (await db.query("select column_name,data_type from information_schema.columns where table_schema='public' and table_name=$1 and is_nullable='NO' and column_default is null", [table])).rows;
      const row = { ...values };
      for (const column of columns) if (row[column.column_name] === undefined) row[column.column_name] = column.data_type === 'uuid' ? randomUUID() : column.data_type === 'boolean' ? false : column.data_type === 'jsonb' ? {} : column.data_type === 'ARRAY' ? [] : column.data_type.includes('timestamp') ? new Date().toISOString() : ['integer', 'bigint'].includes(column.data_type) ? 1 : 'revocation-regression';
      const fields = Object.keys(row);
      await db.query(`insert into ${table}(${fields.join(',')}) values(${fields.map((_, i) => '$' + (i + 1)).join(',')})`, fields.map(field => row[field]));
    }
    await seed('trust_workspaces', { id: tenant });
    await seed('api_keys', { id: key, tenant_id: tenant, client_id: client, status: 'active', revoked_at: null, scopes: ['incidents:write', 'evidence:export'] });
    await seed('canonical_trust_transactions', { enterprise_id: tenant, transaction_id: tx, actor_id: client, subject_id: 'agent:regression', decision: 'ALLOW', action_purpose: 'migration_regression' });
    const open = (overrides = {}) => db.query('select persist_operational_incident_v2($1,$2,$3,$4,$5,$6)', [overrides.tenant ?? tenant, overrides.client ?? client, overrides.key ?? key, randomUUID(), 'open', { id: randomUUID(), transaction_id: tx, kind: 'TRANSACTION_LINK', summary: 'Migration regression', observed_at: new Date().toISOString(), content_digest: 'a'.repeat(64), context: {} }]);
    await assert.rejects(open(), error => error.code === '42703');
    await db.exec(repair);
    assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_schema='public' and table_name='api_keys' and column_name='revoked'")).rows[0].n, 0);
    await t.test('active scoped key opens an incident and writes memory', async () => {
      await open();
      assert.equal((await db.query('select count(*)::int n from incident_evidence_links')).rows[0].n, 1);
      assert.equal((await db.query('select count(*)::int n from trust_memory_index')).rows[0].n, 1);
    });
    for (const [name, status, revoked, expiry, scopes] of [
      ['revoked status and timestamp', 'revoked', new Date().toISOString(), null, ['incidents:write']],
      ['revoked status alone', 'revoked', null, null, ['incidents:write']],
      ['revocation timestamp alone', 'active', new Date().toISOString(), null, ['incidents:write']],
      ['expired key', 'active', null, '2000-01-01T00:00:00Z', ['incidents:write']],
      ['missing incident scope', 'active', null, null, ['trust:read']],
    ]) await t.test(name, async () => {
      await db.query('update api_keys set status=$1,revoked_at=$2,expires_at=$3,scopes=$4 where id=$5', [status, revoked, expiry, scopes, key]);
      await assert.rejects(open(), error => error.code === '42501');
    });
    await db.query("update api_keys set status='active',revoked_at=null,expires_at=null,scopes=array['incidents:write'] where id=$1", [key]);
    for (const field of ['tenant', 'client', 'key']) await t.test(`wrong ${field}`, async () => {
      await assert.rejects(open({ [field]: randomUUID() }), error => error.code === '42501');
    });
    await t.test('valid key cannot use another transaction actor', async () => {
      await db.query('update canonical_trust_transactions set actor_id=$1 where transaction_id=$2', [randomUUID(), tx]);
      await assert.rejects(open(), error => error.code === 'P0002');
      assert.equal((await db.query('select count(*)::int n from incident_evidence_links')).rows[0].n, 1);
    });
    const grants = (await db.query("select has_function_privilege('anon','persist_operational_incident_v2(uuid,uuid,uuid,uuid,text,jsonb)','execute') anon,has_function_privilege('authenticated','persist_operational_incident_v2(uuid,uuid,uuid,uuid,text,jsonb)','execute') authenticated,has_function_privilege('service_role','persist_operational_incident_v2(uuid,uuid,uuid,uuid,text,jsonb)','execute') service_role")).rows[0];
    assert.deepEqual(grants, { anon: false, authenticated: false, service_role: true });
  } finally { await db.close(); }
});
