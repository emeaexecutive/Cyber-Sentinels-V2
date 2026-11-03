import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
for(const route of ['demo/trust-runtime','world-id-preview']) {
 for(const configured of [false,true]) test(`${route}: configured=${configured}`,async()=>{
  let calls=0;
  const src=readFileSync(new URL(`../app/${route}/page.tsx`,import.meta.url),'utf8');
  const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const mocks={
   '@/lib/env':{hasPublicSupabaseEnv:()=>configured},
   '@/components/auth-unavailable':{AuthUnavailable:()=>null},
   '@/lib/supabase/server':{createClient:async()=>{calls++;return {auth:{getUser:async()=>({data:{user:null}})}};}},
   'next/navigation':{redirect:(url)=>{throw new Error(`REDIRECT:${url}`)}},
  };
  const mod={exports:{}};
  new Function('require','module','exports',js)((id)=>id in mocks?mocks[id]:id.startsWith('@/')?{}:require(id),mod,mod.exports);
  if(configured) await assert.rejects(()=>mod.exports.default({searchParams:Promise.resolve({})}),/REDIRECT:\/login/);
  else {const result=await mod.exports.default({searchParams:Promise.resolve({})});assert.equal(result.type,mocks['@/components/auth-unavailable'].AuthUnavailable);}
  assert.equal(calls,configured?1:0);
 });
}
