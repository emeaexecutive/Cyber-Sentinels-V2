import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {fixture,tenant} from './fixtures/swarm-control.mjs';
import {createHttpToolAdapter,verifyToolDispatch} from '../lib/operational-entities/http-tool-adapter.ts';
import {signDestinationObservation,verifyDestinationObservation,deriveEnforcementActionDigest,executeAuthorizedAction} from '../lib/operational-entities/native-enforcement.ts';
import {swarmNativeGuard} from '../lib/swarm/native-guard.ts';
import {swarmRequestDigest,verifySwarmReplay} from '../lib/swarm/containment.ts';
import {hashCanonical} from '../src/lib/trust-core/hash.ts';

for(const transport of ['http','mcp']) test(`${transport}: five-agent EUR500 enforcement across real loopback requests, failure and retry`,{timeout:20000},async t=>{
  const h=await fixture({now:Date.now()});
  for(let i=2;i<=5;i++) await h.add(`agent:${i}`);
  h.policy.classification.budget={id:'budget:network',currency:'EUR',amountMinor:10000,limitMinor:50000,maxParallel:5};
  const key=randomBytes(32).toString('hex'),payload={currency:'EUR',amountMinor:10000};
  const evidence=new Map(),requests=new Map(),seen=new Set();
  let calls=0,active=0,peak=0,spent=0,release;
  const barrier=new Promise(resolve=>{release=resolve;});
  const server=createServer(async(req,res)=>{
    try {
      let body='';for await(const chunk of req)body+=chunk;
      assert.ok(verifyToolDispatch(body,String(req.headers['x-tenente-dispatch-signature']),key));
      const parsed=JSON.parse(body),mcp=parsed.method==='tools/call';
      const request=mcp?parsed.params._meta.authority:parsed.authority;
      const args=mcp?parsed.params.arguments:parsed.arguments;
      assert.deepEqual(args,payload);assert.equal(request.action.payloadDigest,hashCanonical(args));
      assert.equal(request.actionDigest,deriveEnforcementActionDigest(request));
      assert.equal(seen.has(request.idempotencyKey),false);seen.add(request.idempotencyKey);
      calls++;active++;peak=Math.max(peak,active);
      if(calls===5)release();
      if(calls<=5)await barrier;
      const failed=request.idempotencyKey==='network:1';
      if(!failed)spent+=args.amountMinor;
      assert.ok(spent<=50000);active--;
      const observation=signDestinationObservation({observationId:randomUUID(),enterpriseId:tenant,transactionId:request.transactionId,operationalEntityId:request.operationalEntityId,destinationId:'local-budget-tool',action:request.action.type,target:request.action.target,actionDigest:request.actionDigest,idempotencyKey:request.idempotencyKey,observedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),result:failed?'FAILED':'OBSERVED',destinationReference:failed?'local:verified-zero-effect':'local:charged-10000',sourcePartyId:'local-budget-tool'},key);
      evidence.set(swarmRequestDigest(request),observation);
      const result={status:failed?'FAILED':'ACCEPTED',adapterReference:observation.destinationReference,acknowledgedAt:new Date().toISOString(),executionClaim:null,runtimeObservation:null,destinationObservation:observation,reasonCodes:[]};
      res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(mcp?{jsonrpc:'2.0',id:parsed.id,result:{structuredContent:result}}:result));
    }catch(error){res.writeHead(500);res.end();t.diagnostic(error.message);}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const adapter=createHttpToolAdapter({endpoint:`http://127.0.0.1:${server.address().port}/tool`,tool:'refund',payload,evidenceKey:key,transport,allowLocal:true});
  h.deps.verifyOutcome=async(_tenant,lease,observation)=>{
    const request=requests.get(lease.id);assert.ok(request);
    verifyDestinationObservation({observation,evidenceKey:key,expectedEnterpriseId:tenant,expectedTransactionId:request.transactionId,expectedEntityId:lease.memberId});
    assert.equal(observation.actionDigest,request.actionDigest);assert.equal(observation.idempotencyKey,request.idempotencyKey);
    assert.equal(observation.target,request.action.target);assert.equal(observation.action,request.action.type);
    assert.equal(observation.destinationId,'local-budget-tool');
    // This qualification destination explicitly attests zero effects on FAILED.
    // Generic provider failure must remain UNKNOWN without equivalent evidence.
    const zero=observation.result==='FAILED'&&observation.destinationReference==='local:verified-zero-effect';
    assert.ok(zero||observation.result==='OBSERVED');
    return {completed:true,evidenceRef:observation.evidenceDigest,spentMinor:zero?0:payload.amountMinor};
  };
  async function run(id,idempotencyKey){
    const request=h.request(id,idempotencyKey);request.action.payloadDigest=hashCanonical(payload);request.actionDigest=deriveEnforcementActionDigest(request);
    requests.set(swarmRequestDigest(request),request);
    return executeAuthorizedAction(request,{findByIdempotencyKey:async()=>null,loadCurrentState:async()=>({enterpriseId:tenant,operationalEntityId:id,authorityId:request.authorityId,delegationId:request.delegationId,authorityActive:true,delegationActive:true,identityVerified:true,ownerConfirmed:true,runtimeContinuity:'MATCH'}),reserveRequest:async()=>({created:true}),requireSwarmGuard:true,swarmGuard:swarmNativeGuard(h.control,tenant,id),adapter});
  }
  await Promise.all(Array.from({length:5},(_,i)=>run(`agent:${i+1}`,`network:${i+1}`)));
  assert.equal(calls,5);assert.equal(peak,5);assert.equal(spent,40000);
  assert.equal((await h.read()).budgets['budget:network'].reservedMinor,50000);
  for(const [leaseId,observation] of evidence)await h.control.outcome(tenant,'operator',leaseId,observation);
  await run('agent:1','network:1');assert.equal(calls,5);
  await run('agent:1','network:retry');assert.equal(calls,6);assert.equal(spent,50000);
  const pending=Object.values((await h.read()).leases).find(l=>l.state==='DISPATCHED');
  await h.control.outcome(tenant,'operator',pending.id,evidence.get(pending.id));
  await run('agent:1','network:overflow');assert.equal(calls,6);
  assert.deepEqual((await h.read()).budgets['budget:network'],{currency:'EUR',limitMinor:50000,maxParallel:5,reservedMinor:0,spentMinor:50000});
  assert.ok(verifySwarmReplay((await h.read()).events,tenant));
  t.diagnostic(JSON.stringify({transport,peakParallel:peak,networkCalls:calls,spentMinor:spent,externalProvider:false}));
});
