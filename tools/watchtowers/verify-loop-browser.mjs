import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from '@playwright/test';
import {loopCopy} from '../../components/watchtowers/loop-limit-demo.tsx';
import {verifyLoopReplay} from '../../lib/watchtowers/loop-simulation.ts';
const origin=process.env.LOOP_DEMO_ORIGIN??'http://127.0.0.1:4341';
assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/,'Browser verification is restricted to a local fixture');
assert.ok(!process.env.NEXT_PUBLIC_SUPABASE_URL&&!process.env.SUPABASE_SERVICE_ROLE_KEY);
assert.ok(!['.env','.env.local','.env.production','.env.production.local'].some(file=>existsSync(file)));
const out='artifacts/execution03-website/browser';mkdirSync(out,{recursive:true});
const report={environment:'LOCAL UNBOUND BUILT WEBSITE',hosted:false,modelCalls:0,realBilling:false,checks:[],pageErrors:[],demoWrites:[],unqualifiedApiResponses:[],failures:[]};
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,1440])for(const locale of ['en','es']){
  const copy=loopCopy[locale],page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  page.on('pageerror',error=>report.pageErrors.push(error.message));
  page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/')&&!request.url().includes('/api/consent/'))report.demoWrites.push(request.url());});
  page.on('response',response=>{if(response.url().includes('/api/')&&response.status()>=400)report.unqualifiedApiResponses.push({path:new URL(response.url()).pathname,status:response.status()});});
  try{
   const response=await page.goto(`${origin}${locale==='es'?'/es':''}/tenente-swarm/river-crossing#loop-limit`);assert.equal(response.status(),200);
   const consent=page.getByRole('button',{name:locale==='es'?'Rechazar opcionales':'Reject Optional',exact:true});
   // The public shell may defer its consent dialog until hydration. Make the real UI choice.
   await page.locator('#loop-limit').waitFor();await page.waitForTimeout(500);
   if(await consent.isVisible())await consent.click();
   // Older shared consent uses English even on ES. Preserve and record the fallback honestly.
   const englishConsent=page.getByRole('button',{name:'Reject Optional',exact:true});if(await englishConsent.isVisible())await englishConsent.click();
   assert.equal(await page.locator('html').getAttribute('lang'),locale);
   const panel=page.locator('#loop-limit');assert.match(await panel.innerText(),/ILLUSTRATIVE SIMULATION/);
   const click=async name=>{await panel.getByRole('button',{name,exact:true}).click();await panel.getByRole('button',{name:copy.reset,exact:true}).waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#loop-limit button:last-of-type')?.disabled);};
   const records=async()=>JSON.parse(await panel.getByTestId('loop-records').textContent());
   const prepare=async()=>{const retry=panel.getByRole('button',{name:copy.retry,exact:true});await retry.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[data-testid="loop-used"]').textContent==='1 / 3');await click(copy.retry);await page.waitForFunction(()=>document.querySelector('[data-testid="loop-used"]').textContent==='2 / 3');await click(copy.handoff);};
   await prepare();await click(copy.race);await page.waitForFunction(()=>document.querySelector('[data-testid="loop-used"]').textContent==='3 / 3');
   const completed=await records();const final=completed.filter(e=>e.kind==='DECISION'&&String(e.details.requestId).startsWith('final-slot'));
   assert.deepEqual(final.map(e=>e.details.decision).sort(),['ALLOW','DENY']);assert.equal(final.find(e=>e.details.decision==='DENY').details.reason,'COLLECTIVE_LIMIT_EXCEEDED');
   assert.equal(await panel.getByTestId('loop-effects').innerText(),'1');assert.equal(await panel.getByTestId('loop-cost').innerText(),'0.003 USD');
   assert.ok(completed.some(e=>e.kind==='DESTINATION_OBSERVATION'&&e.details.deniedRequest&&e.details.effects===0));
   await click(copy.replay);await page.waitForFunction(text=>document.querySelector('[data-testid="loop-verification"]').textContent===text,copy.verified);assert.ok(await verifyLoopReplay(await records()));
   await click(copy.after);assert.equal(await panel.getByTestId('loop-effects').innerText(),'1');
   await click(copy.stop);await click(copy.after);assert.ok((await records()).some(e=>e.details.reason==='EMERGENCY_STOP_EFFECTIVE'));await click(copy.recovery);assert.equal(await panel.getByTestId('loop-used').innerText(),'3 / 3');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await panel.screenshot({path:`${out}/${width}-${locale}-complete.png`});
   await click(copy.reset);await prepare();await panel.getByLabel(copy.timeout,{exact:true}).check();await click(copy.race);await page.waitForFunction(()=>document.querySelector('[data-testid="loop-effects"]').textContent==='UNKNOWN');
   await click(copy.stop);assert.equal(await panel.getByRole('button',{name:copy.recovery,exact:true}).isDisabled(),true);await click(copy.reconcile);assert.equal(await panel.getByTestId('loop-effects').innerText(),'1');await click(copy.recovery);
   const reconciled=await records();assert.ok(reconciled.some(e=>e.details.outcome==='UNKNOWN'));assert.ok(reconciled.some(e=>e.kind==='RECONCILIATION'&&e.details.redispatched===false));assert.equal(reconciled.filter(e=>e.kind==='DECISION'&&e.details.decision==='ALLOW').length,3);assert.ok(await verifyLoopReplay(reconciled));
   await panel.screenshot({path:`${out}/${width}-${locale}-reconciled.png`});
   const buttons=await panel.getByRole('button').all();for(const button of buttons){const box=await button.boundingBox();if(box)assert.ok(box.height>=44,'All controls need a 44px touch target');}
   report.checks.push({width,locale,keyboard:true,completedFinalDecisions:final.map(e=>({decision:e.details.decision,reason:e.details.reason,requestId:e.details.requestId})),observedEffects:1,deniedEffects:0,replayVerified:true,unknownPreserved:true,recoveryQuotaReset:false,records:reconciled,passed:true});
  }finally{await page.close();}
 }
 assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.demoWrites,[]);report.passed=true;
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{await browser.close();writeFileSync(`${out}/loop-browser-report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks.length,passed:report.passed,failures:report.failures,pageErrors:report.pageErrors,demoWrites:report.demoWrites}));}
