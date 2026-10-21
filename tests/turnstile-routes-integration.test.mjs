import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import ts from 'typescript';
const require=createRequire(import.meta.url),origin='https://staging.cybersentinels.com';
// Load actual route/controllers and actual Siteverify implementation. Replace
// only persistence/Auth/framework request context, never the security decision.
function harness(){
 const effects=[];const client={from:table=>({insert:async()=>{effects.push('insert:'+table);return {error:null};}}),auth:{resetPasswordForEmail:async()=>{effects.push('recovery-email');return {error:null};}}};
 const mocks={'server-only':{},'@supabase/supabase-js':{createClient:()=>client},'@/lib/supabase/service-role':{createServiceRoleClient:()=>client},'@/lib/supabase/protected-auth':{createProtectedAuthClient:async()=>client},'@/lib/database/events':{recordTrustEvent:async()=>effects.push('trust-event')},'@/lib/operational-monitoring':{captureOperationalIssue(){}}};
 const cache=new Map();function load(file){file=path.resolve(file);if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file+='.ts';if(cache.has(file))return cache.get(file);const m={exports:{}};cache.set(file,m.exports);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const resolve=n=>mocks[n]??(n.startsWith('@/')?load(n.slice(2)):n.startsWith('.')?load(path.resolve(path.dirname(file),n)):require(n));new Function('require','module','exports',js)(resolve,m,m.exports);return m.exports;}
 return {effects,load};
}
test('public routes reject failed Siteverify without database, email or audit side effects',async t=>{
 const before={...process.env},previousFetch=globalThis.fetch,previousError=console.error;console.error=()=>{};
 Object.assign(process.env,{NODE_ENV:'production',VERCEL_ENV:'preview',NEXT_PUBLIC_SITE_URL:origin,NEXT_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',NEXT_PUBLIC_TURNSTILE_SITE_KEY:'fixture-site',TURNSTILE_SECRET_KEY:'fixture-secret',TURNSTILE_MODE:'live'});
 try{for(const [route,action,form] of [['waitlist','waitlist',false],['enterprise-access','enterprise_access',true],['auth/password-reset/request','password_reset',false]]){
 for(const scenario of ['valid','missing','invalid','expired','duplicate','misconfigured','unavailable','wrong-hostname','wrong-action','network-error','malformed'])await t.test(`${route}: ${scenario}`,async()=>{
 const h=harness();let calls=0;process.env.TURNSTILE_SECRET_KEY=scenario==='misconfigured'?'':'fixture-secret';
 globalThis.fetch=async(url)=>{assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');calls++;assert.equal(h.effects.length,0);
 if(scenario==='network-error')throw Error('network');if(scenario==='unavailable')return new Response('',{status:503});
 if(['invalid','expired','duplicate'].includes(scenario))return Response.json({success:false,'error-codes':[scenario==='invalid'?'invalid-input-response':'timeout-or-duplicate']});
 return Response.json({success:true,action:scenario==='wrong-action'?'unrelated':action,hostname:scenario==='wrong-hostname'?'other.example':'staging.cybersentinels.com',challenge_ts:new Date().toISOString()});};
 const token=scenario==='missing'?'':scenario==='malformed'?'bad token':'fixture-token';
 const body=form?new URLSearchParams({name:'Fixture',work_email:'fixture@example.test',company:'Fixture',current_problem_category:'ai_identity',message:'Isolated verification fixture request.', 'cf-turnstile-response':token}):JSON.stringify({email:'fixture@example.test',turnstileToken:token});
 const request=new Request(origin+'/api/'+route,{method:'POST',headers:{origin,'content-type':form?'application/x-www-form-urlencoded':'application/json'},body});
 const r=await h.load('app/api/'+route+'/route.ts').POST(request);
 assert.equal(r.status>=200&&r.status<400,scenario==='valid');assert.equal(h.effects.length>0,scenario==='valid','No persistence, Auth/email or audit work on rejection');
 assert.equal(calls,['missing','malformed','misconfigured'].includes(scenario)?0:1);
 });}
 }finally{globalThis.fetch=previousFetch;console.error=previousError;for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before);}
});
