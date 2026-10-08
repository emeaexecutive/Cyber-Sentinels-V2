import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const source=ts.createSourceFile('route.ts',fs.readFileSync(new URL('../app/api/waitlist/route.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
const handler=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='POST');
const code=ts.transpileModule(handler.getText(source).replace(/^export /,'')+'; POST',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function setup({verified=true}={}) {
 const writes=[];let clients=0;
 const post=vm.runInNewContext(code,{
  NextResponse:{json:(body,options={})=>({body,status:options.status??200})},
  checkRequestRateLimit:()=>null,getClientIp:()=>null,getExpectedTurnstileHostname:()=> 'example.test',getTurnstileTokenFromJson:b=>b.token,
  verifyTurnstileToken:async()=>({ok:verified,reason:verified?undefined:'invalid_token'}),
  createServiceRoleClient:()=>{clients++;return {from:table=>({insert:async row=>{writes.push({table,row});return {error:null};}})};},
  getRequestRiskFields:()=>({source:'validated_request'}),recordTrustEvent:async()=>{},configurationError:()=>({status:503}),
  URL,console,
 });
 return {post,writes,clients:()=>clients};
}
test('public waitlist submission uses the server writer only after Turnstile validation',async()=>{
 const f=setup();const response=await f.post(new Request('https://example.test/api/waitlist',{method:'POST',body:JSON.stringify({email:'Person@Example.test',token:'test-only',approval:'APPROVED',enterprise_id:'foreign',user_id:'other'})}));
 assert.equal(response.status,200);assert.equal(f.clients(),1);assert.equal(f.writes.length,1);
 assert.equal(f.writes[0].table,'waitlist');assert.deepEqual(JSON.parse(JSON.stringify(f.writes[0].row)),{email:'person@example.test',source:'validated_request'});
});
test('rejected bot verification cannot obtain a server writer or persist a row',async()=>{
 const f=setup({verified:false});const response=await f.post(new Request('https://example.test/api/waitlist',{method:'POST',body:JSON.stringify({email:'person@example.test'})}));
 assert.equal(response.status,400);assert.equal(f.clients(),0);assert.equal(f.writes.length,0);
});
test('invalid submission cannot obtain a server writer',async()=>{
 const f=setup();const response=await f.post(new Request('https://example.test/api/waitlist',{method:'POST',body:JSON.stringify({email:'invalid'})}));
 assert.equal(response.status,400);assert.equal(f.clients(),0);
});
