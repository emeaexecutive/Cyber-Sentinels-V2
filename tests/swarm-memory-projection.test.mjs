import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {fixture,tenant} from './fixtures/swarm-control.mjs';
import {installSwarmPrerequisites} from './fixtures/swarm-schema.mjs';
import {projectSwarmReceipt} from '../lib/swarm/evidence-projection.ts';

test('Contract 27/28/29: swarm lifecycle persists into existing canonical Replay and Trust Memory',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await installSwarmPrerequisites(db);
  await db.exec(await readFile(new URL('../supabase/migrations/20261020091324_tenente_swarm_authority_control.sql',import.meta.url),'utf8'));
  await db.query('insert into trust_workspaces values($1)',[tenant]);
  for(const id of ['agent:1','child'])await db.query('insert into operational_entities values($1,$2)',[tenant,id]);
  const h=await fixture();await h.add('child','agent:1');await h.run();
  const revoked=await h.control.changeMembership(tenant,'operator','agent:1','REVOKED','contract qualification');
  const events=await h.control.evidence(tenant,'operator');
  const persist=async(table,row)=>{
    assert.ok(['operational_entity_native_replay_events','trust_memory_index'].includes(table));
    const columns=Object.keys(row).join(',');
    await db.query(`insert into public.${table}(${columns}) select ${columns} from jsonb_populate_record(null::public.${table},$1::jsonb) on conflict do nothing`,[JSON.stringify(row)]);
  };
  for(const event of events)await projectSwarmReceipt(event,persist);
  const replay=(await db.query('select * from operational_entity_native_replay_events')).rows;
  const memory=(await db.query('select * from trust_memory_index')).rows;
  assert.equal(replay.length,memory.length);assert.ok(replay.length>=8);
  const history=memory.filter(r=>r.summary.swarmReceipt===revoked.digest);
  assert.deepEqual(new Set(history.map(r=>r.subject_id)),new Set(['agent:1','child']));
  assert.ok(history.every(r=>r.summary.externalExecutionOrder==='UNKNOWN'));
  assert.ok(replay.some(r=>r.payload.details.authoritySnapshot?.grants[0]?.id));
  for(const event of events)await projectSwarmReceipt(event,persist);
  assert.equal((await db.query('select count(*)::int n from trust_memory_index')).rows[0].n,memory.length);
  await assert.rejects(projectSwarmReceipt({...revoked,kind:'FORGED'},persist),/INTEGRITY/);
  const constraints=(await db.query("select pg_get_constraintdef(oid) d from pg_constraint where conname='operational_entity_native_replay_events_event_type_check'")).rows[0].d;
  assert.ok(constraints.includes('MANIFEST_REGISTERED'));assert.ok(constraints.includes('SWARM_MEMBERSHIP_CHANGED'));
  t.diagnostic(JSON.stringify({persistedCanonicalReplayRows:replay.length,persistedTrustMemoryRows:memory.length,revocationReceipt:revoked.digest,idempotentProjection:true}));
});
