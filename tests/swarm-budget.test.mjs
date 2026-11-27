import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture,tenant} from './fixtures/swarm-control.mjs';
import {verifySwarmReplay} from '../lib/swarm/containment.ts';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {swarmRpcPersistence} from '../lib/swarm/rpc-persistence.ts';
import {createSwarmStore} from '../lib/swarm/store.ts';

async function budgetFixture(options={}) {
  const h=await fixture(options);
  h.policy.classification.budget={id:'budget:shared',currency:'EUR',amountMinor:10000,limitMinor:50000,maxParallel:5};
  for(let i=2;i<=5;i++) await h.add(`agent:${i}`);
  const verified=new Map();
  h.deps.verifyOutcome=async (_tenant,lease,evidence)=>{
    const outcome=verified.get(evidence);
    if(!outcome || outcome.leaseId!==lease.id) throw Error('UNVERIFIED_DESTINATION');
    return {completed:true,evidenceRef:evidence,spentMinor:outcome.spentMinor};
  };
  return {...h,verified};
}

test('Five concurrent agents reserve exactly EUR500; verified failure permits bounded retry',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(await readFile(new URL('../docs/swarm-authority/proposed-persistence.sql',import.meta.url),'utf8'));
  await db.exec('set role service_role');
  const rpc=async(name,args)=>{
    try {
      const load=name==='load_swarm_state_v1';
      const query=load?'select public.load_swarm_state_v1($1) as data':'select public.cas_swarm_state_v1($1,$2,$3::jsonb) as data';
      const values=load?[args.p_tenant_id]:[args.p_tenant_id,args.p_version,JSON.stringify(args.p_state)];
      return {data:(await db.query(query,values)).rows[0].data,error:null};
    } catch(error) { return {data:null,error}; }
  };
  const persistence=swarmRpcPersistence(rpc);
  const h=await budgetFixture({persistence});
  let active=0,peak=0,spent=0,release;
  const barrier=new Promise(resolve=>{release=resolve;});
  const calls=Array.from({length:5},(_,i)=>h.run(`agent:${i+1}`,`parallel:${i+1}`,{inFlight:async()=>{
    active++;peak=Math.max(peak,active);
    if(active===5) release();
    await barrier;
    if(i!==0) spent+=10000;
    active--;
  }}));
  await Promise.all(calls);
  assert.equal(peak,5);
  let state=await h.read();
  assert.deepEqual(state.budgets['budget:shared'],{currency:'EUR',limitMinor:50000,maxParallel:5,reservedMinor:50000,spentMinor:0});
  const leases=Object.values(state.leases);
  for(const lease of leases){
    const evidence=`verified:${lease.id}`;
    h.verified.set(evidence,{leaseId:lease.id,spentMinor:lease.memberId==='agent:1'?0:10000});
    await h.control.outcome(tenant,'operator',lease.id,evidence);
  }
  const before=h.effects();
  assert.equal((await h.run('agent:1','parallel:1')).requested,false);
  assert.equal(h.effects(),before);
  await h.run('agent:1','retry:1',{inFlight:async()=>{spent+=10000;}});
  state=await h.read();
  const retry=Object.values(state.leases).find(l=>l.state==='DISPATCHED');
  h.verified.set('retry:verified',{leaseId:retry.id,spentMinor:10000});
  await h.control.outcome(tenant,'operator',retry.id,'retry:verified');
  assert.equal((await h.run('agent:1','overflow')).requested,false);
  state=await h.read();
  assert.equal(spent,50000);
  assert.equal(state.budgets['budget:shared'].spentMinor,50000);
  assert.equal(state.budgets['budget:shared'].reservedMinor,0);
  assert.ok(verifySwarmReplay(state.events,tenant));
  const reloaded=await createSwarmStore(persistence).transact(tenant,s=>structuredClone(s));
  assert.deepEqual(reloaded,state);
  t.diagnostic(JSON.stringify({agents:5,peakParallel:peak,currency:'EUR',spentMinor:spent,retryAfterVerifiedZeroSpend:true,provider:'local simulated adapter'}));
});

test('Unknown outcomes retain reserves and cannot authorize another spend',async()=>{
  const h=await budgetFixture();h.policy.classification.budget.amountMinor=50000;
  await h.run();const lease=Object.values((await h.read()).leases)[0];
  await assert.rejects(h.control.outcome(tenant,'operator',lease.id,'unverified'),/UNVERIFIED/);
  assert.equal((await h.run('agent:1','retry')).requested,false);
  assert.equal((await h.read()).budgets['budget:shared'].reservedMinor,50000);
  assert.equal(h.effects(),1);
});

test('Parallel limit rejects dispatch even when currency budget remains',async()=>{
  const h=await budgetFixture();h.policy.classification.budget.maxParallel=1;
  await h.run();assert.equal((await h.run('agent:1','second')).requested,false);
  assert.equal(h.effects(),1);
});

test('Expired never-dispatched lease refunds once; dispatched uncertainty never refunds',async()=>{
  const h=await budgetFixture();
  const admission=await h.control.admit(tenant,'agent:1',h.request());assert.equal(admission.allowed,true);
  h.advance(16000);await h.control.reconcile(tenant,'operator');
  assert.equal((await h.read()).budgets['budget:shared'].reservedMinor,0);
  await h.control.reconcile(tenant,'operator');
  assert.equal((await h.read()).budgets['budget:shared'].reservedMinor,0);
  await h.run('agent:1','dispatched');h.advance(31000);await h.control.reconcile(tenant,'operator');
  assert.equal((await h.read()).budgets['budget:shared'].reservedMinor,10000);
});

test('Invalid monetary amounts fail closed before adapter execution',async()=>{
  for(const amount of [0,-1,0.1,Number.MAX_SAFE_INTEGER+1]){
    const h=await budgetFixture();h.policy.classification.budget.amountMinor=amount;
    assert.equal((await h.run()).requested,false);assert.equal(h.effects(),0);
  }
});

test('Budget ceiling is immutable and settlement cannot exceed reserved amount',async()=>{
  const h=await budgetFixture();await h.run();
  h.policy.classification.budget.limitMinor=100000;
  assert.equal((await h.run('agent:1','expanded')).requested,false);
  const lease=Object.values((await h.read()).leases)[0];
  h.verified.set('overspend',{leaseId:lease.id,spentMinor:10001});
  await assert.rejects(h.control.outcome(tenant,'operator',lease.id,'overspend'),/BUDGET_OUTCOME_INVALID/);
  assert.equal((await h.read()).budgets['budget:shared'].reservedMinor,10000);
});
