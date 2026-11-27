import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture,tenant,authority} from './fixtures/swarm-control.mjs';
import {swarmRequestDigest,verifySwarmReplay} from '../lib/swarm/containment.ts';

test('Contract 02/03/04: unknown identity, cross-tenant joins and forged membership fail closed',async()=>{
  const h=await fixture();await assert.rejects(h.control.admit(tenant,'unknown',h.request()),/AUTHENTICATION/);
  h.actors.set('foreign',{...h.actors.get('operator'),tenantId:'foreign'});
  await assert.rejects(h.control.register(tenant,'foreign',{},{}),/AUTHENTICATION/);
  h.actors.set('forged',{...h.actors.get('agent:1'),id:'forged'});
  assert.equal((await h.control.admit(tenant,'forged',h.request('forged'))).allowed,false);
  assert.equal(h.effects(),0);
});
test('Contract 05/08/09: invalid parent, excessive depth and expired ancestor block execution',async()=>{
  const h=await fixture();await assert.rejects(h.add('child','missing'),/PARENT_INVALID/);
  h.graph(g=>{g.grants[0].expiresAt=new Date(h.deps.now()).toISOString();});
  assert.equal((await h.run()).requested,false);
  const deep=await fixture();deep.graph(g=>{
    const parent={...g.grants[0],granteeId:'orchestrator',maxDelegationDepth:0};
    g.grants=[parent,{...parent,id:'child:grant',parentGrantId:authority,grantorId:'orchestrator',grantorType:'ai_agent',granteeId:'agent:1'}];
  });
  assert.equal((await deep.run()).requested,false);assert.equal(deep.effects(),0);
});
test('Contract 12: explicit per-action quota does not invent a cumulative quota',async()=>{
  const h=await fixture();h.policy.classification.limit=1;h.policy.classification.quotaMode='PER_ACTION';
  assert.equal((await h.run()).requested,true);assert.equal((await h.run('agent:1','again')).requested,true);
  h.policy.classification.units=2;assert.equal((await h.run('agent:1','too-many')).requested,false);assert.equal(h.effects(),2);
});
test('Contract 14: ten simultaneous agents cannot exceed EUR500 shared authority',async t=>{
  const h=await fixture();for(let i=2;i<=10;i++)await h.add(`agent:${i}`);
  h.policy.classification.budget={id:'parent:500',currency:'EUR',amountMinor:10000,limitMinor:50000,maxParallel:10};
  const results=await Promise.allSettled(Array.from({length:10},(_,i)=>h.run(`agent:${i+1}`,`ten:${i}`)));
  assert.equal(results.filter(r=>r.status==='fulfilled'&&r.value.requested).length,5);
  assert.equal(h.effects(),5);assert.equal((await h.read()).budgets['parent:500'].reservedMinor,50000);
  t.diagnostic(JSON.stringify({agents:10,downstreamEffects:5,reservedMinor:50000,currency:'EUR'}));
});
test('Contract 07/14: two agents racing for final EUR100 reserve it once',async()=>{
  const h=await fixture();await h.add('agent:2');
  h.policy.classification.budget={id:'final:100',currency:'EUR',amountMinor:10000,limitMinor:10000,maxParallel:2};
  await Promise.all([h.run('agent:1','last:1'),h.run('agent:2','last:2')]);
  assert.equal(h.effects(),1);assert.equal((await h.read()).budgets['final:100'].reservedMinor,10000);
});
test('Contract 18/19: unauthorized reviewer and altered approval scope cannot execute',async()=>{
  const h=await fixture();h.policy.classification.sensitive=true;
  await assert.rejects(h.control.approve(tenant,'agent:1',h.request(),'agent:1','owner',h.deps.now()+10000,['scope:1']),/INDEPENDENT/);
  await h.control.approve(tenant,'reviewer',h.request(),'agent:1','owner',h.deps.now()+10000,['scope:1']);
  assert.equal((await h.run('agent:1','different-action')).requested,false);assert.equal(h.effects(),0);
});
test('Contract 22/23: unauthorized and foreign-tenant kill switches leave state unchanged',async()=>{
  const h=await fixture(),before=await h.read();
  await assert.rejects(h.control.contain(tenant,'agent:1',{kind:'swarm',id:'swarm:1'},'unauthorized'),/INDEPENDENT/);
  h.actors.set('foreign',{...h.actors.get('operator'),tenantId:'other'});
  await assert.rejects(h.control.contain(tenant,'foreign',{kind:'swarm',id:'swarm:1'},'foreign'),/AUTHENTICATION/);
  assert.deepEqual(await h.read(),before);
});
test('Contract 26/28: rejected outcome retains reserve and Replay retains decision-time authority',async()=>{
  const h=await fixture();await h.run();const lease=swarmRequestDigest(h.request());
  const before=(await h.read()).events.find(e=>e.kind==='LEASE_RESERVED');
  assert.equal(before.details.authoritySnapshot.grants[0].id,authority);
  assert.equal(before.details.journalOrderIsExternalExecutionOrder,false);
  await assert.rejects(h.control.outcome(tenant,'operator',lease,'forged'),/unverified/);
  const state=await h.read();assert.equal(state.leases[lease].state,'UNKNOWN');
  assert.equal(state.events.at(-1).kind,'OUTCOME_EVIDENCE_REJECTED');
  assert.ok(verifySwarmReplay(state.events,tenant));
});
test('Contract 08: denied dependent work does not block an independent task',async()=>{
  const h=await fixture();await h.add('agent:2');
  h.policy.decision='DENY';assert.equal((await h.run()).requested,false);
  h.policy.decision='ALLOW';h.policy.classification.correlationId='independent:task';
  assert.equal((await h.run('agent:2','independent')).requested,true);assert.equal(h.effects(),1);
});
test('Contract 09: revocation invalidates queued descendants while preserving in-flight uncertainty',async()=>{
  const h=await fixture();await h.add('child','agent:1');await h.add('grandchild','child');await h.add('independent');
  const queued=await h.control.admit(tenant,'grandchild',h.request('grandchild','queued'));
  await h.run('child','flight');
  const receipt=await h.control.changeMembership(tenant,'operator','agent:1','REVOKED');
  assert.deepEqual(new Set(receipt.details.affected),new Set(['agent:1','child','grandchild']));
  assert.equal((await h.control.dispatch(tenant,'grandchild',h.request('grandchild','queued'),queued.leaseId)).allowed,false);
  assert.equal((await h.read()).leases[swarmRequestDigest(h.request('child','flight'))].state,'UNKNOWN');
  assert.equal((await h.run('independent','independent')).requested,true);
});
test('Explicit time-window quotas reset only settled work; uncertain outcomes retain capacity',async()=>{
  const h=await fixture(),start=h.deps.now();
  h.policy.classification.limit=1;h.policy.classification.quotaMode='AGGREGATE';
  h.policy.classification.quotaScope='authority:quota';
  h.policy.classification.quotaWindow={start,end:start+1000};
  await h.run();h.advance(1001);
  h.policy.classification.quotaWindow={start:start+1000,end:start+2000};
  assert.equal((await h.run('agent:1','uncertain')).requested,false);
  await h.control.outcome(tenant,'operator',swarmRequestDigest(h.request()),'destination:verified');
  assert.equal((await h.run('agent:1','settled')).requested,true);
  assert.equal(h.effects(),2);
});
