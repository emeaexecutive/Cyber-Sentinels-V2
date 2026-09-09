import { chromium } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const origin='https://www.cybersentinels.com';
const context=await chromium.launchPersistentContext(join(tmpdir(),'cs-production-proof-playwright'),{headless:true,executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'});
try {
  const page=await context.newPage();
  await page.goto(`${origin}/workspace`,{waitUntil:'networkidle'});
  const mode=process.argv[2] ?? 'inspect';
  if(!['inspect','capture-evidence'].includes(mode)&&process.env.I_CONFIRM_PRODUCTION!=='kecgtsfibkypjuaxqbjx') throw new Error('Explicit Production target confirmation required');
  if(mode==='create-isolation-workspace') {
    await page.getByPlaceholder('Workspace name').fill('CUSTOMER_ZERO_V1_TENANT_ISOLATION_20260909');
    await page.getByPlaceholder('Operational purpose').fill('Controlled Production release qualification: demonstrate cross-tenant API rejection. No customer data.');
    await page.getByRole('button',{name:'Create Workspace',exact:true}).click();
    await page.waitForURL(/\/workspace\/[a-f0-9-]{36}$/);
    const tenant=page.url().split('/').at(-1);
    await writeFile(join(tmpdir(),'cyber-v1-production-Po3xh7','isolation-workspace.json'),JSON.stringify({tenant,createdThrough:'Authenticated Create Workspace form',createdAt:new Date().toISOString()},null,2));
    console.log(JSON.stringify({mode,tenant}));
  } else if(mode==='revoke-proof-keys') {
    const cleanup={checkedAt:new Date().toISOString(),keys:[]};
    for(const file of ['key-metadata.json','isolation-key-metadata.json']) {
      const metadata=JSON.parse(await readFile(join(tmpdir(),'cyber-v1-production-Po3xh7',file),'utf8'));
      const response=await context.request.patch(`${origin}/api/developer/api-keys`,{headers:{'x-enterprise-id':metadata.tenant},data:{key_id:metadata.key.id,action:'revoke'}});
      const body=await response.json();
      cleanup.keys.push({tenant:metadata.tenant,keyId:metadata.key.id,httpStatus:response.status(),status:body.key?.status,revokedAt:body.key?.revoked_at,error:body.error});
      await writeFile('docs/release/v1-production-closure/key-cleanup.json',JSON.stringify(cleanup,null,2));
    }
    assert.ok(cleanup.keys.every(key=>key.httpStatus===200&&key.status==='revoked'));
    console.log(JSON.stringify(cleanup));
  } else if(mode==='outcome-review' || mode==='capture-evidence') {
    const directory='docs/release/v1-production-closure';
    const proof=JSON.parse(await readFile(`${directory}/customer-zero.json`,'utf8'));
    assert.ok(['EXTERNAL_AUTHORIZATION_AND_REVOCATION_PASS','REVIEW_TO_DENY_VERIFIED_ALLOW_GATE_BLOCKED'].includes(proof.result));
    const {agent,firstDecision,secondDecision,revocation}=proof.stages;
    const tenant=agent.manifest_context.enterprise_id;
    const results={startedAt:new Date().toISOString(),tenant,sourceSha:proof.sourceSha,stages:{}};
    const request=async(name,path,body)=>{
      const response=body ? await context.request.post(`${origin}${path}`,{headers:{'x-enterprise-id':tenant},data:body}) : await context.request.get(`${origin}${path}`,{headers:{'x-enterprise-id':tenant}});
      const value={path,status:response.status(),body:await response.json()};
      results.stages[name]=value;
      await writeFile(`${directory}/application-evidence.json`,JSON.stringify(results,null,2));
      assert.ok(response.ok(),`${name}: ${value.status} ${JSON.stringify(value.body)}`);
      console.log(JSON.stringify({stage:name,status:value.status}));
      return value.body;
    };
    const receiptPath=`/api/trust/transactions/${firstDecision.transaction_id}/receipt`;
    await request('originalReceiptBefore',receiptPath);
    if(mode==='outcome-review') await request('outcomeReview',`/api/trust/transactions/${firstDecision.transaction_id}/outcome-review`,{
      originalDecision:firstDecision.decision,adjudicatedOutcome:'DENY',evaluationStatus:'CONTRADICTED',
      humanOverride:{occurred:true,resultingDecision:'DENY',reason:'User-authorized controlled release adjudication: deny continued use following authority revocation. The original decision at T1 is preserved; no downstream execution or provider outcome is claimed.',evidenceReference:revocation.revocation_reference},
      providerOutcome:null,runtimeOutcome:null,destinationOutcome:null,
    });
    await request('originalReceiptAfter',receiptPath);
    await request('secondReceipt',`/api/trust/transactions/${secondDecision.transaction_id}/receipt`);
    await request('trustMemory',`/api/trust-architecture/subjects/${encodeURIComponent(agent.operational_entity_id)}/timeline`);
    await request('evidenceGraph',`/api/trust-architecture/subjects/${encodeURIComponent(agent.operational_entity_id)}/graph`);
  } else console.log(JSON.stringify({url:page.url(),text:(await page.locator('main').innerText()).slice(0,16000)}));
} finally { await context.close(); }
