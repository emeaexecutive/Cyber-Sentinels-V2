import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {swarmSql} from './fixtures/swarm-sql.mjs';
import {createSwarmStore} from '../lib/swarm/store.ts';
import {emptySwarmState,verifySwarmReplay} from '../lib/swarm/containment.ts';
import {hashCanonical} from '../src/lib/trust-core/hash.ts';
import {projectSwarmReceipt} from '../lib/swarm/evidence-projection.ts';

const tenant='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
const kinds=['SOC_AGENT_REGISTERED','SOC_ALERT','SOC_INVESTIGATION','SOC_MODEL_RUN','SOC_ASSESSMENT','SOC_RESPONSE','SOC_FEEDBACK','SOC_TRUST_MEMORY','SOC_FAILURE','WATCHTOWER_WARNING','CHIRIVETA_REVIEW'];
function append(state,kind){const body={tenantId:tenant,sequence:state.events.length+1,kind,actorId:'SOC:test-owner',subjectId:'agent:soc-test',at:1700000000000+state.events.length,details:{synthetic:true,authorityConferred:false},previousHash:state.events.at(-1)?.digest??'0'.repeat(64)};const event={...body,digest:hashCanonical(body)};state.events.push(event);return event;}

test('SOC migration rehearses rollback, forward recovery and actual canonical Replay/Memory inserts',async t=>{
 const {db,persistence}=await swarmSql(t);
 await db.exec('reset role');
 const migration=await readFile(new URL('../supabase/migrations/20261112104809_soc_replay_event_types.sql',import.meta.url),'utf8');
 const constraint=async()=>(await db.query("select pg_get_constraintdef(oid) as value from pg_constraint where conname='operational_entity_native_replay_events_event_type_check'")).rows[0].value;
 const original=await constraint();
 await db.exec('begin');await db.exec(migration.replace(/^begin;$/m,'').replace(/^commit;$/m,''));assert.match(await constraint(),/SWARM_SOC_ALERT/);await db.exec('rollback');assert.equal(await constraint(),original);
 await db.exec(migration);await db.exec(migration);assert.match(await constraint(),/SWARM_SOC_ALERT/);
 await db.query('insert into public.trust_workspaces(id) values($1)',[tenant]);
 await db.query('insert into public.operational_entities values($1,$2)',[tenant,'agent:soc-test']);
 await db.exec('set role service_role');
 const store=createSwarmStore(persistence);
 for(const kind of kinds)await store.transact(tenant,state=>append(state,kind));
 const stored=await persistence.load(tenant);assert.equal(stored.state.events.length,kinds.length);assert.ok(verifySwarmReplay(stored.state.events,tenant));assert.equal(await persistence.load(other),null);
 await db.exec('reset role');
 for(const event of stored.state.events)await projectSwarmReceipt(event,async(table,row)=>{const keys=Object.keys(row);await db.query(`insert into public.${table} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(row));});
 assert.equal(Number((await db.query('select count(*) as n from public.operational_entity_native_replay_events')).rows[0].n),kinds.length);
 assert.equal(Number((await db.query('select count(*) as n from public.trust_memory_index')).rows[0].n),kinds.length);
 await assert.rejects(db.query("update public.operational_entity_native_replay_events set event_type='SWARM_UNDECLARED_ACTION'"),/check constraint/);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select public.load_swarm_state_v1($1)',[tenant]),/permission denied/);await assert.rejects(db.query('select * from swarm_private.events'),/permission denied/);await db.exec('reset role');}
});

test('SOC CAS gives one winner for competing versions, isolates tenants and preserves state after failed commits',async t=>{
 const {db,persistence}=await swarmSql(t);
 const state=emptySwarmState(tenant);append(state,'SOC_ALERT');
 const results=await Promise.all(Array.from({length:12},()=>persistence.compareAndSwap(tenant,0,structuredClone(state))));
 assert.equal(results.filter(Boolean).length,1);
 const prior=await persistence.load(tenant),malformed=structuredClone(prior.state);append(malformed,'SOC_RESPONSE');malformed.events[0].details={forged:true};
 await assert.rejects(persistence.compareAndSwap(tenant,prior.version,malformed),/PERSISTENCE_UNAVAILABLE/);
 assert.deepEqual(await persistence.load(tenant),prior);
 await assert.rejects(persistence.compareAndSwap(other,0,state),/PERSISTENCE_UNAVAILABLE/);
 assert.equal(await persistence.load(other),null);
 const stores=Array.from({length:5},()=>createSwarmStore(persistence));
 await Promise.all(stores.map(store=>store.transact(tenant,s=>append(s,'SOC_INVESTIGATION'))));
 const recovered=await persistence.load(tenant);assert.equal(recovered.state.events.length,6);assert.ok(verifySwarmReplay(recovered.state.events,tenant));
 await db.exec('reset role');await assert.rejects(db.query('delete from swarm_private.events where tenant_id=$1',[tenant]),/APPEND_ONLY/);
 t.diagnostic(process.env.TENENTE_LOCAL_PG_PORT?'Independent PostgreSQL connections arbitrate actual lock contention':'PGlite serializes SQL; competing CAS versions verified, not multi-connection lock-race proof');
});
