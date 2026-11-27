import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {harness} from './fixtures/sign-out-session.mjs';
const h=harness(),{WatchtowerPage}=h.load('components/watchtowers/watchtower-page.tsx');
test('English and Spanish present origin, bounded agents, two independent entries and honest caveats',()=>{
  for(const locale of ['en','es']){
    const html=renderToStaticMarkup(React.createElement(WatchtowerPage,{locale}));
    for(const name of ['ALSAMORA','VIACAMP','CHIRIVETA'])assert.ok(html.includes(name));
    assert.match(html,locale==='en'?/Built in Aragón/:/Creado en Aragón/);
    assert.ok(html.includes((locale==='es'?'/es':'')+'/tenente-swarm/torch-code'));
    assert.ok(html.includes((locale==='es'?'/es':'')+'/tenente-swarm/river-crossing'));
    assert.match(html,locale==='en'?/code used here is fictional/:/código empleado aquí es ficticio/);
    assert.match(html,/MOCKED/);assert.match(html,/BLOCKED/);assert.match(html,/<details/);
    assert.doesNotMatch(html,/<img\b/,'Unapproved heritage photographs must remain unpublished');
  }
});
test('signed local fixture data is intact and cannot be mistaken for hosted proof',()=>{
  execFileSync(process.execPath,['--experimental-strip-types','tools/watchtowers/import-local-evidence.mjs','--check'],{stdio:'pipe'});
  const data=JSON.parse(readFileSync('lib/watchtowers/local-evidence.json','utf8'));
  assert.equal(data.classification,'ILLUSTRATIVE SIMULATION');assert.equal(data.hosted,false);
  assert.equal(data.river.manifest.tests.find(r=>r.scenario==='F').claims,1);
  assert.equal(data.river.manifest.tests.find(r=>r.scenario==='B').pendingEffects,0);
  assert.equal(data.river.manifest.tests.find(r=>r.scenario==='G').blindRedispatch,false);
});
test('public simulations have no execution, authentication, approval or provider client',()=>{
  for(const file of ['components/watchtowers/watchtower-demo.tsx','components/watchtowers/watchtower-network.tsx']){
    const source=readFileSync(file,'utf8');assert.doesNotMatch(source,/\bfetch\(|supabase|service_role|process\.env|\/api\/|localStorage|eval\(/);
  }
  const source=readFileSync('components/watchtowers/watchtower-demo.tsx','utf8');
  assert.match(source,/role="status" aria-live="polite"/);assert.match(source,/aria-current=/);
});
