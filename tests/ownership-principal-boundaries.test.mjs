import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createApiKeyMaterial,PUBLIC_API_KEY_PATTERN} from '../lib/public-api/v1/api-key-crypto.ts';
import {validateApiKeyRecord} from '../lib/public-api/v1/api-key-lifecycle.ts';
import {PublicApiError} from '../lib/public-api/v1/contracts.ts';

const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const foreign='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const tenant='11111111-1111-4111-8111-111111111111';
const foreignTenant='22222222-2222-4222-8222-222222222222';
const material=createApiKeyMaterial('test');
const source=readFileSync(new URL('../lib/public-api/v1/authentication.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture({patch={},approval='APPROVED',workspaceOwner=actor,membership=null,errorTable=null}={}) {
 const row={id:'key:synthetic',tenant_id:tenant,client_id:'client:synthetic',created_by:actor,owner_user_id:actor,user_id:actor,key_prefix:material.prefix,key_hash:material.secretHash,status:'active',scopes:['trust:request'],usage_count:0,...patch};
 const calls=[],updates=[];
 const db={from(table){const query={select(){return query;},eq(column,value){calls.push({table,column,value});return query;},update(value){updates.push({table,value});return query;},async maybeSingle(){return {data:table==='api_keys'?row:table==='trust_workspaces'?{created_by:workspaceOwner}:table==='workspace_members'?membership:table==='account_access_approvals'?{status:approval}:null,error:table===errorTable?{code:'SYNTHETIC_FAILURE'}:null};},then(resolve,reject){return Promise.resolve({data:null,error:null}).then(resolve,reject);}};return query;}};
 const loaded={exports:{}};
 new Function('require','module','exports',compiled)((name)=>name==='@/lib/supabase/service-role'?{createServiceRoleClient:()=>db}:name==='./contracts'?{PublicApiError}:name==='./api-key-crypto'?{PUBLIC_API_KEY_PATTERN}:name==='./api-key-lifecycle'?{validateApiKeyRecord}:{},loaded,loaded.exports);
 const request=new Request('https://api.example.invalid/api/v1/trust/requests',{headers:{authorization:'Bearer '+material.rawKey,'x-enterprise-id':foreignTenant}});
 return {authenticate:()=>loaded.exports.authenticatePublicApiRequest(request,['trust:request']),calls,updates};
}

test('email-less API service principal uses the approved database owner and tenant, ignoring requested foreign tenant',async()=>{
 const f=fixture();const principal=await f.authenticate();
 assert.equal(principal.tenantId,tenant);assert.equal(principal.createdBy,actor);assert.equal(principal.user.email,undefined);
 assert.ok(f.calls.some(x=>x.table==='workspace_members'&&x.column==='user_id'&&x.value===actor));
 assert.equal(f.calls.some(x=>x.value===foreignTenant),false);assert.equal(f.updates.length,1);
});
test('legacy nullable owner fields retain a legitimate immutable created_by binding',async()=>{
 const principal=await fixture({patch:{owner_user_id:null,user_id:null}}).authenticate();assert.equal(principal.createdBy,actor);
 const member=await fixture({workspaceOwner:foreign,membership:{role:'admin'}}).authenticate();assert.equal(member.role,'admin');
});
test('missing and inconsistent API-key principal bindings deny before privileged tenant queries or writes',async()=>{
 for(const patch of [{created_by:null},{tenant_id:null},{client_id:null},{owner_user_id:foreign},{user_id:foreign},{owner_user_id:''}]) {
  const f=fixture({patch});await assert.rejects(f.authenticate(),{code:'API_KEY_NOT_TENANT_BOUND'});
  assert.equal(f.calls.some(x=>x.table==='trust_workspaces'),false);assert.equal(f.updates.length,0);
 }
});
test('revoked owner approval and removed foreign-workspace membership deny before key usage writes',async()=>{
 for(const approval of ['PENDING','REVOKED','SUSPENDED']) {const f=fixture({approval});await assert.rejects(f.authenticate(),{code:'ACCESS_APPROVAL_REQUIRED'});assert.equal(f.updates.length,0);}
 const f=fixture({workspaceOwner:foreign});await assert.rejects(f.authenticate(),{code:'API_KEY_INACTIVE'});assert.equal(f.updates.length,0);
});
test('revoked/expired/scopeless credentials and unavailable persistence fail closed',async()=>{
 for(const [patch,code] of [[{status:'revoked'},'API_KEY_REVOKED'],[{expires_at:'2000-01-01T00:00:00Z'},'API_KEY_EXPIRED'],[{scopes:[]},'INSUFFICIENT_SCOPE']]) {const f=fixture({patch});await assert.rejects(f.authenticate(),{code});assert.equal(f.updates.length,0);}
 for(const errorTable of ['api_keys','trust_workspaces','workspace_members','account_access_approvals']) {const f=fixture({errorTable});await assert.rejects(f.authenticate(),{code:'API_AUTH_UNAVAILABLE'});assert.equal(f.updates.length,0);}
});
