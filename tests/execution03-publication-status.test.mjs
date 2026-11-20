import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {harness} from './fixtures/sign-out-session.mjs';
const h=harness();
test('all eleven unapproved publication pages expose their real status in English and Spanish metadata',()=>{
 const {spanishPublicationNotices,spanishNoticeMetadata}=h.load('lib/i18n/public-notices.ts');assert.equal(Object.keys(spanishPublicationNotices).length,11);
 for(const route of Object.keys(spanishPublicationNotices)){
  const {metadata}=h.load(`app${route}/page.tsx`);assert.match(metadata.description,/under review; an approved version has not been published/);assert.equal(metadata.openGraph.description,metadata.description);assert.equal(metadata.robots.index,false);assert.match(spanishNoticeMetadata(route).description,/Todavía no se ha publicado una versión aprobada/);assert.equal(spanishNoticeMetadata(route).robots.index,false);
 }
});
test('public language offer remains English/Spanish only and declares incomplete account/download scope',()=>{
 const source=readFileSync('components/public-language-selector.tsx','utf8');assert.match(source,/some publication notices are under review/);assert.match(source,/Account tools and downloads may be English-only/);assert.match(source,/Other languages are not available yet/);assert.match(source,/unavailableLanguages\.map/);assert.match(source,/\bdisabled\b/);
 const {publicLocales}=h.load('lib/i18n/public-locales.ts');assert.deepEqual(Object.keys(publicLocales),['en','es']);assert.equal(publicLocales.es.contentStatus,'PARTIAL');
});
test('loop model and UI contain no provider, API, payment, storage or remote execution integration',()=>{
 for(const file of ['lib/watchtowers/loop-simulation.ts','components/watchtowers/loop-limit-demo.tsx']){
  const source=readFileSync(file,'utf8');assert.doesNotMatch(source,/\bfetch\(|XMLHttpRequest|WebSocket|supabase|service_role|process\.env|\/api\/|localStorage|sessionStorage|eval\(/);
 }
});
