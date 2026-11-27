import assert from 'node:assert/strict';
import test from 'node:test';
import {fork,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {randomBytes,createHash} from 'node:crypto';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {swarmSql} from './fixtures/swarm-sql.mjs';
import {fixture,tenant} from './fixtures/swarm-control.mjs';
import {createSwarmStore} from '../lib/swarm/store.ts';
import {SwarmContainment,verifySwarmReplay} from '../lib/swarm/containment.ts';
import pg from 'pg';

test('real PostgreSQL independent clients arbitrate shared final slot; separate destination observes exactly one effect',async t=>{
 assert.equal(process.env.TENENTE_LOCAL_PG_PORT,'55473','Explicit task-only PostgreSQL required; no PGlite fallback');
 const cleanup=[];t.after(async()=>{for(const fn of cleanup.reverse())await fn();});
 const sql=await swarmSql({after:fn=>cleanup.push(fn),diagnostic:message=>t.diagnostic(message)}),h=await fixture({persistence:sql.persistence});await h.add('agent:2','agent:1');
 await sql.db.exec('reset role');const database=(await sql.db.query('select current_database() as name')).rows[0].name;await sql.db.exec('set role service_role');
 const observer=new pg.Client({host:'127.0.0.1',port:55473,user:'postgres',database});await observer.connect();cleanup.push(()=>observer.end());
 const token=randomBytes(32).toString('hex');const child=fork(new URL('../tools/qualification/execution03-local-destination.mjs',import.meta.url),[],{env:{...process.env,EXECUTION03_DATABASE:database,EXECUTION03_DESTINATION_KEY:token},stdio:['ignore','ignore','pipe','ipc']});
 cleanup.push(async()=>{if(child.connected){child.send('stop');await once(child,'exit');}});
 const [ready]=await once(child,'message');
 const count=async()=>Number((await observer.query('select count(*) as count from execution03_destination.effects')).rows[0].count);
 let collisions=0;const workers=[];const backendPids=[];
 for(let i=0;i<2;i++){
  const client=new pg.Client({host:'127.0.0.1',port:55473,user:'postgres',database,options:'-c role=service_role'});await client.connect();cleanup.push(()=>client.end());backendPids.push((await client.query('select pg_backend_pid() as pid')).rows[0].pid);
  const persistence={load:async id=>(await client.query('select public.load_swarm_state_v1($1) as data',[id])).rows[0].data,compareAndSwap:async(id,version,state)=>{const result=(await client.query('select public.cas_swarm_state_v1($1,$2,$3::jsonb) as data',[id,version,JSON.stringify(state)])).rows[0].data;if(!result)collisions++;return result;}};
  workers.push(new SwarmContainment({...h.deps,store:createSwarmStore(persistence)}));
 }
 assert.equal(new Set([...backendPids,ready.backendPid,(await observer.query('select pg_backend_pid() as pid')).rows[0].pid]).size,4);
 h.policy.classification.quotaMode='AGGREGATE';h.policy.classification.quotaScope='loop:postgres-final-slot';h.policy.classification.limit=2;
 async function attempt(control,agent,key,loseAcknowledgement=false){const request=h.request(agent,key),admit=await control.admit(tenant,agent,request);if(!admit.allowed)return{allowed:false,receipt:admit.receipt};const dispatch=await control.dispatch(tenant,agent,request,admit.leaseId);if(!dispatch.allowed)return{allowed:false,receipt:dispatch.receipt};const response=await fetch(`http://127.0.0.1:${ready.port}/effect`,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({request,leaseId:admit.leaseId,loseAcknowledgement})});assert.equal(response.status,200);return{allowed:true,receipt:dispatch.receipt,leaseId:admit.leaseId};}
 await attempt(workers[0],'agent:1','postgres:first');assert.equal(await count(),1);
 const before=await count();const results=await Promise.all([attempt(workers[0],'agent:1','postgres:final-a'),attempt(workers[1],'agent:2','postgres:final-b')]);
 assert.equal(results.filter(x=>x.allowed).length,1);assert.equal(await count()-before,1);assert.ok(results.find(x=>!x.allowed).receipt.details.reasons.includes('COLLECTIVE_LIMIT_EXCEEDED'));
 const exhausted=await count();for(let i=0;i<240;i++){const result=await attempt(workers[i%2],i%2?'agent:2':'agent:1','postgres:exhausted:'+i);assert.equal(result.allowed,false);}
 h.policy.classification.operation='ALTERNATE_TOOL';assert.equal((await attempt(workers[1],'agent:2','postgres:alternate-tool')).allowed,false);assert.equal(await count(),exhausted);
 const recovery=createSwarmStore(sql.persistence);const recovered=await recovery.transact(tenant,s=>structuredClone(s));assert.ok(verifySwarmReplay(recovered.events,tenant));assert.equal(Object.values(recovered.leases).filter(l=>l.state==='DISPATCHED').length,2);
 // Parent revocation and stop are observed through independently constructed clients.
 await h.control.changeMembership(tenant,'operator','agent:1','REVOKED');assert.equal((await attempt(workers[1],'agent:2','postgres:revoked')).allowed,false);
 await h.control.contain(tenant,'operator',{kind:'swarm',id:'swarm:1'},'execution03 deterministic stop');assert.equal((await attempt(workers[0],'agent:1','postgres:stopped')).allowed,false);assert.equal(await count(),exhausted);
 const wrongTenant='20000000-0000-4000-8000-000000000001';assert.equal(await sql.persistence.load(wrongTenant),null);
 await assert.rejects(workers[1].admit(wrongTenant,'agent:2',h.request('agent:2','cross-tenant')),/ACTOR|DENIED|TENANT/);assert.equal(await count(),exhausted);
 const inspect=await sql.inspect(),sourceHashes={};for(const file of ['lib/swarm/containment.ts','lib/swarm/store.ts','lib/swarm/rpc-persistence.ts'])sourceHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
 await mkdir('artifacts/execution03',{recursive:true});await writeFile('artifacts/execution03/postgres-final-slot.json',JSON.stringify({engine:'REAL_POSTGRESQL',gitSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,serverVersion:(await observer.query('show server_version')).rows[0].server_version,workerBackendPids:backendPids,destinationBackendPid:ready.backendPid,destinationProcessPid:ready.pid,casCollisions:collisions,finalSlotCommittedWinners:results.filter(x=>x.allowed).length,finalSlotDestinationEffects:1,exhaustedAttempts:240,totalDestinationEffects:await count(),prohibitedAdditionalEffects:0,tenantStates:inspect.states.length,persistedEvents:inspect.records,replayVerified:true,synthetic:true},null,2)+'\n');
});

test('real PostgreSQL stop wins an observed advisory-lock race and new dispatch has no destination effect',async t=>{
 assert.equal(process.env.TENENTE_LOCAL_PG_PORT,'55473');const cleanup=[];t.after(async()=>{for(const fn of cleanup.reverse())await fn();});
 const sql=await swarmSql({after:fn=>cleanup.push(fn),diagnostic:m=>t.diagnostic(m)}),h=await fixture({persistence:sql.persistence});
 await sql.db.exec('reset role');const database=(await sql.db.query('select current_database() as name')).rows[0].name;await sql.db.exec('set role service_role');
 const locker=new pg.Client({host:'127.0.0.1',port:55473,user:'postgres',database});await locker.connect();cleanup.push(()=>locker.end());
 const token=randomBytes(32).toString('hex'),child=fork(new URL('../tools/qualification/execution03-local-destination.mjs',import.meta.url),[],{env:{...process.env,EXECUTION03_DATABASE:database,EXECUTION03_DESTINATION_KEY:token},stdio:['ignore','ignore','pipe','ipc']});cleanup.push(async()=>{if(child.connected){child.send('stop');await once(child,'exit');}});const [ready]=await once(child,'message');
 const controls=[],pids=[];for(let i=0;i<2;i++){const client=new pg.Client({host:'127.0.0.1',port:55473,user:'postgres',database,options:'-c role=service_role'});await client.connect();cleanup.push(()=>client.end());pids.push((await client.query('select pg_backend_pid() as pid')).rows[0].pid);controls.push(new SwarmContainment({...h.deps,store:createSwarmStore({load:async id=>(await client.query('select public.load_swarm_state_v1($1) as value',[id])).rows[0].value,compareAndSwap:async(id,version,state)=>(await client.query('select public.cas_swarm_state_v1($1,$2,$3::jsonb) as value',[id,version,JSON.stringify(state)])).rows[0].value})}));}
 const request=h.request('agent:1','stop-race:pending'),admission=await controls[1].admit(tenant,'agent:1',request);assert.equal(admission.allowed,true);
 await locker.query('begin');await locker.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[tenant]);
 async function waiting(pid){for(let i=0;i<100;i++){const row=(await locker.query('select wait_event from pg_stat_activity where pid=$1',[pid])).rows[0];if(row?.wait_event==='advisory')return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Independent client did not reach actual advisory lock wait');}
 const stopping=controls[0].contain(tenant,'operator',{kind:'swarm',id:'swarm:1'},'execution03 concurrent emergency stop');await waiting(pids[0]);
 const dispatching=controls[1].dispatch(tenant,'agent:1',request,admission.leaseId);await waiting(pids[1]);await locker.query('commit');
 const stop=await stopping,dispatch=await dispatching;assert.equal(dispatch.allowed,false);assert.ok(dispatch.receipt.sequence>stop.sequence);
 if(dispatch.allowed)await fetch(`http://127.0.0.1:${ready.port}/effect`,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({request,leaseId:admission.leaseId})});
 const effects=Number((await locker.query('select count(*) as count from execution03_destination.effects')).rows[0].count);assert.equal(effects,0);
 const recovered=await sql.persistence.load(tenant);assert.ok(verifySwarmReplay(recovered.state.events,tenant));assert.equal(recovered.state.leases[admission.leaseId].state,'REVOKED');
 await writeFile('artifacts/execution03/postgres-stop-race.json',JSON.stringify({engine:'REAL_POSTGRESQL',workerBackendPids:pids,destinationBackendPid:ready.backendPid,observedAdvisoryWaits:2,stopSequence:stop.sequence,deniedDispatchSequence:dispatch.receipt.sequence,dispatchAllowed:false,independentlyObservedDestinationEffects:effects,recoveredLeaseState:recovered.state.leases[admission.leaseId].state,replayVerified:true},null,2)+'\n');
});
