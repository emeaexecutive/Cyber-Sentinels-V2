import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture,tenant} from './fixtures/swarm-control.mjs';
import {swarmOperations} from '../lib/swarm/operations.ts';

test('Console kill command persists receipt and blocks controlled execution',async()=>{
  const h=await fixture();const ops=swarmOperations(h.store,async()=>h.actors.get('operator'),h.deps.now);
  const receipt=await ops.command({action:'contain',kind:'swarm',id:'swarm:1',reason:'Operator containment drill'});
  assert.equal(receipt.kind,'EMERGENCY_CONTAINMENT');
  assert.equal((await h.run()).requested,false);assert.equal(h.effects(),0);
  const snapshot=await ops.snapshot();assert.equal(snapshot.members[0].state,'SUSPENDED');
  assert.equal(snapshot.quarantines[0].receipt,receipt.digest);
  assert.equal('details' in snapshot.receipts[0],false);
});

test('Console tenant comes from authentication, never submitted tenant or role',async()=>{
  const h=await fixture();const other={...h.actors.get('operator'),tenantId:'10000000-0000-4000-8000-000000000099'};
  // Separate tenant store is required by the persistence contract.
  const isolated={transact:async(id,fn)=>{assert.equal(id,other.tenantId);return fn({tenantId:id,collectives:{},members:{},budgets:{},quarantines:[],leases:{},events:[]});}};
  const ops=swarmOperations(isolated,async()=>other,h.deps.now);
  assert.equal((await ops.snapshot()).members.length,0);
  const readonly={...h.actors.get('operator'),permissions:['swarm:audit']};
  const readOps=swarmOperations(h.store,async()=>readonly,h.deps.now);
  await assert.rejects(readOps.command({action:'contain',kind:'swarm',id:'swarm:1',reason:'test',tenantId:tenant,permissions:['swarm:contain']}),/INDEPENDENT_OPERATOR/);
  assert.equal((await h.read()).quarantines.length,0);
});

test('Console denies expired, agent and agent-controlled identities without mutations',async()=>{
  const h=await fixture(),before=await h.read();
  for(const actor of [{...h.actors.get('operator'),expiresAt:0},{...h.actors.get('operator'),kind:'agent'},{...h.actors.get('operator'),controlledBy:['agent:1']}]){
    const ops=swarmOperations(h.store,async()=>actor,h.deps.now);
    await assert.rejects(ops.snapshot(),/INDEPENDENT_OPERATOR/);
    await assert.rejects(ops.command({action:'reconcile'}),/INDEPENDENT_OPERATOR/);
  }
  assert.deepEqual(await h.read(),before);
});

test('Console cannot grant authority, restore scopes or accept malformed containment',async()=>{
  const h=await fixture(),before=await h.read();const ops=swarmOperations(h.store,async()=>h.actors.get('operator'),h.deps.now);
  for(const input of [null,{action:'approve'},{action:'restore'},{action:'contain',kind:'global',id:'swarm:1',reason:'test'},{action:'contain',kind:'swarm',id:'swarm:1',reason:''}])await assert.rejects(ops.command(input),TypeError);
  assert.deepEqual(await h.read(),before);
});
