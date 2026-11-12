import test from 'node:test';
import assert from 'node:assert/strict';
import {socOperationsFixture} from './fixtures/soc-operations.mjs';
import {swarmOperations} from '../lib/swarm/operations.ts';
import {verifySwarmReplay} from '../lib/swarm/containment.ts';
test('operator command ingests signed warning once, exposes cited timeline and records analyst feedback',async()=>{
 const f=await socOperationsFixture(),envelope=f.envelope();await f.register();
 const receipt=await f.ops.command({action:'soc-ingest',envelope,tenantId:'forged-tenant'});assert.equal(receipt.kind,'WATCHTOWER_WARNING');
 await f.ops.command({action:'soc-ingest',envelope});const snapshot=await f.ops.snapshot();assert.equal(snapshot.soc.totalAlerts,1);assert.equal(snapshot.soc.responseDispatchEnabled,false);
 const alert=snapshot.soc.timeline.find(e=>e.kind==='SOC_ALERT');assert.equal(alert.tenantId,f.tenant);assert.equal(alert.details.synthetic,true);
 const feedback=await f.ops.command({action:'soc-feedback',alertDigest:alert.digest,falsePositive:true});assert.equal(feedback.kind,'SOC_FEEDBACK');assert.equal(feedback.details.falsePositive,true);
 assert.ok(verifySwarmReplay((await f.h.read()).events,f.tenant));assert.equal(f.h.effects(),0);
});
test('read-only, agent-controlled and expired identities cannot submit SOC commands',async()=>{
 const f=await socOperationsFixture(),before=await f.h.read();
 for(const actor of [{...f.h.actors.get('operator'),permissions:['swarm:audit']},{...f.h.actors.get('operator'),controlledBy:['agent:1']},{...f.h.actors.get('operator'),expiresAt:0}]){
  const ops=swarmOperations(f.h.store,async()=>actor,f.h.deps.now);
  await assert.rejects(ops.command({action:'soc-ingest',envelope:f.envelope()}),/OPERATOR_REQUIRED/);
 }
 assert.deepEqual(await f.h.read(),before);
});
test('malformed nested envelopes, invalid digests and unknown registration never mutate state',async()=>{
 const f=await socOperationsFixture(),before=await f.h.read();
 for(const envelope of [null,[],{}, {warning:{},origin:{},relays:[]},{warning:{},origin:{claims:{},signature:'x'},relays:[null]}])await assert.rejects(f.ops.command({action:'soc-ingest',envelope}),TypeError);
 for(const command of [{action:'soc-investigate',alertDigest:'not-a-digest'},{action:'soc-feedback',alertDigest:'a'.repeat(64),falsePositive:'true'},{action:'soc-register',role:'Administrator',ownerId:'operator'}])await assert.rejects(f.ops.command(command),TypeError);
 assert.deepEqual(await f.h.read(),before);
});
test('forged warning is observable rejection and grants no response authority',async()=>{
 const f=await socOperationsFixture(),envelope=f.envelope();envelope.origin.signature='x'.repeat(86);
 const r=await f.ops.command({action:'soc-ingest',envelope});assert.equal(r.details.accepted,false);assert.equal((await f.ops.snapshot()).soc.totalAlerts,0);assert.equal(Object.keys((await f.h.read()).leases).length,0);assert.equal(f.h.effects(),0);
});
test('unconfigured model produces explicit failure evidence instead of a successful model claim',async()=>{
 const priorKey=process.env.OPENAI_API_KEY,priorModel=process.env.OPENAI_SOC_MODEL;delete process.env.OPENAI_API_KEY;delete process.env.OPENAI_SOC_MODEL;
 try{const f=await socOperationsFixture();await f.register();await f.ops.command({action:'soc-ingest',envelope:f.envelope()});const alert=(await f.ops.snapshot()).soc.timeline.find(e=>e.kind==='SOC_ALERT');
  const receipt=await f.ops.command({action:'soc-investigate',alertDigest:alert.digest});assert.equal(receipt.kind,'SOC_ASSESSMENT');
  const timeline=(await f.ops.snapshot()).soc.timeline;assert.ok(timeline.some(e=>e.kind==='SOC_FAILURE'&&e.details.reason==='MODEL_NOT_CONFIGURED'));assert.equal(timeline.some(e=>e.kind==='SOC_MODEL_RUN'),false);assert.equal(f.h.effects(),0);
 }finally{if(priorKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=priorKey;if(priorModel===undefined)delete process.env.OPENAI_SOC_MODEL;else process.env.OPENAI_SOC_MODEL=priorModel;}
});
