import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID}from'node:crypto';
const [runId,dependency]=process.argv.slice(2);if(!runId||!['data','auth'].includes(dependency))throw new Error('Run id and data/auth dependency required');
const dir='/app/.recovery-evidence/'+runId,{a}=JSON.parse(fs.readFileSync(dir+'/fixtures.private.json'));
const report={dependency,checks:[],status:'BLOCKED',tenantId:a.tenant,actorId:a.id};
try{
 const operations=dependency==='auth'?[{path:'/api/agents',method:'GET',expected:503}]:[{path:'/api/agents',method:'GET',expected:500},{path:'/api/trust/execute',method:'POST',expected:503,body:{subject_type:'ai_agent',subject_id:'missing-dependency-probe',requested_action:'settle_invoice',requested_purpose:'settle_invoice',resource:'invoice:recovery',environment:'sandbox',payload_digest:'b'.repeat(64),idempotency_key:'outage-'+randomUUID()}}];
 for(const op of operations){const r=await fetch('http://127.0.0.1:3000'+op.path,{method:op.method,headers:{host:'localhost:3000',origin:'http://localhost:3000',cookie:a.cookie,'content-type':'application/json','x-enterprise-id':a.tenant},body:op.body?JSON.stringify(op.body):undefined,redirect:'manual',signal:AbortSignal.timeout(60000)});const raw=await r.text();let body;try{body=JSON.parse(raw);}catch{}const denied=dependency==='auth'?raw==='Protected surface unavailable.':body?.ok===false&&!body?.receipt;
 const result={path:op.path,method:op.method,expected:op.expected,actual:r.status,body:body??raw,tenantId:a.tenant,actorId:a.id,status:r.status===op.expected&&denied?'PASS':'FAIL'};report.checks.push(result);assert.equal(result.status,'PASS');}
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.message;}
fs.writeFileSync(dir+'/dependency-'+dependency+'-result.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({dependency,status:report.status,checks:report.checks.map(({path,expected,actual,status})=>({path,expected,actual,status})),error:report.error}));if(report.status!=='PASS')process.exitCode=1;
