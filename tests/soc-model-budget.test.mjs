import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {SocModelBudget} from '../lib/soc/model-budget.ts';
import {createFileSwarmPersistence} from '../lib/swarm/file-persistence.ts';
import {createSwarmStore} from '../lib/swarm/store.ts';
import {verifySwarmReplay} from '../lib/swarm/containment.ts';
const tenant='10000000-0000-4000-8000-000000000001';
const config={approved:true,environment:'test',tenantId:tenant,scope:'tenant-model-spend',policyVersion:'approved-v1',provider:'fixture',model:'fixture-model',windowMs:60000,maxWindowCalls:3,maxTotalCalls:5,maxAttemptsPerInvestigation:1,maxParallel:1,maxDurationMs:100,maxInputBytes:32768,maxOutputTokens:1800,maxWindowSpendMicros:30,maxTotalSpendMicros:50,reserveMicrosPerCall:10};
async function setup(t,overrides={},verifyBilling){
 const directory=await mkdtemp(join(tmpdir(),'soc-budget-'));t.after(()=>{assert.equal(resolve(dirname(directory)),resolve(tmpdir()));return rm(directory,{recursive:true,force:true});});
 let now=Date.parse('2026-11-12T12:00:00Z');const persistence=createFileSwarmPersistence(directory),store=createSwarmStore(persistence),deps={store,now:()=>now,verifyBilling};
 return {budget:new SocModelBudget(deps,{...config,...overrides}),persistence,store,deps,advance:n=>now+=n,events:async()=>(await persistence.load(tenant)).state.events};
}
test('model spend is reserved before inference; successful usage telemetry cannot settle money',async t=>{
 const f=await setup(t);let calls=0;const result=await f.budget.run(tenant,'alert:1',async()=>{calls++;assert.equal((await f.events()).at(-1).kind,'SOC_MODEL_BUDGET_RESERVED');return{tokens:1,costUsd:0};});assert.equal(calls,1);assert.equal(result.costUsd,0);assert.equal((await f.events()).at(-1).details.billing,'UNKNOWN');await assert.rejects(f.budget.reconcile(tenant,'x',{}),/BILLING_VERIFIER_REQUIRED/);assert.ok(verifySwarmReplay(await f.events(),tenant));
});
test('independent persistent stores race for final monetary allowance with one provider call',async t=>{
 const f=await setup(t,{maxWindowSpendMicros:10,maxTotalSpendMicros:10,maxParallel:2});const other=new SocModelBudget({...f.deps,store:createSwarmStore(f.persistence)},{...config,maxWindowSpendMicros:10,maxTotalSpendMicros:10,maxParallel:2});let calls=0;
 const results=await Promise.allSettled([f.budget.run(tenant,'alert:1',async()=>++calls),other.run(tenant,'alert:2',async()=>++calls)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(calls,1);assert.equal((await f.events()).filter(e=>e.kind==='SOC_MODEL_BUDGET_RESERVED').length,1);
});
test('process crash reservation survives restart, window rollover and configuration cloning',async t=>{
 const f=await setup(t,{maxWindowSpendMicros:10,maxTotalSpendMicros:10});const supplied={...config,maxWindowSpendMicros:10,maxTotalSpendMicros:10};const b=new SocModelBudget(f.deps,supplied);supplied.maxTotalSpendMicros=1000;await b.reserve(tenant,'alert:1','call:1');f.advance(60001);const recovered=new SocModelBudget({...f.deps,store:createSwarmStore(f.persistence)},{...config,maxWindowSpendMicros:10,maxTotalSpendMicros:10});await assert.rejects(recovered.run(tenant,'alert:2',async()=>assert.fail('must not call')),/PARALLEL_LIMIT|SPEND_LIMIT/);assert.equal(b.configuration.maxTotalSpendMicros,10);
});
test('hard duration aborts local wait and retains UNKNOWN billing with no automatic retry',async t=>{
 const f=await setup(t,{maxDurationMs:5});let signal;await assert.rejects(f.budget.run(tenant,'alert:1',async s=>{signal=s;return new Promise(()=>{});}),/DURATION_LIMIT/);assert.equal(signal.aborted,true);assert.equal((await f.events()).at(-1).details.billing,'UNKNOWN');await assert.rejects(f.budget.run(tenant,'alert:1',async()=>assert.fail('retry')),/RETRY_LIMIT/);
});
test('window and cumulative call counts persist even when verified billing is zero',async t=>{
 let expected;const f=await setup(t,{maxWindowCalls:1},async()=>expected);const r=await f.budget.reserve(tenant,'alert:1','call:1');expected={tenantId:tenant,reservationDigest:r.digest,provider:'fixture',model:'fixture-model',chargedMicros:0,invoiceLineId:'invoice:1',evidenceRef:'independent:1'};await f.budget.reconcile(tenant,r.digest,{});await assert.rejects(f.budget.run(tenant,'alert:2',async()=>{}),/CALL_LIMIT/);f.advance(60001);await f.budget.run(tenant,'alert:2',async()=>{});
});
test('trusted attempt cap rejects handoff/retry under same investigation',async t=>{
 const f=await setup(t);await f.budget.run(tenant,'alert:shared',async()=>{});await assert.rejects(f.budget.run(tenant,'alert:shared',async()=>{}),/RETRY_LIMIT/);await assert.rejects(f.budget.reserve(tenant,'alert:other',(await f.events()).find(e=>e.kind==='SOC_MODEL_BUDGET_RESERVED').details.invocationId),/INVOCATION_REPLAY/);
});
test('independently verified charge releases only its own reservation; invoice replay denied',async t=>{
 let charge;const f=await setup(t,{},async()=>charge);const r=await f.budget.reserve(tenant,'alert:1','call:1');charge={tenantId:tenant,reservationDigest:r.digest,provider:'fixture',model:'fixture-model',chargedMicros:3,invoiceLineId:'invoice:1',evidenceRef:'signed:billing:1'};assert.equal((await f.budget.reconcile(tenant,r.digest,{})).details.chargedMicros,3);await assert.rejects(f.budget.reconcile(tenant,r.digest,{}),/REPLAY_OR_BINDING/);
 const r2=await f.budget.reserve(tenant,'alert:2','call:2');charge.reservationDigest=r2.digest;await assert.rejects(f.budget.reconcile(tenant,r2.digest,{}),/REPLAY_OR_BINDING/);
});
test('cross-tenant or wrong-provider charge and over-reservation bill cannot release held money',async t=>{
 let charge;const f=await setup(t,{},async()=>charge);const r=await f.budget.reserve(tenant,'alert:1','call:1'),base={tenantId:tenant,reservationDigest:r.digest,provider:'fixture',model:'fixture-model',chargedMicros:3,invoiceLineId:'invoice:1',evidenceRef:'signed:1'};
 for(const change of [{tenantId:'other'},{provider:'forged'},{chargedMicros:11}]){charge={...base,...change};await assert.rejects(f.budget.reconcile(tenant,r.digest,{}));}assert.equal((await f.events()).filter(e=>e.kind==='SOC_MODEL_BUDGET_RECONCILED').length,0);await assert.rejects(f.budget.reserve('other','alert:2','call:2'),/TENANT_DENIED/);
});
test('provider rejection retains worst-case reservation rather than assuming no charge',async t=>{
 const f=await setup(t,{maxWindowSpendMicros:10,maxTotalSpendMicros:10});await assert.rejects(f.budget.run(tenant,'alert:1',async()=>{throw Error('connection lost');}),/connection lost/);await assert.rejects(f.budget.run(tenant,'alert:2',async()=>{}),/PARALLEL_LIMIT|SPEND_LIMIT/);assert.equal((await f.events()).filter(e=>e.kind==='SOC_MODEL_BUDGET_RESERVED').length,1);
});
test('only explicit approved non-production positive safe-integer configuration is accepted',async t=>{
 const f=await setup(t);for(const change of [{approved:false},{environment:'production'},{reserveMicrosPerCall:0},{maxDurationMs:30001},{maxAttemptsPerInvestigation:4},{maxTotalSpendMicros:NaN},{maxParallel:0}])assert.throws(()=>new SocModelBudget(f.deps,{...config,...change}),/CONFIGURATION/);
});
test('configured model callback without trusted budget never invokes inference',async t=>{
 const {createSocFixture}=await import('./fixtures/soc-control.mjs');let calls=0;
 const f=await createSocFixture(t,{investigate:async()=>{calls++;return{authority:'NONE'};}});delete f.deps.modelBudget;
 await f.ready();assert.equal(calls,0);assert.ok((await f.soc.snapshot(tenant,'operator')).timeline.some(e=>e.kind==='SOC_FAILURE'&&e.details.reason==='MODEL_UNAVAILABLE_OR_INVALID'));
});
test('restart cannot expand a persisted budget or swap provider/model under the same scope',async t=>{
 const f=await setup(t),reservation=await f.budget.reserve(tenant,'alert:original','call:original');assert.match(reservation.details.configurationDigest,/^[a-f0-9]{64}$/);
 const changes=[{maxTotalSpendMicros:100},{maxWindowSpendMicros:100},{maxTotalCalls:100},{maxWindowCalls:100},{maxAttemptsPerInvestigation:2},{maxParallel:2},{maxDurationMs:200},{provider:'other-provider'},{model:'other-model'},{policyVersion:'new-version'}];
 for(const [index,change] of changes.entries()){
  const restarted=new SocModelBudget({...f.deps,store:createSwarmStore(f.persistence)},{...config,...change});
  await assert.rejects(restarted.run(tenant,'alert:changed:'+index,async()=>assert.fail('changed policy must not invoke provider')),/POLICY_BINDING_CHANGED/);
 }
 const events=await f.events();assert.equal(events.filter(e=>e.kind==='SOC_MODEL_BUDGET_RESERVED').length,1);assert.equal(events.filter(e=>e.kind==='SOC_MODEL_BUDGET_RECONCILED').length,0);assert.ok(events.filter(e=>e.kind==='SOC_MODEL_BUDGET_DENIED').every(e=>e.details.reason==='SOC_MODEL_POLICY_BINDING_CHANGED'));
});
