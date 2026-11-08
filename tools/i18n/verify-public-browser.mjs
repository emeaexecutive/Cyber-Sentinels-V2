import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
import {canonicalPublicRoutes} from '../../lib/navigation/route-visibility.ts';
import {getPublishedPublicEquivalents} from '../../lib/i18n/public-locales.ts';

const origin=process.env.PUBLIC_BROWSER_ORIGIN??'http://127.0.0.1:4340';
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):4340$/.test(origin),'Local read-only public browser qualification only');
assert.ok(!process.env.NEXT_PUBLIC_SUPABASE_URL&&!process.env.SUPABASE_SERVICE_ROLE_KEY,'This public UI proof must run unbound; hosted write qualification is separate');
const out='artifacts/spanish-completion/browser';mkdirSync(out,{recursive:true});
const report={origin,checkedAt:new Date().toISOString(),scope:'LOCAL public rendering and browser navigation; no hosted Auth/DB/provider qualification',http:[],browser:[],links:[],pageErrors:[],apiFailures:[],failures:[]};
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
    const page=await context.newPage({viewport:{width,height}});
    page.on('pageerror',e=>report.pageErrors.push({viewport,message:e.message}));
    page.on('response',r=>{if(r.url().startsWith(origin+'/api/')&&r.status()>=500)report.apiFailures.push({path:new URL(r.url()).pathname,status:r.status()});});
    for(const path of paths){
      await page.goto(origin+path,{waitUntil:'networkidle',timeout:60000});
      await page.locator('main h1').first().waitFor();
      const expected=path==='/es'||path.startsWith('/es/')?'es':'en';
      assert.equal(await page.locator('html').getAttribute('lang'),expected,path);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      assert.equal(overflow,false,`${viewport} ${path} overflow`);
      const heading=await page.locator('main h1').first().innerText();assert.ok(heading.trim());
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
      report.browser.push({viewport,path,lang:expected,overflow,heading});
    }
    await page.close();
  }
  for(const href of targets){
    const url=new URL(href,origin),response=await context.request.get(url.href,{timeout:60000});
    const item={href,status:response.status(),finalPath:new URL(response.url()).pathname};
    report.links.push(item);assert.ok(response.status()<400,href+' '+response.status());
    if(url.hash&&new URL(response.url()).pathname===url.pathname){
      const body=html.get(url.pathname)??await response.text();
      const ids=[...body.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
      assert.ok(ids.includes(decodeURIComponent(url.hash.slice(1))),href+' missing anchor');
    }
  }
  const page=await context.newPage();
  const resource='/es/resources/agent-security/agent-authorization';
  await page.goto(origin+resource);const disclosure=page.locator('details').nth(1);const id=await disclosure.getAttribute('id');
  await page.goto(origin+resource+'#'+id);assert.equal(await page.locator(`[id="${id}"]`).getAttribute('open'),'');
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
  report.passedPublicRendering=report.pageErrors.length===0;
  report.hostedWorkflowQualified=false;
  report.limitations=['No valid Contact submission, Auth session, consent persistence, real positive Turnstile challenge or provider execution was attempted.','Any API 503s in this unbound local environment remain recorded as blockers, not successful backend tests.'];
  if(!report.passedPublicRendering)process.exitCode=1;
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify({http:report.http.length,browser:report.browser.length,links:report.links.length,pageErrors:report.pageErrors.length,failures:report.failures,apiFailures:report.apiFailures,passedPublicRendering:report.passedPublicRendering}));}
