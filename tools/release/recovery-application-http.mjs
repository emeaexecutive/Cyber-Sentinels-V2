// Execute inside the isolated app container; real HTTP, real Auth, real restored SQL.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {randomUUID,randomBytes,createHash} from 'node:crypto';import assert from 'node:assert/strict';
const require=createRequire('/app/package.json'),{createServerClient}=require('@supabase/ssr'),{createClient}=require('@supabase/supabase-js');
if(process.env.NEXT_PUBLIC_SUPABASE_URL!=='http://127.0.0.1:54321')throw new Error('Local Supabase URL required');
if(fs.readFileSync('/proc/net/route','utf8').split('\n').slice(1).some(x=>x.trim().split(/\s+/)[1]==='00000000'))throw new Error('No default route permitted');
const runId=process.argv[2]??randomUUID(),dir='/app/.recovery-evidence/'+runId;fs.mkdirSync(dir,{recursive:true,mode:0o700});
const report={runId,release:'3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571',startedAt:new Date().toISOString(),status:'BLOCKED',checks:[],identities:[],isolatedRestoreValidated:false};
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const userClient=identity=>createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>identity.cookie.split('; ').map(p=>({name:p.slice(0,p.indexOf('=')),value:p.slice(p.indexOf('=')+1)})),setAll:()=>{}}});
const record=(name,expected,actual,evidence,identity)=>{report.checks.push({name,expected,actual,status:JSON.stringify(expected)===JSON.stringify(actual)?'PASS':'FAIL',evidence,tenantId:identity?.tenant??null,actorId:identity?.id??null});};
let seq=0;
async function request(name,url,{identity,method='GET',body,enterprise,expected=200}={}){
 const headers={host:'localhost:3000'};if(identity)headers.cookie=identity.cookie;if(enterprise??identity?.tenant)headers['x-enterprise-id']=enterprise??identity.tenant;if(body){headers['content-type']='application/json';headers.origin='http://localhost:3000';}
 const response=await fetch('http://127.0.0.1:3000'+url,{method,headers,body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(120000)});const raw=await response.text();const tag=String(++seq).padStart(3,'0');
 fs.writeFileSync(path.join(dir,tag+'.response.private.txt'),raw,{mode:0o600});
 const evidence={path:url,method,status:response.status,location:response.headers.get('location'),bodySha256:createHash('sha256').update(raw).digest('hex'),bodyFile:tag+'.response.private.txt',tenantId:enterprise??identity?.tenant??null,actorId:identity?.id??null};fs.writeFileSync(path.join(dir,tag+'.json'),JSON.stringify(evidence,null,2)+'\n');
 record(name,expected,response.status,tag+'.json',identity);let data;try{data=JSON.parse(raw);}catch{}return {status:response.status,data,raw,evidence:tag+'.json'};
}
async function insert(table,rows){const r=await admin.from(table).insert(rows).select();if(r.error)throw new Error('Fixture '+table+': '+r.error.code+' '+r.error.message);return r.data;}
async function dataRead(name,table,column,id,identity,expected){const r=await userClient(identity).from(table).select('*').eq(column,id);const tag=String(++seq).padStart(3,'0');fs.writeFileSync(path.join(dir,tag+'.response.private.json'),JSON.stringify({path:'/rest/v1/'+table,filter:{[column]:id},status:r.status,data:r.data,error:r.error,actorId:identity.id,tenantId:identity.tenant}),{mode:0o600});record(name+' HTTP status',200,r.status,tag+'.response.private.json',identity);record(name+' row count',expected,r.data?.length??null,tag+'.response.private.json',identity);return r.data;}
async function identity(label){const jar=new Map(),password=randomBytes(24).toString('hex'),email='recovery-'+randomUUID()+'@example.invalid',authRequests=[];
 const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{global:{fetch:async(input,options)=>{const response=await fetch(input,options);const url=new URL(typeof input==='string'?input:input.url??String(input));authRequests.push({path:url.pathname,method:options?.method??'GET',status:response.status});return response;}},cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(x=>jar.set(x.name,x.value))}});
 const signup=await client.auth.signUp({email,password});if(signup.error)throw new Error('Local signup failed: '+signup.error.code);
 const login=await client.auth.signInWithPassword({email,password});if(login.error)throw new Error('Local login failed: '+login.error.code);
 const value={label,id:login.data.user.id,tenant:randomUUID(),cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')};report.identities.push({label,actorId:value.id,tenantId:value.tenant});await insert('trust_workspaces',{id:value.tenant,name:'Recovery '+label,created_by:value.id});
 const evidence='auth-'+label+'.json';fs.writeFileSync(path.join(dir,evidence),JSON.stringify({actorId:value.id,tenantId:value.tenant,requests:authRequests},null,2));
 for(const endpoint of ['signup','token'])record(label+' Auth '+endpoint+' HTTP status',200,authRequests.find(x=>x.path==='/auth/v1/'+endpoint)?.status??null,evidence,value);
 record(label+' real Auth login/session',true,Boolean(login.data.session),evidence,value);return value;
}
try{
 const a=await identity('A'),b=await identity('B');
 await dataRead('Workspace owner positive','trust_workspaces','id',a.tenant,a,1);
 await dataRead('Workspace tenant B denied','trust_workspaces','id',b.tenant,a,0);
 await request('Unauthenticated API denied','/api/agents',{expected:401});
 const unauth=await request('Unauthenticated protected route response','/operational-entities',{expected:200});
 record('Unauthenticated streamed response redirects to login',true,unauth.raw.includes('NEXT_REDIRECT')&&unauth.raw.includes('/login?next=/operational-entities'),unauth.evidence);
 await insert('ai_agents',[{id:randomUUID(),name:'Recovery Agent A',owner_user_id:a.id,enterprise_id:a.tenant},{id:randomUUID(),name:'Recovery Agent B',owner_user_id:b.id,enterprise_id:b.tenant}]);
 const agents=await request('Agent Registry authenticated read','/api/agents',{identity:a});
 record('Registry A positive and B absent',true,Boolean(agents.data?.agents?.some(x=>x.name==='Recovery Agent A')&&!agents.data?.agents?.some(x=>x.name==='Recovery Agent B')),agents.evidence,a);
 await dataRead('Direct Data API Agent Registry tenant B denied','ai_agents','enterprise_id',b.tenant,a,0);
 await request('Protected route valid session','/operational-entities',{identity:a});
 for(const endpoint of ['/api/trust-centre/overview','/api/trust-centre/reports?report=trust-summary&format=json','/api/trust/alerts','/api/trust-events']){
  await request(endpoint+' owner read',endpoint,{identity:a});await request(endpoint+' cross-tenant denial',endpoint,{identity:a,enterprise:b.tenant,expected:403});
 }
 const alert=(await insert('trust_alerts',{enterprise_id:a.tenant,subject_type:'ai_agent',subject_id:randomUUID(),alert_type:'continuous_recovery_probe',alert_title:'Recovery synthetic alert',severity:'low',status:'open',created_by:a.id,metadata:{recovery:true}}))[0];
 await request('Cross-tenant acknowledgement denied','/api/trust/alerts/'+alert.id+'/acknowledge',{identity:b,enterprise:a.tenant,method:'POST',body:{note:'Isolated denial probe'},expected:403});
 await request('Owner acknowledgement','/api/trust/alerts/'+alert.id+'/acknowledge',{identity:a,method:'POST',body:{note:'Isolated recovery probe'}});
 await request('Owner dismissal','/api/trust/alerts/'+alert.id+'/dismiss',{identity:a,method:'POST',body:{note:'Isolated synthetic alert closed'}});
 await request('Non-admin cannot access global Trust Memory benchmark','/api/trust-memory',{identity:a,expected:303});
 const fixtureSource=fs.readFileSync('/app/tests/canonical-trust-transaction.test.mjs','utf8');
 const fixtureCode=fixtureSource.slice(fixtureSource.indexOf('function trustObject()'),fixtureSource.indexOf('function operationalEntity('));
 report.receipts=[];
 for(const expectedDecision of ['ALLOW','REVIEW','DENY']){
  const subjectId='recovery-'+randomUUID(),workflowId=randomUUID(),now=new Date().toISOString(),contractId=randomUUID();
  const {authority}=new Function('tenantId','actorId','subjectId','workflowId','requestedAt',fixtureCode+';return {authority};')(a.tenant,a.id,subjectId,workflowId,now);
  const contract=authority({contractId,issuedAt:new Date(Date.now()-3600000).toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString()});
  await insert('trust_subjects',{enterprise_id:a.tenant,domain_key:'AI_AGENT',subject_type:'ai_agent',subject_id:subjectId,display_label:'Recovery '+expectedDecision});
  await insert('subject_trust_state',{enterprise_id:a.tenant,subject_id:subjectId,state:'VERIFIED',confidence:95,domain_key:'AI_AGENT'});
  await insert('operational_entities',{entity_id:subjectId,enterprise_id:a.tenant,entity_type:'ai_agent',display_reference:'Recovery '+expectedDecision,canonical_trust_object_id:subjectId,lifecycle_state:'active',accountable_owner_id:a.id,organization_reference:a.tenant,identity_profile_reference:subjectId,current_trust_state:'verified',current_evidence_state:'current',current_consequence_classification:'low',canonical_digest:'e'.repeat(64),current_authority_references:[contractId],environment_references:['sandbox'],workflow_references:['settle_invoice'],provider_references:['hopae_connect']});
  await insert('trust_contracts',{contract_id:contractId,enterprise_id:a.tenant,subject_type:'ai_agent',subject_id:subjectId,workflow_id:workflowId,authorized_objective:'settle_invoice',contract,policy_version:'1.0.0',revocation_state:'active',issued_at:contract.issuedAt,expires_at:contract.expiresAt,record_hash:'a'.repeat(64),correlation_id:randomUUID(),actor_id:a.id});
  if(expectedDecision==='ALLOW')await insert('trust_policy_versions',{enterprise_id:a.tenant,policy_id:'policy-settlement',version:'1.0.0',layer:'ENTERPRISE_OVERRIDE',domain_key:'AI_AGENT',active:true,valid_from:contract.issuedAt,rules:{},policy_hash:'c'.repeat(64),created_by:a.id});
  if(expectedDecision!=='REVIEW')await insert('evidence_objects',{enterprise_id:a.tenant,provider_key:'hopae_connect',evidence_classification:'NORMALIZED',storage_boundary:'NORMALIZED_LEDGER',occurred_at:now,evidence_id:randomUUID(),domain_key:'AI_AGENT',subject_id:subjectId,subject_type:'ai_agent',evidence_type:'IDENTITY_SESSION',source_type:'RECOVERY_SYNTHETIC_LOCAL',source_key:'recovery-harness',result:expectedDecision==='ALLOW'?'POSITIVE':'NEGATIVE',assurance_level:'HIGH',cryptographically_verified:false,server_verified:true,received_at:now,expires_at:contract.expiresAt,payload_hash:'a'.repeat(64),canonicalization:'JCS',hash_algorithm:'SHA-256',reason_codes:['SYNTHETIC_ISOLATED_RECOVERY_FIXTURE'],observed_at:now,freshness_policy_seconds:3600,normalized_facts:{environment:'sandbox',synthetic:true}});
  await request('Authority read '+expectedDecision,'/api/trust-fabric/contracts/'+contractId,{identity:a});
  const executed=await request('Execute '+expectedDecision,'/api/trust/execute',{identity:a,method:'POST',expected:201,body:{subject_type:'ai_agent',subject_id:subjectId,operational_entity_id:subjectId,requested_action:'settle_invoice',requested_purpose:'settle_invoice',resource:'invoice:recovery',environment:'sandbox',payload_digest:'b'.repeat(64),idempotency_key:'recovery-'+randomUUID()}});
  record('Decision '+expectedDecision,expectedDecision,executed.data?.receipt?.decision??null,executed.evidence,a);
  const receipt=executed.data?.receipt;if(!receipt)continue;report.receipts.push(receipt);
  record('Policy evaluation bound to version '+expectedDecision,'1.0.0',receipt.policy?.version,executed.evidence,a);
  await request('Receipt read '+expectedDecision,'/api/trust/transactions/'+receipt.transactionId+'/receipt',{identity:a});
  await request('Cross-tenant receipt denied '+expectedDecision,'/api/trust/transactions/'+receipt.transactionId+'/receipt',{identity:b,expected:404});
  record('Replay and Trust Memory references created '+expectedDecision,true,Boolean(receipt.replayReference&&receipt.trustMemoryReference),executed.evidence,a);
  const replay=await request('Replay application route '+expectedDecision,'/api/replay/'+receipt.replayReference,{identity:a,enterprise:false});
  record('Replay route returns persisted session '+expectedDecision,receipt.replayReference,replay.data?.replay?.id??null,replay.evidence,a);
  await request('Replay application route tenant B denied '+expectedDecision,'/api/replay/'+receipt.replayReference,{identity:b,enterprise:false,expected:404});
  for(const [table,column,reference]of[['trust_replay_sessions','id',receipt.replayReference],['trust_memory_index','memory_id',receipt.trustMemoryReference]]){
   await dataRead(expectedDecision+' '+table+' owner read',table,column,reference,a,1);
   await dataRead(expectedDecision+' '+table+' tenant B denied',table,column,reference,b,0);
  }
 }
 const {verifyTrustEventHash}=await import('/app/src/lib/trust-events/hash.ts');
 const events=await admin.from('trust_events').select('event_id,enterprise_id,sequence,previous_hash,event_hash,canonical_event').eq('enterprise_id',a.tenant).order('sequence');
 if(events.error)throw new Error('Trust Event continuity query failed');
 const valid=events.data.length>=2&&events.data.every((e,i)=>verifyTrustEventHash(e.canonical_event)&&e.canonical_event.eventId===e.event_id&&e.canonical_event.enterpriseId===e.enterprise_id&&e.canonical_event.sequence===e.sequence&&e.canonical_event.eventHash===e.event_hash&&(i===0?e.previous_hash===null:e.previous_hash===events.data[i-1].event_hash));
 fs.writeFileSync(path.join(dir,'new-audit-events.private.json'),JSON.stringify(events.data),{mode:0o600});record('Alert acknowledgement/dismissal audit hash and chain continuity',true,valid,'new-audit-events.private.json',a);
 const fixtures={a,b};fs.writeFileSync(path.join(dir,'fixtures.private.json'),JSON.stringify(fixtures),{mode:0o600});
 report.status=report.checks.some(x=>x.status==='FAIL')?'FAIL':'PASS';report.scope='Integrated application happy paths, authorization, persistence, audit; dependency-outage gates are separate and required';
}catch(error){report.status='FAIL';report.error=error.message;}
finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(dir,'application-http-result.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});}
console.log(JSON.stringify({status:report.status,checks:report.checks.map(({name,status,expected,actual})=>({name,status,expected,actual})),error:report.error,evidenceDirectory:dir}));if(report.status==='FAIL')process.exitCode=1;
