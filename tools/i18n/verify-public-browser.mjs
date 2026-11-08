import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import {chromium} from '@playwright/test';
import {canonicalPublicRoutes,protectedRoutePrefixes,routeMatchesPrefix} from '../../lib/navigation/route-visibility.ts';
import {getPublishedPublicEquivalents} from '../../lib/i18n/public-locales.ts';

const origin=process.env.PUBLIC_BROWSER_ORIGIN??'http://127.0.0.1:4340';
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):4340$/.test(origin),'Local read-only public browser qualification only');
assert.ok(!process.env.NEXT_PUBLIC_SUPABASE_URL&&!process.env.SUPABASE_SERVICE_ROLE_KEY,'This public UI proof must run unbound; hosted write qualification is separate');
assert.ok(!['.env','.env.local','.env.production','.env.production.local'].some(file=>existsSync(file)),'This proof must not load database bindings from dotenv files');
const messages=JSON.parse(readFileSync('artifacts/spanish-completion/messages.json','utf8'));
const translated=readdirSync('lib/i18n/es-public-batches').filter(file=>/^\d+\.json$/.test(file)).sort((a,b)=>parseInt(a)-parseInt(b)).flatMap(file=>JSON.parse(readFileSync('lib/i18n/es-public-batches/'+file,'utf8')));
const englishProse=messages.filter((entry,index)=>entry.en.length>=35&&entry.en!==translated[index]).map(entry=>entry.en.replaceAll('&apos;',"'").replaceAll('&amp;','&'));
const out='artifacts/spanish-completion/browser';mkdirSync(out,{recursive:true});
const middleware=readFileSync('middleware.ts','utf8');
const guardedRoutes=['userPagePrefixes','adminPagePrefixes'].flatMap(name=>{
  const declaration=middleware.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  assert.ok(declaration,'Missing middleware guard inventory: '+name);
  return [...declaration[1].matchAll(/"([^"]+)"/g)].map(match=>match[1]);
});
const protectedPrefixes=[...protectedRoutePrefixes,...guardedRoutes];
const report={origin,checkedAt:new Date().toISOString(),scope:'LOCAL public rendering and browser navigation; no hosted Auth/DB/provider qualification',http:[],browser:[],links:[],pageErrors:[],assetFailures:[],apiFailures:[],protectedWorkflowBlockers:[],failures:[]};
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext();
  const paths=canonicalPublicRoutes.flatMap(path=>[path,getPublishedPublicEquivalents(path).es]);
  const html=new Map(),targets=new Set();
  for(const path of paths){
    const response=await context.request.get(origin+path,{timeout:60000});const body=await response.text();
    html.set(path,body);report.http.push({path,status:response.status()});assert.equal(response.status(),200,path);
  }
  const screenshots=new Set(['/es','/es/pricing','/es/enterprise-access','/es/solutions','/es/developers/api-reference','/es/resources/agent-security/agent-authorization','/es/documents/operational-trust-whitepaper','/es/privacy']);
  for(const [viewport,width,height] of [['mobile',390,844],['desktop',1440,1000]]){
    const page=await context.newPage();
    await page.setViewportSize({width,height});
    page.on('pageerror',e=>report.pageErrors.push({viewport,message:e.message}));
    page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400){const failure={path:new URL(r.url()).pathname,status:r.status()};if(r.url().startsWith(origin+'/api/'))report.apiFailures.push(failure);else if(failure.status===503&&routeMatchesPrefix(failure.path,protectedPrefixes))report.protectedWorkflowBlockers.push(failure);else report.assetFailures.push(failure);}});
    for(const path of paths){
      // Next Link prefetches can stay pending for protected routes in this unbound
      // environment. Readiness is the actual document and visible page contract.
      await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:60000});
      await page.locator('main h1').first().waitFor();
      await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
      const expected=path==='/es'||path.startsWith('/es/')?'es':'en';
      assert.equal(await page.locator('html').getAttribute('lang'),expected,path);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      assert.equal(overflow,false,`${viewport} ${path} overflow`);
      const heading=await page.locator('main h1').first().innerText();assert.ok(heading.trim());
      if(path==='/'){
        await page.screenshot({path:`${out}/${viewport}-initial-consent.png`,fullPage:false});
        const reject=page.getByRole('button',{name:'Reject Optional',exact:true});
        if(await reject.isVisible())await reject.click();
        if(viewport==='mobile'){
          const menu=page.getByRole('button',{name:'Open menu',exact:true});await menu.click();
          assert.equal(await page.getByRole('button',{name:'Close',exact:true}).getAttribute('aria-expanded'),'true');
          await page.getByRole('button',{name:'Close',exact:true}).click();
        }
      }
      if(expected==='es'){
        const prose=await page.locator('body').evaluate(element=>{const copy=element.cloneNode(true);copy.querySelectorAll('pre,code,script').forEach(node=>node.remove());return copy.textContent.replace(/\s+/g,' ');});
        const untranslated=englishProse.filter(english=>prose.includes(english));
        assert.deepEqual(untranslated,[],path+' untranslated prose');
        assert.doesNotMatch(prose,/At a glance|Is this right for your team\?/);
      }
      if(viewport==='desktop'){
        const canonical=await page.locator('link[rel=canonical]').getAttribute('href');
        assert.equal(new URL(canonical).pathname,path==='/'?'/':path,`${path} canonical`);
        const alternate=await page.locator(`link[rel=alternate][hreflang="${expected==='es'?'en':'es'}"]`).count();assert.ok(alternate>0,path+' reciprocal hreflang');
        for(const href of await page.locator('main a[href]').evaluateAll(elements=>elements.map(e=>e.getAttribute('href')))){
          if(href?.startsWith('/')&&!href.startsWith('//'))targets.add(href);
          if(href?.startsWith('#')&&href.length>1){const found=await page.locator('[id]').evaluateAll((elements,id)=>elements.some(e=>e.id===id),decodeURIComponent(href.slice(1)));assert.equal(found,true,path+' '+href);}
        }
      }
      if(screenshots.has(path))await page.screenshot({path:`${out}/${viewport}-${path.replaceAll('/','-')}.png`,fullPage:true});
      assert.equal(await page.evaluate(()=>innerWidth),width);
      report.browser.push({viewport,width,height,path,lang:expected,overflow,heading});
    }
    await page.close();
  }
  for(const href of targets){
    const url=new URL(href,origin),response=await context.request.get(url.href,{timeout:60000});
    const item={href,status:response.status(),finalPath:new URL(response.url()).pathname};
    report.links.push(item);
    if(routeMatchesPrefix(url.pathname,protectedPrefixes)&&response.status()===503){
      assert.match(await response.text(),/Protected surface unavailable/);
      item.qualification='BLOCKED: protected workflow requires isolated Auth/database bindings';
      continue;
    }
    assert.ok(response.status()<400,href+' '+response.status());
    if(url.hash&&new URL(response.url()).pathname===url.pathname){
      const body=html.get(url.pathname)??await response.text();
      const ids=[...body.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
      assert.ok(ids.includes(decodeURIComponent(url.hash.slice(1))),href+' missing anchor');
    }
  }
  const page=await context.newPage();
  const resource='/es/resources/agent-security/agent-authorization';
  await page.goto(origin+resource);const disclosure=page.locator('details').nth(1);const id=await disclosure.getAttribute('id');
  assert.ok(id,'Technical disclosure must have a stable hash target');
  await page.goto(origin+resource+'#'+id);
  await page.locator(`[id="${id}"][open]`).waitFor({state:'visible'});
  report.browser.push({name:'Hash navigation opens the retained technical section',passed:true});
  await page.goto(origin+'/enterprise-access?intent=intro_call#contact');
  // Close the visible consent UI through its real control, without changing any security or fixture configuration.
  const reject=page.getByRole('button',{name:'Reject Optional',exact:true});if(await reject.isVisible())await reject.click();
  await page.getByRole('button',{name:/Change language/}).click();await page.getByRole('button',{name:/Español/}).click();
  await page.waitForURL('**/es/enterprise-access?intent=intro_call#contact');await page.reload();assert.equal(await page.locator('html').getAttribute('lang'),'es');
  report.browser.push({name:'Language navigation retains intent/hash across document reload',passed:true});
  const form=page.locator('main form').filter({has:page.locator('input[name="work_email"]')});
  let submissions=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/enterprise-access'))submissions++;});
  const submit=form.locator('button[type=submit]');if(await submit.isEnabled())await submit.click();
  assert.equal(submissions,0,'Empty required fields must not dispatch a form request');
  report.browser.push({name:'Invalid empty Contact form causes zero API submissions',passed:true});
  const spoof=await context.request.get(origin+'/platform',{headers:{'x-public-locale':'es','x-public-source-path':'/admin'}});assert.match(await spoof.text(),/<html[^>]*lang="en"/);
  const fallback=await context.request.get(origin+'/es/demo');assert.match(fallback.url(),/\/es\/unavailable/);assert.match(await fallback.text(),/Continuar en ingl/);
  report.browser.push({name:'Spoofed locale headers denied; untranslated account/demo route has explicit fallback',passed:true});
  report.passedPublicRendering=report.pageErrors.length===0&&report.assetFailures.length===0;
  report.hostedWorkflowQualified=false;
  report.limitations=['No valid Contact submission, Auth session, consent persistence, real positive Turnstile challenge or provider execution was attempted.','Any API 503s in this unbound local environment remain recorded as blockers, not successful backend tests.'];
  if(!report.passedPublicRendering)process.exitCode=1;
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify({http:report.http.length,browser:report.browser.length,links:report.links.length,pageErrors:report.pageErrors.length,failures:report.failures,apiFailures:report.apiFailures,passedPublicRendering:report.passedPublicRendering}));}
