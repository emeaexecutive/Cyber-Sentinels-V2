import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('07: high-consequence transaction is consumed once despite fresh idempotency keys', async t => {
  const db = new PGlite(); t.after(() => db.close());
  // Execute the real request-table DDL against minimal referenced tables.
  await db.exec(`create table trust_workspaces(id uuid primary key);
    create table canonical_trust_transactions(enterprise_id uuid,transaction_id uuid,unique(enterprise_id,transaction_id));
    create table operational_entities(enterprise_id uuid,entity_id text,unique(enterprise_id,entity_id));
    create table trust_contracts(enterprise_id uuid,contract_id uuid,unique(enterprise_id,contract_id));
    create table operational_entity_delegated_action_evaluations(enterprise_id uuid,evaluation_id uuid,unique(enterprise_id,evaluation_id));
    create table operational_entity_authority_delegations(enterprise_id uuid,delegation_id uuid,unique(enterprise_id,delegation_id));`);
  const original = await readFile(new URL('../supabase/migrations/202608090002_native_enforcement_outcome_proof.sql', import.meta.url), 'utf8');
  await db.exec(original.slice(original.indexOf('create table public.native_enforcement_requests ('), original.indexOf('create table public.native_enforcement_acknowledgements (')));
  const migration = await readFile(new URL('../supabase/migrations/20261028230354_single_use_high_consequence_approval.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  const tenant = randomUUID(), tx = randomUUID(), authority = randomUUID(), evaluation = randomUUID(), delegation = randomUUID();
  await db.query('insert into trust_workspaces values($1)', [tenant]);
  for (const [table, id] of [['canonical_trust_transactions',tx],['trust_contracts',authority],['operational_entity_delegated_action_evaluations',evaluation],['operational_entity_authority_delegations',delegation]]) await db.query(`insert into ${table} values($1,$2)`, [tenant,id]);
  await db.query('insert into operational_entities values($1,$2)',[tenant,'worker']);
  const insert = (consequence, state = 'REQUESTED') => db.query(`insert into native_enforcement_requests(request_id,enterprise_id,transaction_id,evaluation_id,operational_entity_id,authority_id,delegation_id,action_type,action_target,environment,consequence,action_digest,decision_digest,idempotency_key,request_state,actor_id,requested_at,request_digest)
    values($1,$2,$3,$4,'worker',$5,$6,'PUBLISH','project:1','test',$7,$8,$8,$9,$10,$11,now(),$12)`,[randomUUID(),tenant,tx,evaluation,authority,delegation,consequence,'a'.repeat(64),randomUUID(),state,randomUUID(),randomUUID().replaceAll('-','').repeat(2)]);
  await insert('HIGH','REVIEW_REQUIRED'); // Rejected reservation does not consume approval.
  await insert('HIGH');
  await assert.rejects(insert('HIGH'), e => e.code === '23505' && /native_enforcement_single_approved_transaction/.test(e.message));
  await assert.rejects(insert('CRITICAL'), e => e.code === '23505');
  assert.equal((await db.query("select count(*)::int n from native_enforcement_requests where request_state='REQUESTED' and consequence in ('HIGH','CRITICAL')")).rows[0].n, 1);
});
