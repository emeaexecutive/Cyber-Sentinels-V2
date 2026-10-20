import assert from 'node:assert/strict';
import {mock,test} from 'node:test';
import {fixture,tenant} from './fixtures/swarm-control.mjs';

const h=await fixture({now:Date.now()});
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
mock.module(new URL('../lib/swarm/evidence-projection-server.ts',import.meta.url).href,{namedExports:{persistSwarmReceiptProjection:async()=>{},recoverPersistedSwarmProjections:async()=>{}}});
mock.module(new URL('../lib/swarm/containment-keys-server.ts',import.meta.url).href,{namedExports:{configuredContainmentKey:async()=>{throw Error('No test key');}}});
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
