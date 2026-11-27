import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const out='artifacts/recovery-20261103';const browser=await chromium.launch({headless:true});const page=await browser.newPage();const results=[];
try {
 for(const route of ['/legal','/terms','/cookies','/security','/modern-slavery','/privacy','/how-to-use']){
  const response=await page.goto('http://127.0.0.1:4333'+route);assert.equal(response.status(),200);
  const main=page.locator('main').first();await main.getByText(/approved version has not been published/).waitFor();
  assert.doesNotMatch(await main.innerText(),/Jurisdiction Placeholder|Liability Placeholder|governing law|once counsel approves production routing|processed only for documented/);
  results.push({route,status:200,unapprovedPolicyWithheld:true});
 }
 const protectedResponse=await page.goto('http://127.0.0.1:4333/data-rights');assert.equal(protectedResponse.status(),503);assert.match(await page.locator('body').innerText(),/Protected surface unavailable/);results.push({route:'/data-rights',status:503,protectedMissingAuthGatePreserved:true});
 await page.goto('http://127.0.0.1:4333/contact');assert.match(page.url(),/\/enterprise-access\?intent=intro_call$/);await page.getByRole('heading',{level:1,name:'Book Intro Call',exact:true}).waitFor();results.push({route:'/contact',destination:'/enterprise-access?intent=intro_call',status:200});
 const mail=page.getByRole('link',{name:'Contact the founder about access or a pilot'});assert.match(await mail.getAttribute('href'),/^mailto:emeaexecutive@icloud.com\?subject=/);assert.equal(await page.locator('form button[type=submit]').isDisabled(),true);results.push({conversion:'approved mailbox inspected; CAPTCHA and empty-form guard retained; nothing submitted'});
 await page.goto('http://127.0.0.1:4333/funding');const brief=page.getByRole('link',{name:'Request Investor Brief',exact:true}).first();assert.match(await brief.getAttribute('href'),/^mailto:emeaexecutive@icloud.com/);results.push({route:'/funding',investorMailto:true});
 await page.goto('http://127.0.0.1:4333/help');await page.getByRole('heading',{level:1,name:'How can we help?',exact:true}).waitFor();results.push({route:'/help',publicGuidance:true});
 await page.goto('http://127.0.0.1:4333/terms');const reject=page.getByRole('button',{name:'Reject Optional',exact:true});if(await reject.isVisible()){await reject.click();await page.getByRole('dialog').waitFor({state:'hidden'});}const dismiss=page.getByRole('button',{name:'Dismiss',exact:true});await dismiss.waitFor({state:'visible',timeout:3000}).catch(()=>{});if(await dismiss.isVisible())await dismiss.click();await page.screenshot({path:out+'/legal-publication-notice.png',fullPage:true});
 fs.writeFileSync(out+'/p0-browser-results.json',JSON.stringify({result:'PASS',results},null,2));console.log(JSON.stringify({result:'PASS',checks:results.length}));
} catch(error){fs.writeFileSync(out+'/p0-browser-results.json',JSON.stringify({result:'FAIL',results,error:error.message},null,2));throw error;}finally{await browser.close();}
