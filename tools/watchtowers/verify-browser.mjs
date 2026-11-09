import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from '@playwright/test';
import {watchtowerCopy,torchCases,riverCases,resultLabels} from '../../lib/watchtowers/content.ts';
const origin='http://127.0.0.1:4340';
assert.ok(!process.env.NEXT_PUBLIC_SUPABASE_URL&&!process.env.SUPABASE_SERVICE_ROLE_KEY);
assert.ok(!['.env','.env.local','.env.production','.env.production.local'].some(file=>existsSync(file)));
const out='artifacts/watchtowers/browser';mkdirSync(out,{recursive:true});
const report={environment:'LOCAL UNBOUND PUBLIC SIMULATION',hosted:false,checks:[],pageErrors:[],demoWrites:[],unqualifiedApiResponses:[],failures:[]};
const browser=await chromium.launch();
try{
  const context=await browser.newContext({reducedMotion:'reduce'});
  for(const [viewport,width,height]of[['mobile',390,844],['desktop',1440,1000]])for(const locale of ['en','es']){
    const copy=watchtowerCopy[locale],base=(locale==='es'?'/es':'')+'/tenente-swarm',page=await context.newPage();await page.setViewportSize({width,height});
    page.on('pageerror',e=>report.pageErrors.push(e.message));
    page.on('response',r=>{if(r.url().startsWith(origin+'/api/')&&r.status()>=400)report.unqualifiedApiResponses.push({path:new URL(r.url()).pathname,status:r.status()});});
    page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/')&&!r.url().includes('/api/consent/'))report.demoWrites.push(r.url());});
    const response=await page.goto(origin+base);assert.equal(response.status(),200);
    const reject=page.getByRole('button',{name:'Reject Optional',exact:true});
    // The first consent dialog appears after hydration. Make a real UI choice;
    // never seed a cookie or hide an overlay to make the demo test pass.
    if(report.checks.length===0)await reject.waitFor({state:'visible'});
    if(await reject.isVisible()){await reject.click();await reject.waitFor({state:'hidden'});}
    await page.locator('main h1').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),locale);
    assert.equal(await page.evaluate(()=>innerWidth),width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.ok(await page.getByRole('link',{name:copy.explore+': '+copy.torch}).isVisible());
    assert.ok(await page.getByRole('link',{name:copy.explore+': '+copy.river}).isVisible());
    await page.screenshot({path:`${out}/${viewport}-${locale}-origin.png`,fullPage:true});
    report.checks.push({viewport,width,locale,view:'origin',passed:true});
    for(const kind of ['torch','river']){
      await page.goto(origin+base+'/'+(kind==='torch'?'torch-code':'river-crossing'));
      const select=page.getByLabel(copy.scenario,{exact:true});await select.focus();await page.keyboard.press('ArrowDown');
      assert.notEqual(await select.inputValue(),'A','Keyboard must change the selected scenario');
      await page.keyboard.press('ArrowUp');
      assert.equal(await select.inputValue(),'A');
      const cases=kind==='torch'?torchCases:riverCases;
      for(const scenario of cases){
        await select.selectOption(scenario.id);
        const replay=page.getByRole('button',{name:copy.run,exact:true});
        if(scenario.id==='A'){await replay.focus();await page.keyboard.press('Enter');}else await replay.click();
        assert.equal(await page.getByTestId('destination-effects').innerText(),String(kind==='torch'?0:scenario.effects));
        assert.equal(await page.getByTestId('recorded-outcome').innerText(),resultLabels[scenario.result][locale]);
        await page.getByRole('button',{name:copy.next,exact:true}).click();
        await page.getByRole('button',{name:copy.node+': CHIRIVETA',exact:true}).click();
        assert.equal(await page.getByRole('button',{name:copy.node+': CHIRIVETA',exact:true}).getAttribute('aria-pressed'),'true');
        if(kind==='river'&&['B','E'].includes(scenario.id)){
          await page.getByRole('button',{name:copy.approved,exact:true}).click();
          assert.equal(await page.getByTestId('destination-effects').innerText(),'1');
        }
        if(kind==='river'&&scenario.id==='G'){
          await page.getByRole('button',{name:copy.reconcile,exact:true}).click();
          assert.ok(await page.getByText(copy.reconciling,{exact:true}).isVisible());
          assert.equal(await page.getByTestId('recorded-outcome').innerText(),resultLabels.UNKNOWN[locale]);
        }
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
        report.checks.push({viewport,width,locale,kind,scenario:scenario.id,passed:true});
      }
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:`${out}/${viewport}-${locale}-${kind}.png`,fullPage:true});
    }
    await page.close();
  }
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.demoWrites,[]);
  report.passed=true;
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks.length,passed:report.passed,failures:report.failures,pageErrors:report.pageErrors,demoWrites:report.demoWrites}));}
