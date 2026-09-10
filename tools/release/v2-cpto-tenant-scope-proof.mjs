// Fresh real-HTTP tenant and least-privilege qualification; no database credentials.
import { request } from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {CyberSentinels} from '../../packages/cyber-sentinels-sdk/src/index.ts';
const dir=process.env.V2_PRIVATE_DIRECTORY,out=process.env.V2_EVIDENCE_DIRECTORY;
if(process.env.V2_STAGING_PROJECT!=='agpyhygpfmppjkxwcpac'||!dir||!out||process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Public-only Staging proof required');
const keys=JSON.parse(await readFile(`${dir}/issued-keys-credential-export.json`,'utf8'));
const sessions=JSON.parse(await readFile(`${dir}/staging-session-credential-export.json`,'utf8'));
const proof=JSON.parse(await readFile(`${out}/customer-zero.json`,'utf8'));
assert.equal(proof.result,'PASS');const tx=proof.stages.firstDecision.transaction_id,id=proof.stages.incident.incident_id;
const origin='https://localhost:3443',http=await request.newContext({baseURL:origin,ignoreHTTPSErrors:true});
const transport=async(url,init={})=>{assert.equal(new URL(String(url)).origin,origin);const r=await http.fetch(String(url),{method:init.method,headers:Object.fromEntries(new Headers(init.headers)),data:init.body});return new Response(await r.body(),{status:r.status(),headers:r.headers()});};
const other=new CyberSentinels({apiKey:keys[1].api_key,baseUrl:origin,fetch:transport});const result={project:process.env.V2_STAGING_PROJECT,negatives:[]};
const denied=async(name,fn,status)=>{try{await fn();assert.fail('Unexpected acceptance');}catch(e){assert.equal(e.status,status,`${name}: ${e.message}`);result.negatives.push({name,status,code:e.code});}};
const owner=await request.newContext({baseURL:origin,ignoreHTTPSErrors:true,storageState:{cookies:sessions[0].cookies.map(c=>({...c,expires:-1})),origins:[]}});
const tenantB=await request.newContext({baseURL:origin,ignoreHTTPSErrors:true,storageState:{cookies:sessions[1].cookies.map(c=>({...c,expires:-1})),origins:[]}});
try {
 await denied('cross-tenant canonical transaction',()=>other.trust.getTransaction(tx),404);
 await denied('cross-tenant context Replay',()=>other.incidents.replay(id),404);
 await denied('cross-tenant transaction incident opening',()=>other.incidents.open({transaction_id:tx,summary:'Isolation negative',observed_at:new Date().toISOString()}),404);
 await denied('cross-tenant authority revocation',()=>other.authority.revoke(proof.stages.agent.agent_id,proof.stages.authority.authority_id,'Isolation negative'),404);
 await denied('cross-tenant operational outcome',()=>other.trust.submitOutcome(tx,{source_id:'self',destination:'staging:negative',action_reference:`transaction:${tx}`,target:'repository:v2-staging-qualification',result:'FAILED',observed_at:new Date().toISOString(),evidence_reference:proof.stages.observations[0].evidence_object_id}),404);
 const errorShape=async(resource)=>{const r=await http.get(`/api/v1/incidents/${resource}`,{headers:{authorization:`Bearer ${keys[1].api_key}`}});assert.equal(r.status(),404);const b=await r.json();return {code:b.error.code,message:b.error.message};};
 assert.deepEqual(await errorShape(id),await errorShape(crypto.randomUUID()));result.existenceInference='PASS: same 404 code/message';
 const review={originalDecision:'ALLOW',adjudicatedOutcome:'DENY',evaluationStatus:'CONTRADICTED',humanOverride:null,providerOutcome:null,runtimeOutcome:null,destinationOutcome:null};
 const evalShape=async(resource)=>{const r=await tenantB.post(`/api/trust/transactions/${resource}/outcome-review`,{data:review});assert.equal(r.status(),404);const b=await r.json();return {error:b.error,message:b.message};};
 assert.deepEqual(await evalShape(tx),await evalShape(crypto.randomUUID()));result.crossTenantEvaluation='PASS: authenticated tenant B, same 404 for absent and inaccessible transaction';
 const issued=await owner.post('/api/developer/api-keys',{headers:{'x-enterprise-id':keys[0].tenant},data:{label:'V2_CPTO_LEGACY_SCOPE_NEGATIVE',environment:'test',expires_at:new Date(Date.now()+3600000).toISOString(),scopes:['trust:read']}});
 assert.equal(issued.status(),201);const body=await issued.json();assert.deepEqual(body.key.scopes,['trust:read']);
 keys.push({tenant:keys[0].tenant,user_id:keys[0].user_id,key_id:body.key.id,client_id:body.key.client_id,api_key:body.api_key});await writeFile(`${dir}/issued-keys-credential-export.json`,JSON.stringify(keys));
 for(const [method,path,data] of [['POST','/api/v1/incidents',{}],['GET',`/api/v1/incidents/${id}`],['POST',`/api/v1/incidents/${id}/chronology`,{}],['GET',`/api/v1/incidents/${id}/replay`],['POST',`/api/v1/incidents/${id}/exports`,{}]]){
 const r=await http.fetch(path,{method,headers:{authorization:`Bearer ${body.api_key}`},data});assert.equal(r.status(),403);const b=await r.json();result.negatives.push({name:`legacy scope ${method} ${path.replace(id,'{incidentId}')}`,status:r.status(),code:b.error.code});
 }
 result.legacyScopeKey={key_id:body.key.id,scopes:body.key.scopes};result.status='PASS';
} catch(error){result.status='BLOCKED';result.error=error.message;process.exitCode=1;}
finally{await Promise.all([http.dispose(),owner.dispose(),tenantB.dispose()]);await writeFile(`${out}/tenant-scope-proof.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));}