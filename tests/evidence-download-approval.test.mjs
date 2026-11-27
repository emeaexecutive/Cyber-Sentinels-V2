import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/api/evidence/download/route.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const path='11111111-1111-4111-8111-111111111111/proof.pdf';
function fixture({user=true,approval=[true,true],rpcError=null}={}) {
 const calls=[];let i=0;
 const client={auth:{getUser:async()=>({data:{user:user?{id:'subject'}:null},error:null})},rpc:async(name,args)=>{calls.push({name,args});return {data:approval[i++]??false,error:rpcError};}};
 const service={storage:{from:bucket=>({download:async value=>{calls.push({bucket,path:value});return {data:new Blob(['private proof']),error:null};}})}};
 const exports={};vm.runInNewContext(compiled,{exports,require:name=>name.endsWith('/service-role')?{createServiceRoleClient:()=>service}:{createClient:async()=>client},URL,Response,Blob});
 return {get:exports.GET,calls};
}
test('unapproved or wrong-owner evidence request never reads backend bytes',async()=>{
 for(const state of ['PENDING','DENIED','SUSPENDED','REVOKED','APPROVED_WRONG_TENANT']){
  const f=fixture({approval:[false]});const r=await f.get(new Request('https://example.test/api/evidence/download?path='+path));
  assert.equal(r.status,404,state);assert.equal(f.calls.filter(c=>c.bucket).length,0);
 }
});
test('approved owner receives bytes without a reusable signed URL or cache permission',async()=>{
 const f=fixture();const r=await f.get(new Request('https://example.test/api/evidence/download?path='+path));
 assert.equal(r.status,200);assert.equal(await r.text(),'private proof');assert.equal(r.headers.get('location'),null);
 for(const header of ['cache-control','cdn-cache-control','vercel-cdn-cache-control'])assert.match(r.headers.get(header),/no-store/);
 assert.equal(f.calls.length,3);assert.equal(f.calls[0].args.p_object_name,path);assert.equal(f.calls[2].name,'security_closure_evidence_object_owner');
});
test('approval lost while fetching the object prevents delivery',async()=>{
 const f=fixture({approval:[true,false]});const r=await f.get(new Request('https://example.test/api/evidence/download?path='+path));
 assert.equal(r.status,404);assert.ok(!(await r.text()).includes('private proof'));
});
test('invalid paths, missing identity and failed authorization checks fail closed',async()=>{
 for(const value of ['../secret','https://elsewhere.test/file',path+'/../secret']){
  const f=fixture();const r=await f.get(new Request('https://example.test/api/evidence/download?path='+encodeURIComponent(value)));assert.equal(r.status,400);assert.equal(f.calls.length,0);
 }
 const anonymous=fixture({user:false});assert.equal((await anonymous.get(new Request('https://example.test/api/evidence/download?path='+path))).status,401);
 const broken=fixture({rpcError:{code:'database_unavailable'}});assert.equal((await broken.get(new Request('https://example.test/api/evidence/download?path='+path))).status,404);assert.equal(broken.calls.filter(c=>c.bucket).length,0);
});
