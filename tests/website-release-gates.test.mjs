import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function load(path){
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',js)(id=>id==='next/link'?{__esModule:true,default:({children,...props})=>require('react').createElement('a',props,children)}:id==='@/lib/search/metadata'?{publicSocialMetadata:()=>({})}:require(id),module,module.exports);
 return module.exports;
}
test('draft policy body, subtitle and unapproved contact routing are never published',()=>{
 const {LegalDraftPage}=load('components/legal-draft-page.tsx');
 const html=renderToStaticMarkup(LegalDraftPage({title:'Terms',subtitle:'UNAPPROVED WARRANTY',sections:[{title:'UNAPPROVED JURISDICTION',body:'PRIVATE-CONTACT@example.test'}],links:[['mailto:private@example.test','private']]}));
 assert.doesNotMatch(html,/UNAPPROVED|PRIVATE-CONTACT|private@example/);
 assert.match(html,/approved version has not been published/);
 assert.match(html,/href="\/contact"/);
});
test('public privacy page retains controls without asserting an approved privacy policy',()=>{
 const html=renderToStaticMarkup(load('app/privacy/page.tsx').default());
 assert.match(html,/privacy notice is under review/);assert.match(html,/href="\/privacy\/preferences"/);
 assert.doesNotMatch(html,/processed only|not stored in consent records|privacy@/);
});
test('contact redirects to the existing enquiry path',async()=>{
 const config=(await import('../next.config.mjs')).default;
 const redirect=(await config.redirects()).find(r=>r.source==='/contact');
 assert.equal(redirect.destination,'/enterprise-access?intent=intro_call');assert.equal(redirect.permanent,false);
});

test('public enquiry surfaces use only the founder-approved mailbox',()=>{
 for(const path of ['app/enterprise-access/page.tsx','app/funding/page.tsx']){
  const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');const addresses=source.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)??[];assert.deepEqual([...new Set(addresses)],['emeaexecutive@icloud.com']);
 }
});
