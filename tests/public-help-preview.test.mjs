import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
const require=createRequire(import.meta.url);
function load({configured,createClient}) {
  const source=readFileSync(new URL('../app/help/page.tsx',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const mocks={
    '@/lib/i18n/request-locale':{getPublicRequestLocale:async()=> 'en'},
    '@/lib/search/metadata':{publicSocialMetadata:()=>({})},
    '@/lib/env':{hasPublicSupabaseEnv:()=>configured},
    '@/lib/supabase/server':{createClient},
    '@/lib/admin-auth':{isAdminAllowlisted:(email)=>{assert.ok(email,'anonymous visitors must not trigger the admin email check');return false;}},
    '@/lib/trust-engine/createAuditLog':{},'@/lib/trust-engine/createSignal':{},
    'next/link':{__esModule:true,default:({children,...props})=>require('react').createElement('a',props,children)},
    'next/navigation':{redirect:()=>{throw new Error('Unexpected redirect');}},
  };
  const testModule={exports:{}};
  new Function('require','module','exports',compiled)(name=>mocks[name]??require(name),testModule,testModule.exports);
  return testModule.exports.default;
}
test('public Help guidance renders without initializing an unconfigured database',async()=>{
  let calls=0;
  const page=load({configured:false,createClient:async()=>{calls++;throw new Error('No database');}});
  const html=renderToStaticMarkup(await page({searchParams:Promise.resolve({})}));
  assert.equal(calls,0);
  assert.match(html,/How can we help/);
  assert.match(html,/Sign in to submit/);
  assert.match(html,/unavailable in this unconfigured local preview/);
  assert.doesNotMatch(html,/name="question"/);
});
test('configured Help infrastructure errors remain real failures',async()=>{
  const page=load({configured:true,createClient:async()=>{throw new Error('Database unavailable');}});
  await assert.rejects(()=>page({searchParams:Promise.resolve({})}),/Database unavailable/);
});

test('configured anonymous Help renders without admin email errors',async()=>{
  const query={select(){return this;},eq(){return this;},order(){return this;},limit(){return this;},returns:async()=>({data:[]})};
  const page=load({configured:true,createClient:async()=>({auth:{getUser:async()=>({data:{user:null}})},from:()=>query})});
  const html=renderToStaticMarkup(await page({searchParams:Promise.resolve({})}));
  assert.match(html,/How can we help/);
  assert.doesNotMatch(html,/name="question"/);
});
