import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture,tenant} from './fixtures/swarm-control.mjs';
import {verifySwarmReplay} from '../lib/swarm/containment.ts';

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
