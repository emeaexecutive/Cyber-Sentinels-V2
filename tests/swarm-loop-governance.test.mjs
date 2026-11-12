import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture,tenant} from './fixtures/swarm-control.mjs';
import {SwarmContainment,swarmRequestDigest,verifySwarmReplay} from '../lib/swarm/containment.ts';
import {createSwarmStore} from '../lib/swarm/store.ts';

// This is a bounded, LOCAL synthetic qualification. It does not prove a hosted
// provider's dispatch, hosted multi-connection Postgres, or cancellation.
test('delegated agents race for the last shared retry slot: one effect, one DENY', async () => {
  const h=await fixture();
  await h.add('agent:2','agent:1');
  h.policy.classification.quotaMode='AGGREGATE';
  h.policy.classification.quotaScope='loop:incident-1';
  h.policy.classification.limit=2;
  assert.equal((await h.run('agent:1','loop:first')).requested,true);
  const attempts=await Promise.all([
    h.run('agent:1','loop:second'),
    h.run('agent:2','loop:delegated'),
  ]);
  assert.equal(attempts.filter(r=>r.requested).length,1);
  assert.equal(h.effects(),2);
  const state=await h.read();
  const denied=state.events.filter(e=>e.kind==='EXECUTION_DENIED');
  assert.ok(denied.some(e=>e.details.reasons.includes('COLLECTIVE_LIMIT_EXCEEDED')));
  assert.equal(Object.keys(state.leases).length,2);
  assert.ok(verifySwarmReplay(state.events,tenant));
});

test('shared scope cannot be bypassed by changing a trusted classified operation',async()=>{
  const h=await fixture();
  await h.add('agent:2','agent:1');
  h.policy.classification.quotaMode='AGGREGATE';
  h.policy.classification.quotaScope='loop:incident-2';
  h.policy.classification.limit=1;
  assert.equal((await h.run('agent:1','loop:first')).requested,true);
  h.policy.classification.operation='ALTERNATE_TOOL';
  assert.equal((await h.run('agent:2','loop:handoff')).requested,false);
  assert.equal(h.effects(),1);
  const state=await h.read();
  assert.ok(state.events.some(e=>e.kind==='EXECUTION_DENIED'&&e.details.reasons.includes('COLLECTIVE_LIMIT_EXCEEDED')));
  assert.ok(verifySwarmReplay(state.events,tenant));
});

test('agent cannot expand an established scoped limit after dispatch',async()=>{
  const h=await fixture();
  h.policy.classification.quotaMode='AGGREGATE';
  h.policy.classification.quotaScope='loop:incident-3';
  h.policy.classification.limit=1;
  assert.equal((await h.run('agent:1','loop:first')).requested,true);
  h.policy.classification.limit=20;
  assert.equal((await h.run('agent:1','loop:expanded')).requested,false);
  assert.equal(h.effects(),1);
  const state=await h.read();
  assert.ok(state.events.some(e=>e.kind==='EXECUTION_DENIED'&&e.details.reasons.includes('SHARED_QUOTA_POLICY_MISMATCH')));
});

test('invalid scope names fail closed; labelled PER_ACTION keeps its historic semantics',async()=>{
  for(const scope of ['', '__proto__']) {
    const h=await fixture();
    h.policy.classification.quotaMode='PER_ACTION';
    h.policy.classification.quotaScope=scope;
    assert.equal((await h.run('agent:1','loop:invalid')).requested,false);
    assert.equal(h.effects(),0);
    assert.ok((await h.read()).events.some(e=>e.kind==='EXECUTION_DENIED'&&e.details.reasons.includes('QUOTA_SCOPE_INVALID')));
  }
  const h=await fixture();
  h.policy.classification.quotaMode='PER_ACTION';
  h.policy.classification.quotaScope='authority:existing-audit-label';
  h.policy.classification.limit=1;
  assert.equal((await h.run('agent:1','per-action:first')).requested,true);
  assert.equal((await h.run('agent:1','per-action:second')).requested,true);
  assert.equal(h.effects(),2);
});

test('shared allowance cannot be downgraded to PER_ACTION after consumption',async()=>{
  const h=await fixture();Object.assign(h.policy.classification,{quotaMode:'AGGREGATE',quotaScope:'loop:mode-fence',limit:1});
  assert.equal((await h.run('agent:1','first')).requested,true);
  h.policy.classification.quotaMode='PER_ACTION';
  assert.equal((await h.run('agent:1','downgrade')).requested,false);
  assert.equal(h.effects(),1);
  assert.ok((await h.read()).events.at(-1).details.reasons.includes('SHARED_QUOTA_POLICY_MISMATCH'));
});

test('active shared window cannot slide or expand after a completed destination effect',async()=>{
  for(const mutation of ['slide','expand','remove']){
    const h=await fixture(),now=h.deps.now();Object.assign(h.policy.classification,{quotaMode:'AGGREGATE',quotaScope:'loop:window',limit:1,quotaWindow:{start:now-1000,end:now+1000}});
    assert.equal((await h.run('agent:1','first')).requested,true);
    await h.control.outcome(tenant,'operator',swarmRequestDigest(h.request('agent:1','first')),'destination:verified');
    if(mutation==='remove')delete h.policy.classification.quotaWindow;
    else h.policy.classification.quotaWindow={start:now,end:now+(mutation==='expand'?5000:2000)};
    assert.equal((await h.run('agent:1','changed-window')).requested,false);
    assert.equal(h.effects(),1);
  }
});

test('completed window rolls over, but UNKNOWN old-window work retains its allowance',async()=>{
  for(const completed of [false,true]){
    const h=await fixture(),now=h.deps.now();Object.assign(h.policy.classification,{quotaMode:'AGGREGATE',quotaScope:'loop:rollover',limit:1,quotaWindow:{start:now-1000,end:now+1000}});
    assert.equal((await h.run('agent:1','first')).requested,true);
    const lease=swarmRequestDigest(h.request('agent:1','first'));
    if(completed)await h.control.outcome(tenant,'operator',lease,'destination:verified');
    else await assert.rejects(h.control.outcome(tenant,'operator',lease,'unverified'));
    h.advance(2000);h.policy.classification.quotaWindow={start:now+1000,end:now+3000};
    assert.equal((await h.run('agent:1','new-window')).requested,completed);
    assert.equal(h.effects(),completed?2:1);
  }
});

test('240 retries across delegated agents, alternate resources and tools produce no post-limit effects',async()=>{
  const h=await fixture();await h.add('agent:2','agent:1');Object.assign(h.policy.classification,{quotaMode:'AGGREGATE',quotaScope:'loop:240',limit:1});
  assert.equal((await h.run('agent:1','first')).requested,true);
  for(let i=0;i<240;i++){
    h.policy.classification.operation=`tool:${i%3}`;h.policy.classification.resource=`resource:${i%5}`;
    assert.equal((await h.run(i%2?'agent:1':'agent:2',`retry:${i}`)).requested,false);
  }
  const state=await h.read();assert.equal(h.effects(),1);assert.equal(Object.keys(state.leases).length,1);
  assert.equal(state.events.filter(e=>e.kind==='EXECUTION_DENIED').length,240);assert.ok(verifySwarmReplay(state.events,tenant));
});

test('restart preserves shared consumption, timeout uncertainty, emergency stop and revocation fences',async()=>{
  let stored=null;const persistence={load:async()=>structuredClone(stored),compareAndSwap:async(t,v,state)=>{if((stored?.version??0)!==v)return false;stored={version:v+1,state:structuredClone(state)};return true;}};
  const h=await fixture({persistence});Object.assign(h.policy.classification,{quotaMode:'AGGREGATE',quotaScope:'loop:restart',limit:2});
  assert.equal((await h.run('agent:1','timeout')).requested,true);
  await assert.rejects(h.control.outcome(tenant,'operator',swarmRequestDigest(h.request('agent:1','timeout')),'timeout'));
  const store=createSwarmStore(persistence),control=new SwarmContainment({...h.deps,store});
  const request=h.request('agent:1','after-restart');const admit=await control.admit(tenant,'agent:1',request);assert.equal(admit.allowed,true);
  await control.contain(tenant,'operator',{kind:'swarm',id:'swarm:1'},'emergency loop stop');
  assert.equal((await control.dispatch(tenant,'agent:1',request,admit.leaseId)).allowed,false);assert.equal(h.effects(),1);
  await control.changeMembership(tenant,'operator','agent:1','REVOKED','revoked during loop');
  assert.equal((await control.admit(tenant,'agent:1',h.request('agent:1','revoked'))).allowed,false);assert.equal(h.effects(),1);
  assert.ok(verifySwarmReplay((await persistence.load(tenant)).state.events,tenant));
});
