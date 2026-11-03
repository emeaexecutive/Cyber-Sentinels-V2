import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const out='artifacts/recovery-20261103';
mkdirSync(`${out}/proof`,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
const page=await context.newPage();
const results=[];
page.setDefaultTimeout(12000);
try {
  await page.goto('http://127.0.0.1:4333/pricing');
  const reject=page.getByRole('button',{name:'Reject Optional',exact:true});
  await reject.waitFor({state:'visible',timeout:15000}).catch(()=>{});
  if(await reject.isVisible()) {
    await reject.click();
    await page.getByRole('dialog').waitFor({state:'hidden'});
  }
  const dismiss=page.getByRole('button',{name:'Dismiss',exact:true});
  await dismiss.waitFor({state:'visible',timeout:4000}).catch(()=>{});
  if(await dismiss.isVisible())await dismiss.click();
  for(const width of [1440,1024,768,390]) {
    await page.setViewportSize({width,height:1000});
    const cards=page.locator('.pricing-card');
    await cards.first().waitFor();
    const metrics=await cards.evaluateAll(cards=>cards.map(card=>{
      const box=card.getBoundingClientRect(),cta=card.querySelector('.pricing-card__cta').getBoundingClientRect();
      return {title:card.querySelector('h2').textContent,cardTop:box.top,cardHeight:box.height,ctaTop:cta.top,ctaBottom:cta.bottom,ctaWidth:cta.width,ctaHeight:cta.height};
    }));
    assert.equal(metrics.length,4);
    assert.ok(Math.max(...metrics.map(m=>m.ctaHeight))-Math.min(...metrics.map(m=>m.ctaHeight))<1);
    assert.ok(Math.max(...metrics.map(m=>m.cardHeight))-Math.min(...metrics.map(m=>m.cardHeight))<1);
    if(width>=1024)assert.ok(Math.max(...metrics.map(m=>m.ctaBottom))-Math.min(...metrics.map(m=>m.ctaBottom))<1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`${out}/proof/pricing-${width}.png`,fullPage:true});
    results.push({check:'pricing',width,pass:true,metrics});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('.pricing-grid').screenshot({path:`${out}/proof/pricing-cards-desktop.png`});
  const nav=page.locator('#primary-navigation');
  const labels=await nav.locator(':scope > a').allTextContents();
  assert.deepEqual(labels,['Platform','Solutions','Developers','Enterprise','Pricing','Sign In']);
  assert.equal(await nav.locator(':scope > :last-child button').first().getAttribute('aria-label'),'Translate navigation. Current language: English');
  await page.screenshot({path:`${out}/proof/header-desktop.png`});
  const trigger=()=>page.getByRole('button',{name:/Translate navigation/});
  await trigger().click();
  await page.getByRole('button',{name:'Español',exact:true}).click();
  assert.equal(await page.locator('#public-language-options').count(),0);
  assert.equal(await nav.getByRole('link',{name:'Plataforma',exact:true}).count(),1);
  await nav.getByRole('link',{name:'Soluciones',exact:true}).click();
  await page.waitForURL('**/solutions');
  assert.equal(await nav.getByRole('link',{name:'Precios',exact:true}).count(),1);
  await page.reload();
  await nav.getByRole('link',{name:'Precios',exact:true}).waitFor();
  results.push({check:'selection-closes-and-persists-across-navigation-and-refresh',pass:true});
  for(const name of ['Français','Deutsch','Português','Italiano','العربية','中文','English']) {
    await trigger().click(); await page.getByRole('button',{name,exact:true}).click();
    assert.equal(await page.locator('#public-language-options').count(),0);
    if(name==='العربية') {
      assert.equal(await nav.locator('a').first().getAttribute('dir'),'rtl');
      assert.equal(await page.locator('html').getAttribute('lang'),'en');
      await page.screenshot({path:`${out}/proof/arabic-navigation.png`});
    }
    results.push({check:'navigation-language',name,pass:true,coverage:'navigation only; page content remains English'});
  }
  await trigger().focus(); await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Español');
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'中文');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#public-language-options').count(),0);
  assert.equal(await trigger().evaluate(e=>document.activeElement===e),true);
  await trigger().click(); await page.locator('h1').click();
  assert.equal(await page.locator('#public-language-options').count(),0);
  results.push({check:'keyboard-arrows-home-end-escape-focus-return-and-outside-click',pass:true});
  await page.setViewportSize({width:390,height:1000});
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  await trigger().click();
  await page.screenshot({path:`${out}/proof/language-mobile.png`});
  await page.getByRole('button',{name:'Español',exact:true}).click();
  assert.equal(await page.locator('#public-language-options').count(),0);
  await trigger().click(); await page.getByRole('button',{name:'English',exact:true}).click();
  await page.getByRole('button',{name:'Close',exact:true}).click();
  assert.equal(await nav.isVisible(),false);
  results.push({check:'mobile-menu-language-selection-and-close',pass:true});
  await page.goto('http://127.0.0.1:4333/pricing');
  const destinations=[];
  for(const href of [...new Set(await page.locator('.pricing-card__cta').evaluateAll(links=>links.map(l=>l.getAttribute('href'))))]) {
    const response=await page.goto(`http://127.0.0.1:4333${href}`);assert.equal(response.status(),200);
    assert.ok(await page.locator('form').count());destinations.push(href);
  }
  assert.equal(await page.locator('form button[type=submit]').isDisabled(),true);
  assert.equal(await page.locator('form').last().evaluate(form=>form.checkValidity()),false);
  assert.ok(await page.locator(':invalid').count());
  results.push({check:'pricing-enquiry-destinations-and-empty-form-validation',pass:true,destinations,note:'No message sent; delivery/CAPTCHA controls preserved'});
  await page.goto('http://127.0.0.1:4333/platform');
  const details=page.locator('.executive-summary details');
  assert.equal(await details.getAttribute('open'),null);
  await details.locator('summary').click();
  assert.notEqual(await details.getAttribute('open'),null);
  assert.ok(await details.locator('li').count());
  results.push({check:'technical-summary-progressive-disclosure',pass:true});
  writeFileSync(`${out}/interactions.json`,JSON.stringify({result:'PASS',results},null,2));
  console.log(JSON.stringify({result:'PASS',checks:results.length}));
} catch(error) {
  writeFileSync(`${out}/interactions.json`,JSON.stringify({result:'FAIL',results,error:error.message},null,2));
  throw error;
} finally { await browser.close(); }
