import assert from 'node:assert/strict';
import {mock,test} from 'node:test';
import Module from 'node:module';
import {fileURLToPath} from 'node:url';
import {fixture,tenant} from './fixtures/swarm-control.mjs';
import {hashCanonical} from '../src/lib/trust-core/hash.ts';
import {deriveEnforcementActionDigest,signDestinationObservation} from '../lib/operational-entities/native-enforcement.ts';
process.env.NODE_PATH=fileURLToPath(new URL('./fixtures',import.meta.url));
Module._initPaths();
let h,request,health,canonical,parentCanonical,identity=true;
const payload={type:'REFUND',tool:'refund',target:'customer:1',environment:'test',purpose:'refund',workflowId:'workflow:1',financialAmount:100,executionCount:1};
const db={from(table){
  let transaction; const query={select(){return this;},eq(key,value){if(key==='transaction_id')transaction=value;return this;},order(){return this;},limit(){return this;},async maybeSingle(){
    if(table==='canonical_trust_transactions')return {data:transaction==='parent-transaction'?parentCanonical:canonical,error:null};
    if(table==='provider_health_snapshots')return {data:health,error:null};
    if(table==='trust_workspaces')return {data:{created_by:'operator'},error:null};
    throw Error('Unexpected table '+table);
  }};return query;
}};
mock.module(new URL('../lib/supabase/service-role.ts',import.meta.url).href,{namedExports:{createServiceRoleClient:()=>db}});
mock.module(new URL('../lib/swarm/store.ts',import.meta.url).href,{namedExports:{createSwarmStore:()=>h.store}});
mock.module(new URL('../lib/swarm/evidence-projection-server.ts',import.meta.url).href,{namedExports:{persistSwarmReceiptProjection:async()=>{},recoverPersistedSwarmProjections:async()=>{}}});
mock.module(new URL('../lib/operational-entities/delegated-authority-server.ts',import.meta.url).href,{namedExports:{resolveStoredDelegatedAction:async()=>{
  const resolved=await h.deps.resolve(request);
  return {action:payload,result:{decision:resolved.decision,authorityGraph:{chain:resolved.graph.grants}}};
}}});
const {createStoredSwarmControls}=await import('../lib/swarm/native-server-controls.ts');
async function setup(dependent=false, prohibited=false){
  h=await fixture({now:Date.now()});identity=true;
  // Provisioned policy is trusted persisted registry data, not execution request JSON.
  const state=await h.read();
  request=h.request('server:agent');request.action.payloadDigest=hashCanonical(payload);
  const tasks=[{component:'refund-step',id:'task:child',parentTaskId:dependent?'task:parent':null,transactionId:request.transactionId,memberId:'server:agent',payloadDigest:request.action.payloadDigest},...(dependent?[{id:'task:parent',parentTaskId:null,transactionId:'parent-transaction',memberId:'agent:1',payloadDigest:'parent-digest'}]:[])];
  parentCanonical={decision:'ALLOW',request_digest:'parent-digest'};
  const policy={tasks,prohibitedCombinations:prohibited?[['refund-step']]:[],version:'v1',allowedTools:['refund'],environments:['test'],resources:['customer:1'],aggregateBudget:{id:'shared:500',currency:'EUR',limitMinor:50000,maxParallel:5},perActionMinor:10000,evidenceRefs:['policy:approved']};
  const collective={...state.collectives['swarm:1'],id:'swarm:server',executionPolicy:policy};
  await h.control.register(tenant,'operator',collective,{...state.members['agent:1'],id:'server:agent',swarmId:collective.id,parentId:null});
  h.actors.set('server:agent',{...h.actors.get('agent:1'),id:'server:agent'});await h.beat('server:agent');
  request=h.request('server:agent');request.action.payloadDigest=hashCanonical(payload);request.actionDigest=deriveEnforcementActionDigest(request);
  canonical={decision:'ALLOW',request_digest:request.action.payloadDigest};
  health={state:'HEALTHY',observed_at:new Date().toISOString(),circuit_open:false};
  const context={enterpriseId:tenant,user:{id:'operator'},role:'owner',supabase:{...db,auth:{getUser:async()=>({data:{user:identity?{id:'operator'}:null},error:null})}}};
  return createStoredSwarmControls(context,payload);
}
test('Native server composition resolves policy, dispatches, and settles verified outcome',async()=>{
  const c=await setup();assert.equal((await c.swarmGuard.admit(request)).allowed,true);
  assert.equal((await c.swarmGuard.dispatch(request)).allowed,true);
  process.env.NATIVE_DESTINATION_EVIDENCE_KEY='local-synthetic-destination-key-32-characters';
  const observation=signDestinationObservation({observationId:crypto.randomUUID(),enterpriseId:tenant,transactionId:request.transactionId,operationalEntityId:request.operationalEntityId,destinationId:'test-destination',sourcePartyId:'test-destination',action:'REFUND',target:'customer:1',actionDigest:request.actionDigest,idempotencyKey:request.idempotencyKey,observedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),result:'OBSERVED',destinationReference:'test:effect'},process.env.NATIVE_DESTINATION_EVIDENCE_KEY);
  await c.reconcile(request,{destinationObservation:observation});
  assert.equal((await h.read()).budgets[`authority:${request.authorityId}:EUR`].spentMinor,10000);
});
test('Native server composition denies stale health, changed canonical policy and wrong payload',async()=>{
  for(const mode of ['health','canonical','payload','identity']){
    const c=await setup();
    if(mode==='health')health.observed_at=new Date(Date.now()-61000).toISOString();
    if(mode==='canonical')canonical.decision='REVIEW';
    if(mode==='payload')request.action.payloadDigest='f'.repeat(64);
    if(mode==='identity')identity=false;
    if(mode==='identity')await assert.rejects(c.swarmGuard.admit(request),/AUTHENTICATION/);
    else assert.equal((await c.swarmGuard.admit(request)).allowed,false);
    assert.equal(Object.keys((await h.read()).leases).length,0);

  }
});
test('Native server dispatch re-resolves parent revocation after admission',async()=>{
  const c=await setup();assert.equal((await c.swarmGuard.admit(request)).allowed,true);
  h.graph(g=>g.grants[0].revokedAt=new Date(h.deps.now()).toISOString());
  assert.equal((await c.swarmGuard.dispatch(request)).allowed,false);
});

test('Dependent parent REVIEW/DENY blocks dispatch; independent task remains permitted',async()=>{
  for(const decision of ['REVIEW','DENY']){
    const c=await setup(true); assert.equal((await c.swarmGuard.admit(request)).allowed,true);
    parentCanonical.decision=decision;
    assert.equal((await c.swarmGuard.dispatch(request)).allowed,false);
    assert.equal(Object.values((await h.read()).leases).some(l=>l.state==='DISPATCHED'),false);
    const independent=await setup(false);parentCanonical.decision=decision;
    assert.equal((await independent.swarmGuard.admit(request)).allowed,true);
    assert.equal((await independent.swarmGuard.dispatch(request)).allowed,true);
  }
});

test('Contract 11: wrong tool, environment and resource cause zero dispatched leases',async()=>{
  for (const field of ['tool','environment','resource']) {
    const originalTool=payload.tool;
    if(field==='tool')payload.tool='unapproved-tool';
    const c=await setup();
    if(field==='environment')request.action.environment='production';
    if(field==='resource')request.action.target='customer:foreign';
    assert.equal((await c.swarmGuard.admit(request)).allowed,false);
    assert.equal(Object.keys((await h.read()).leases).length,0);
    payload.tool=originalTool;
  }
});

test('Server task components enforce operator-provisioned prohibited combinations',async()=>{const c=await setup(false,true);const result=await c.swarmGuard.admit(request);assert.equal(result.allowed,false);assert.ok(result.reasonCodes.includes('DISTRIBUTED_PROHIBITED_ACTION'));assert.equal(Object.keys((await h.read()).leases).length,0);});
