import {readFileSync} from 'node:fs';
import test from 'node:test';import assert from 'node:assert/strict';
import {getApprovedAuthOrigin} from '../lib/auth/password-recovery.ts';
import {createProtectedAuthHandler,authChallengeActions} from '../lib/auth/protected-auth.ts';
const origin='https://staging.cybersentinels.com';
const operations=Object.keys(authChallengeActions);
let requestId=0;
test('Siteverify gates every protected Auth operation before its side effects',async t=>{
 const old={...process.env},fetchBefore=globalThis.fetch,infoBefore=console.info;
 Object.assign(process.env,{NODE_ENV:'production',VERCEL_ENV:'preview',NEXT_PUBLIC_SITE_URL:origin,NEXT_PUBLIC_TURNSTILE_SITE_KEY:'live-site-key',TURNSTILE_SECRET_KEY:'private-test-secret',TURNSTILE_MODE:'live'});
 const logs=[];console.info=(...args)=>logs.push(args);
 try{
 for(const operation of operations){
  const good={success:true,hostname:'staging.cybersentinels.com',action:authChallengeActions[operation],challenge_ts:new Date().toISOString()};
  for(const scenario of ['valid','missing','malformed','oversize','invalid','expired','duplicate','wrong-hostname','wrong-action','stale-success','future-success','missing-timestamp','misconfigured','unavailable','network-error','malformed-json','null-json','false-success']){
   await t.test(`${operation}: ${scenario}`,async()=>{
    let sideEffects=0,verifications=0;process.env.TURNSTILE_SECRET_KEY=scenario==='misconfigured'?'':'private-test-secret';
    globalThis.fetch=async(url,init)=>{verifications++;assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal(init.method,'POST');assert.equal(sideEffects,0);assert.equal(init.body.get('secret'),'private-test-secret');
      if(scenario==='network-error')throw Error('private upstream failure');
      if(scenario==='unavailable')return new Response('unavailable',{status:503});
      if(scenario==='malformed-json')return new Response('{');
      if(scenario==='null-json')return Response.json(null);
      let body={...good};
      if(['invalid','expired','duplicate'].includes(scenario))body={success:false,'error-codes':[scenario==='invalid'?'invalid-input-response':'timeout-or-duplicate']};
      if(scenario==='wrong-hostname')body.hostname='other.example';if(scenario==='wrong-action')body.action='unrelated';
      if(scenario==='stale-success')body.challenge_ts=new Date(Date.now()-301000).toISOString();
      if(scenario==='future-success')body.challenge_ts=new Date(Date.now()+60000).toISOString();
      if(scenario==='missing-timestamp')delete body.challenge_ts;
      if(scenario==='false-success')body.success='true';
      return Response.json(body);
    };
    const handler=createProtectedAuthHandler(async()=>{sideEffects++;return {error:null,data:{session:null}};});
    const token=scenario==='missing'?undefined:scenario==='malformed'?{forged:true}:scenario==='oversize'?'x'.repeat(2049):'private-test-token';
    const r=await handler(new Request(origin+'/api/auth/submit',{method:'POST',headers:{origin,'content-type':'application/json','x-vercel-forwarded-for':`192.0.${Math.floor(++requestId/250)}.${requestId%250+1}`},body:JSON.stringify({operation,email:'fixture@example.test',password:'Strong-fixture-123!',turnstileToken:token})}));
    assert.equal(sideEffects,scenario==='valid'?1:0,`${scenario} must not perform Auth/DB/email operations`);
    assert.equal(r.status===200,scenario==='valid');
    assert.equal(verifications,['missing','malformed','oversize','misconfigured'].includes(scenario)?0:1);
    const body=await r.text();assert.ok(!body.includes('private-test-secret'));assert.ok(!body.includes('private-test-token'));
   });
  }
 }
 await t.test('same token succeeds once, then replay has no second side effect', async()=>{
  process.env.TURNSTILE_SECRET_KEY='private-test-secret';
  let verifications=0,effects=0;
  globalThis.fetch=async()=>Response.json(++verifications===1?{success:true,hostname:'staging.cybersentinels.com',action:'login',challenge_ts:new Date().toISOString()}:{success:false,'error-codes':['timeout-or-duplicate']});
  const handler=createProtectedAuthHandler(async()=>{effects++;return {error:null};});
  const request=()=>new Request(origin+'/api/auth/submit',{method:'POST',headers:{origin,'content-type':'application/json','x-vercel-forwarded-for':'192.0.3.100'},body:JSON.stringify({operation:'password',email:'fixture@example.test',password:'fixture-password',turnstileToken:'private-replayed-token'})});
  assert.equal((await handler(request())).status,200);
  assert.equal((await handler(request())).status,400);
  assert.equal(verifications,2);assert.equal(effects,1);
 });
 assert.ok(!JSON.stringify(logs).includes('private-test-secret'));assert.ok(!JSON.stringify(logs).includes('private-test-token'));
 }finally{globalThis.fetch=fetchBefore;console.info=infoBefore;for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old);}
});

test('public Auth UI has no direct credential or email-action bypass',()=>{
 for(const file of ['app/login/page.tsx','app/verify-email/page.tsx']){
  const source=readFileSync(file,'utf8');assert.match(source,/\/api\/auth\/submit/);
  assert.doesNotMatch(source,/\.auth\.(signInWithPassword|signUp|resend|signInWithOtp|resetPasswordForEmail)\(/);
 }
 assert.match(readFileSync('lib/supabase/protected-auth.ts','utf8'),/import "server-only"/);
});

test('Preview uses its isolated canonical origin without changing Production origin policy',()=>{
 const before={...process.env};try{
  Object.assign(process.env,{VERCEL_ENV:'preview',CYBER_SENTINELS_PUBLIC_ORIGIN:'https://staging.cybersentinels.com',NEXT_PUBLIC_SITE_URL:'https://www.cybersentinels.com',VERCEL_URL:'candidate.example.vercel.app'});
  assert.equal(getApprovedAuthOrigin('https://staging.cybersentinels.com/api/auth/submit'),'https://staging.cybersentinels.com');
  assert.equal(getApprovedAuthOrigin('https://www.cybersentinels.com/api/auth/submit'),null);
  assert.equal(getApprovedAuthOrigin('https://attacker.example/api/auth/submit'),null);
  process.env.VERCEL_ENV='production';
  assert.equal(getApprovedAuthOrigin('https://staging.cybersentinels.com/api/auth/submit'),null);
  assert.equal(getApprovedAuthOrigin('https://www.cybersentinels.com/api/auth/submit'),'https://www.cybersentinels.com');
 }finally{for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before);}
});
