import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const out='artifacts/recovery-20261103';
const browser=await chromium.launch({headless:true});const page=await browser.newPage();const results=[];
try {
 for(const [route,heading] of [['/help','How can we help?'],['/demo/trust-runtime','Sign-in is currently unavailable'],['/world-id-preview','Sign-in is currently unavailable'],['/enterprise-access?intent=pilot','Start Pilot'],['/enterprise-access?intent=demo','Request Enterprise Demo']]){
  const response=await page.goto('http://127.0.0.1:4333'+route);assert.equal(response.status(),200);await page.getByRole('heading',{level:1,name:heading,exact:route!='/help'}).waitFor();assert.equal(await page.getByText('This page could not be loaded safely.',{exact:true}).count(),0);results.push({route,status:200,heading});
 }
 const mail=page.getByRole('link',{name:'Contact the founder about access or a pilot'});assert.match(await mail.getAttribute('href'),/^mailto:emeaexecutive@icloud.com/);results.push({conversion:'founder explicitly approved this public mailbox on 3 November 2026; mailto inspected, no send or delivery claim'});
 await page.screenshot({path:out+'/auth-and-contact.png',fullPage:true});
 fs.writeFileSync(out+'/route-smoke.json',JSON.stringify({results},null,2));
} finally {await browser.close();}
