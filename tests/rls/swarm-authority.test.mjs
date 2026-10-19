import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {emptySwarmState} from '../../lib/swarm/containment.ts';
import {hashCanonical} from '../../src/lib/trust-core/hash.ts';
import {createSwarmStore} from '../../lib/swarm/store.ts';
import {swarmRpcPersistence} from '../../lib/swarm/rpc-persistence.ts';
test('Proposed persistence executes real RLS/grant and append-only isolation checks locally',async t=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec('create role anon; create role authenticated; create role service_role;');await db.exec(await readFile(new URL('../../docs/swarm-authority/proposed-persistence.sql',import.meta.url),'utf8'));
 const tenant='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
 const rpc=async(name,args)=>{try{const query=name==='load_swarm_state_v1'?'select public.load_swarm_state_v1($1) as data':'select public.cas_swarm_state_v1($1,$2,$3::jsonb) as data';const values=name==='load_swarm_state_v1'?[args.p_tenant_id]:[args.p_tenant_id,args.p_version,JSON.stringify(args.p_state)];return{data:(await db.query(query,values)).rows[0].data,error:null};}catch(error){return{data:null,error};}};
 const store=createSwarmStore(swarmRpcPersistence(rpc));
 await db.exec('set role service_role');
 await store.transact(tenant,s=>{const body={sequence:1,tenantId:tenant,kind:'MEMBERSHIP_ADDED',actorId:'operator',subjectId:'agent:1',at:1,details:{authorityConferred:false},previousHash:'0'.repeat(64)};s.events.push({...body,digest:hashCanonical(body)});});
 assert.equal((await rpc('load_swarm_state_v1',{p_tenant_id:other})).data,null);
 const stored=(await rpc('load_swarm_state_v1',{p_tenant_id:tenant})).data;
 assert.equal(stored.version,1);
 assert.equal((await rpc('cas_swarm_state_v1',{p_tenant_id:tenant,p_version:0,p_state:stored.state})).data,false);
 await assert.rejects(store.transact(tenant,s=>s.events[0].kind='FORGED'),/APPEND_ONLY/);
 const rewritten=structuredClone(stored.state);rewritten.events[0].kind='FORGED';rewritten.events.push({...rewritten.events[0],sequence:2});
 assert.ok((await rpc('cas_swarm_state_v1',{p_tenant_id:tenant,p_version:1,p_state:rewritten})).error);
 await assert.rejects(db.query('select * from swarm_private.events'),/permission denied/);
 await db.exec('reset role');
 await assert.rejects(db.query('update swarm_private.events set digest=$1',['b'.repeat(64)]),/APPEND_ONLY/);
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  assert.ok((await rpc('load_swarm_state_v1',{p_tenant_id:tenant})).error);
  assert.ok((await rpc('cas_swarm_state_v1',{p_tenant_id:other,p_version:0,p_state:emptySwarmState(other)})).error);
  for(const q of ['select * from swarm_private.state','select * from swarm_private.events','delete from swarm_private.events','update swarm_private.state set version=99'])await assert.rejects(db.query(q),/permission denied/);
  await db.exec('reset role');
 }
 const rls=(await db.query("select relrowsecurity,relforcerowsecurity from pg_class where relname in ('state','events') and relnamespace='swarm_private'::regnamespace")).rows;assert.equal(rls.length,2);assert.ok(rls.every(r=>r.relrowsecurity&&r.relforcerowsecurity));
});
