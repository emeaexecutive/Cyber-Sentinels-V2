import {generateKeyPairSync,randomBytes} from 'node:crypto';
import {signCancellation,verifyCancellationEvidence} from '../lib/swarm/cancellation.ts';
import {swarmRequestDigest} from '../lib/swarm/containment.ts';
import assert from 'node:assert/strict';
import {mock,test} from 'node:test';
import {fixture,tenant} from './fixtures/swarm-control.mjs';

let h=await fixture({now:Date.now()});
let cancellationKey;const projected=[];
let role='owner',signedIn=true,serviceCalls=0;
class IdentityApiError extends Error {constructor(message,status,code){super(message);this.status=status;this.code=code;}}
mock.module(new URL('../lib/identity-signals/enterprise-context.ts',import.meta.url).href,{namedExports:{IdentityApiError,resolveIdentityEnterprise:async(request,allowed)=>{
  if(!signedIn)throw new IdentityApiError('Login required',401,'AUTHENTICATION_REQUIRED');
  if(request.headers.get('x-enterprise-id')!==tenant)throw new IdentityApiError('Tenant denied',403,'ENTERPRISE_ACCESS_DENIED');
  if(!allowed.includes(role))throw new IdentityApiError('Role denied',403,'ENTERPRISE_ROLE_DENIED');
  return {enterpriseId:tenant,user:{id:'operator'},role};
}}});
mock.module(new URL('../lib/supabase/service-role.ts',import.meta.url).href,{namedExports:{createServiceRoleClient:()=>{serviceCalls++;return {rpc:()=>{throw Error('Unexpected RPC');}};}}});
mock.module(new URL('../lib/security.ts',import.meta.url).href,{namedExports:{checkRequestRateLimit:()=>null}});
mock.module(new URL('../lib/swarm/store.ts',import.meta.url).href,{namedExports:{createSwarmStore:()=>h.store}});
mock.module(new URL('../lib/swarm/evidence-projection-server.ts',import.meta.url).href,{namedExports:{persistSwarmReceiptProjection:async e=>{projected.push(e)},recoverPersistedSwarmProjections:async()=>{}}});
mock.module(new URL('../lib/swarm/containment-keys-server.ts',import.meta.url).href,{namedExports:{configuredContainmentKey:async()=>{if(!cancellationKey)throw Error('No test key');return cancellationKey;}}});
const {GET,POST}=await import('../app/api/tenente/swarm/route.ts');
const url='https://local.test/api/tenente/swarm';
function request(body,headers={}){return new Request(url,{method:'POST',headers:{origin:'https://local.test','content-type':'application/json','x-enterprise-id':tenant,...headers},body:JSON.stringify(body)});}

test('Console route fails closed when disabled before service access',async()=>{
  delete process.env.TENENTE_SWARM_CONSOLE_ENABLED;
  assert.equal((await GET(new Request(url))).status,503);assert.equal(serviceCalls,0);
});
test('Console route denies unauthenticated, foreign tenant and read-only writes',async()=>{
  process.env.TENENTE_SWARM_CONSOLE_ENABLED='true';signedIn=false;
  assert.equal((await GET(new Request(url,{headers:{'x-enterprise-id':tenant}}))).status,401);
  signedIn=true;
  assert.equal((await GET(new Request(url,{headers:{'x-enterprise-id':'foreign'}}))).status,403);
  role='observer';assert.equal((await POST(request({action:'reconcile'}))).status,403);role='owner';
  assert.equal(serviceCalls,0);
});
test('Console route rejects cross-origin, wrong content type and oversized payload without mutations',async()=>{
  const before=await h.read();
  assert.equal((await POST(request({action:'reconcile'},{origin:'https://evil.test'}))).status,403);
  assert.equal((await POST(request({action:'reconcile'},{'content-type':'text/plain'}))).status,415);
  assert.equal((await POST(request({action:'reconcile',padding:'x'.repeat(5000)}))).status,413);
  assert.deepEqual(await h.read(),before);
});
test('Console route returns no-store tenant state and audited containment blocks adapter',async()=>{
  const read=await GET(new Request(url,{headers:{'x-enterprise-id':tenant}}));
  assert.equal(read.status,200);assert.equal(read.headers.get('cache-control'),'private, no-store');
  assert.equal((await read.json()).snapshot.tenantId,tenant);
  const result=await POST(request({action:'contain',kind:'swarm',id:'swarm:1',reason:'Route qualification'}));
  assert.equal(result.status,200);assert.equal((await result.json()).receipt.kind,'EMERGENCY_CONTAINMENT');
  assert.equal((await h.run()).requested,false);assert.equal(h.effects(),0);
});

test('Console cancellation route verifies signed command, returns status and projects each transition',async()=>{
 h=await fixture({now:Date.now()});const req=h.request();await h.control.admit(tenant,'agent:1',req);
 const keys=generateKeyPairSync('ed25519');cancellationKey={publicKey:keys.publicKey,tenantId:tenant,issuerId:'operator',swarmIds:['swarm:1'],expiresAt:Date.now()+60000,revoked:false};
 const command={domain:'tenente:cancellation:v1',tenantId:tenant,swarmId:'swarm:1',taskId:'workflow:1',executionId:swarmRequestDigest(req),reason:'route cancellation',issuer:'operator',keyId:'operator-key',nonce:'route:nonce:123456789',issuedAt:Date.now(),expiresAt:Date.now()+30000,correlationId:'route:1'};
 const previous=process.env.NATIVE_DESTINATION_EVIDENCE_KEY;const runtimeKey=randomBytes(32).toString('hex');process.env.NATIVE_DESTINATION_EVIDENCE_KEY=runtimeKey;projected.length=0;
 try{const envelope=signCancellation(command,keys.privateKey);const result=await POST(request({action:'cancel',envelope}));assert.equal(result.status,200);assert.equal((await result.json()).receipt.cancellationStatus,'CANCELLED');assert.equal(new Set(projected.map(e=>e.digest)).size,3);assert.ok(projected.every(e=>verifyCancellationEvidence(e,runtimeKey)));const snapshot=(await(await GET(new Request(url,{headers:{'x-enterprise-id':tenant}}))).json()).snapshot;assert.equal(snapshot.leases[0].taskId,'workflow:1');assert.ok(snapshot.receipts.some(r=>r.cancellationStatus==='CANCELLED'));const before=await h.read();envelope.command.reason='tamper';assert.equal((await POST(request({action:'cancel',envelope}))).status,503);assert.deepEqual(await h.read(),before);assert.equal(h.effects(),0);}finally{if(previous===undefined)delete process.env.NATIVE_DESTINATION_EVIDENCE_KEY;else process.env.NATIVE_DESTINATION_EVIDENCE_KEY=previous;}
});
