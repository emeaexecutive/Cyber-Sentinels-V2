const evidenceDirectory = process.env.V2_EVIDENCE_DIRECTORY ?? 'docs/v2/qualification';
import { chromium, request } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const directory=process.env.V2_PRIVATE_DIRECTORY;
if(process.env.V2_STAGING_PROJECT!=='agpyhygpfmppjkxwcpac'||!directory)throw new Error('Exact Staging target required');
const accounts=JSON.parse(await readFile(`${directory}/staging-session-credential-export.json`,'utf8'));
const proof=JSON.parse(await readFile(`${evidenceDirectory}/customer-zero.json`,'utf8'));
assert.equal(proof.result,'PASS');
const {agent,firstDecision,revocation,incident}=proof.stages;
const account=accounts[0],origin='https://localhost:3443';
const state={cookies:account.cookies.map(cookie=>({...cookie,expires:-1})),origins:[]};
const http=await request.newContext({baseURL:origin,ignoreHTTPSErrors:true,storageState:state});
const result={project:'agpyhygpfmppjkxwcpac',stages:{}};
try {
 const get=async(name,path)=>{const response=await http.get(path,{headers:{'x-enterprise-id':account.tenant}});const body=await response.json();assert.equal(response.status(),200,`${name}: ${response.status()}`);result.stages[name]=body;return body;};
 const before=await get('receiptBefore',`/api/trust/transactions/${firstDecision.transaction_id}/receipt`);
 if(before.decisionOutcomeReview?.evaluationStatus!=='CONTRADICTED') {
  const reviewed=await http.post(`/api/trust/transactions/${firstDecision.transaction_id}/outcome-review`,{headers:{'x-enterprise-id':account.tenant,'origin':origin},data:{originalDecision:'ALLOW',adjudicatedOutcome:'DENY',evaluationStatus:'CONTRADICTED',humanOverride:{occurred:true,resultingDecision:'DENY',reason:'Staging qualification adjudication after test authority revocation; original authorization remains unchanged.',evidenceReference:revocation.revocation_reference},providerOutcome:null,runtimeOutcome:null,destinationOutcome:null}});
  assert.equal(reviewed.status(),201);result.stages.outcomeReview=await reviewed.json();
 } else result.stages.outcomeReview=before.decisionOutcomeReview;
 const after=await get('receiptAfter',`/api/trust/transactions/${firstDecision.transaction_id}/receipt`);
 assert.equal(after.decision,before.decision);assert.equal(after.decisionDigest,before.decisionDigest);assert.deepEqual(after.reasonCodes,before.reasonCodes);
 const memory=await get('memory',`/api/trust-architecture/subjects/${encodeURIComponent(agent.agent_id)}/timeline`);
 const rows=memory.timeline.memory;
 for(const kind of ['INCIDENT_TRANSACTION_LINK','INCIDENT_EXECUTION_OBSERVATION','INCIDENT_OUTCOME','INCIDENT_INTERVENTION','INCIDENT_REMEDIATION','INCIDENT_PURPOSE_OBSERVATION','INCIDENT_EVIDENCE_EXPORT','DECISION_OUTCOME_REVIEW']) assert.ok(rows.some(row=>row.memory_type===kind),`Missing Memory ${kind}`);
 await get('graph',`/api/trust-architecture/subjects/${encodeURIComponent(agent.agent_id)}/graph`);
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'});
 try {
  const context=await browser.newContext({ignoreHTTPSErrors:true,storageState:state,viewport:{width:1440,height:1000}});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(`${origin}/dashboard/incident-evidence?incident=${incident.incident_id}`,{waitUntil:'networkidle',timeout:120000});
  const rejectOptional=page.getByRole('button',{name:'Reject Optional',exact:true});
  if(await rejectOptional.isVisible()) { await rejectOptional.click(); await page.reload({waitUntil:'networkidle'}); }
  assert.equal(response.status(),200);await page.getByRole('heading',{name:'Incident Evidence',exact:true}).waitFor();
  for(const heading of ['01 Authority','02 Actor','03 Decision','04 Execution','05 Incident','06 Intervention','07 Outcome','08 Remediation','Replay chronology','Evidence and receipts'])assert.equal(await page.getByRole('heading',{name:heading,exact:true}).count(),1);
  assert.deepEqual(errors,[]);await page.screenshot({path:`${evidenceDirectory}/incident-evidence-desktop.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${evidenceDirectory}/incident-evidence-mobile.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Mobile horizontal overflow');
  result.browser={status:'PASS',headings:10,consoleErrors:errors,mobileOverflow:false};await context.close();
 }finally{await browser.close();}
 result.status='PASS';
}catch(error){result.status='BLOCKED';result.error=error.message;process.exitCode=1;}
finally{await http.dispose();await writeFile(`${evidenceDirectory}/application-proof.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,error:result.error,browser:result.browser}));}
