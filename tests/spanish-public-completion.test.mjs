import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {harness} from './fixtures/sign-out-session.mjs';
const h=harness();
const {canonicalPublicRoutes}=h.load('lib/navigation/route-visibility.ts');
const {getPublishedPublicEquivalents}=h.load('lib/i18n/public-locales.ts');

test('all 42 canonical public routes have real Spanish page ownership',()=>{
  assert.equal(canonicalPublicRoutes.length,42);
  for(const path of canonicalPublicRoutes){
    const es=getPublishedPublicEquivalents(path).es;
    assert.equal(es,`/es${path==='/'?'':path}`);
    const source=path.startsWith('/resources/agent-security/')?'app/es/resources/agent-security/[slug]/page.tsx':`app${es}/page.tsx`;
    assert.ok(existsSync(source),source);
  }
});
test('generated translations match the reviewed catalogue and English sources',()=>{
  execFileSync(process.execPath,['tools/i18n/generate-spanish-public.mjs','--check'],{stdio:'pipe'});
});
test('every English public owner advertises its real reciprocal Spanish route',async()=>{
  for(const path of canonicalPublicRoutes){
    const dynamicResource=path.startsWith('/resources/agent-security/');
    const file=dynamicResource?'app/resources/agent-security/[slug]/page.tsx':path==='/'?'app/page.tsx':`app${path}/page.tsx`;
    const pageModule=h.load(file);
    const metadata=pageModule.metadata??await pageModule.generateMetadata({params:Promise.resolve({slug:path.split('/').at(-1)})});
    assert.equal(metadata.alternates.canonical,path,path);
    assert.equal(metadata.alternates.languages.es,`/es${path==='/'?'':path}`,path);
  }
});
test('Spanish API presentation preserves every machine contract field',()=>{
  const {publicApiOpenApi}=h.load('lib/public-api/v1/openapi.ts');
  const {spanishOpenApiView}=h.load('lib/i18n/es-api-copy.ts');
  let operations=0;
  for(const [path,methods] of Object.entries(publicApiOpenApi.paths)){
    assert.deepEqual(Object.keys(spanishOpenApiView.paths[path]),Object.keys(methods));
    for(const [method,original] of Object.entries(methods)){
      const translated=spanishOpenApiView.paths[path][method];
      const contractFields=operation=>Object.fromEntries(Object.entries(operation).filter(([key])=>!['summary','description'].includes(key)));
      const originalContract=contractFields(original);
      const translatedContract=contractFields(translated);
      assert.deepEqual(translatedContract,originalContract,`${method} ${path}`);
      assert.ok(translated.summary);operations++;
    }
  }assert.equal(operations,26);
  const page=readFileSync('app/es/developers/api-reference/page.tsx','utf8');
  assert.ok(page.includes('.split("/")'),'URL localisation must not modify schema delimiters');
  assert.ok(!page.includes('.split("/es")'));
});
test('Spanish legal routes translate publication status without publishing hidden drafts',()=>{
  const {spanishPublicationNotices,spanishNoticeMetadata}=h.load('lib/i18n/public-notices.ts');
  const {SpanishPublicationNotice}=h.load('components/spanish-publication-notice.tsx');
  for(const path of Object.keys(spanishPublicationNotices)){
    const html=renderToStaticMarkup(React.createElement(SpanishPublicationNotice,{path}));
    assert.match(html,/Todavía no se ha publicado una versión aprobada/);
    assert.match(html,/Contactar con Cyber Sentinels/);
    assert.match(html,/en inglés/);
    assert.equal(spanishNoticeMetadata(path).robots.index,false);
    assert.equal(spanishNoticeMetadata(path).alternates.canonical,`/es${path}`);
  }
});
test('Spanish pages retain the same adoption actions instead of dropping the shared rail',()=>{
  const {spanishAdoptionFor}=h.load('lib/i18n/es-adoption.ts');
  const {publicPageAdoptionFor}=h.load('lib/navigation/public-page-adoption.ts');
  for(const path of canonicalPublicRoutes){
    const source=publicPageAdoptionFor(path),es=spanishAdoptionFor(`/es${path==='/'?'':path}`);
    assert.equal(es.route,source.route);
    assert.equal(es.primary.href,'/es/enterprise-access?intent=demo');
    assert.equal(es.supporting.href,'/es/enterprise/pilot');
    assert.notEqual(es.audience,source.audience);
    assert.ok(es.problem&&es.differentiation);
  }
  assert.equal(spanishAdoptionFor('/es/admin'),null);
});
test('the original Spanish Platform page also localises its shared architecture diagrams',async()=>{
  const page=await harness({locale:'es'}).load('app/platform/page.tsx').default();
  const html=renderToStaticMarkup(page);
  assert.match(html,/Identidad · Autoridad · Ejecución · Política/);
  assert.doesNotMatch(html,/Identity · Authority · Runtime · Policy|Shared control layer/);
});
