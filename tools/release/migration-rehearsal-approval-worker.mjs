// Runs only inside a network-none recovery namespace. No Production credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID,randomBytes,createHmac} from 'node:crypto';
import pg from 'pg';
import ts from 'typescript';
import {createClient} from '@supabase/supabase-js';

if(process.platform!=='linux'||fs.readFileSync('/proc/net/route','utf8').split('\n').some(x=>x.trim().split(/\s+/)[1]==='00000000')) throw Error('Network-none Linux namespace required');
const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(!/^migration_rehearsal_tests(?:_[a-z0-9]+)?$/.test(config.database)) throw Error('Disposable test database required');
const db=new pg.Client({host:'127.0.0.1',port:5432,user:'supabase_admin',database:config.database});await db.connect();
const service=createClient('http://127.0.0.1:54321',config.service,{auth:{persistSession:false,autoRefreshToken:false}});
const report={status:'RUNNING',classification:'ISOLATED_RESTORED_PRODUCTION_WITH_SYNTHETIC_ADMIN_SESSIONS',checks:[],productionConnections:0};
const check=name=>report.checks.push({name,status:'PASS'});
const a={id:randomUUID(),email:'migration-admin-a@example.test'},b={id:randomUUID(),email:'migration-admin-b@example.test'},outsider={id:randomUUID(),email:'outsider@example.test'};
let session=a,verified=true;
function customerClient(user){
  const unsigned=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',email:user.email,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
  const token=unsigned+'.'+createHmac('sha256',config.jwt).update(unsigned).digest('base64url');
  const client=createClient('http://127.0.0.1:54321',config.service,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
  client.auth.getUser=async()=>({data:{user},error:null});return client;
}
const require=createRequire(import.meta.url),cache=new Map();
const mocks={
  'server-only':{},
  'next/headers':{cookies:async()=>({get:()=>verified?{value:'true'}:undefined,set(){}})},
  'next/navigation':{redirect:url=>{throw Error('ADMIN_REDIRECT:'+url)}},
  '@/lib/env':{getAdminEmailsEnv:()=>a.email+','+b.email},
  '@/lib/supabase/server':{createClient:async()=>customerClient(session)},
  '@/lib/supabase/service-role':{createServiceRoleClient:()=>service},
  '@/lib/trust-engine/createAuditLog':{createAuditLog:async()=>{}},
  '@/lib/security':{checkRequestRateLimit:()=>null},
  '@/lib/operations/observability':{emitTraceSpan:()=>{}},
  '@/lib/providers/hopae-rc1-server':{Rc1ProviderError:class extends Error{},retrieveHopaeTrustAssessment:()=>{throw Error('External provider access forbidden')},startHopaeTrustAssessment:()=>{throw Error('External provider access forbidden')}},
};
function load(filename){
  const file=path.resolve(filename);if(cache.has(file))return cache.get(file).exports;
  const loadedModule={exports:{}};cache.set(file,loadedModule);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const localRequire=id=>{
    if(Object.hasOwn(mocks,id))return mocks[id];
    if(id.startsWith('@/')||id.startsWith('.')){let p=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(file),id);if(!path.extname(p))p+='.ts';if(p.endsWith('.ts'))return load(p);}
    return require(id);
  };
  new Function('require','module','exports',code)(localRequire,loadedModule,loadedModule.exports);return loadedModule.exports;
}
const {updateAccountApproval}=load('lib/auth/update-account-approval.ts');
const {authenticatePublicApiRequest,createApiKeyMaterial}=load('lib/public-api/v1/authentication.ts');
function form(user,status='APPROVED',reason='Isolated qualification; no live owner disposition') {const f=new FormData();f.set('user_id',user);f.set('status',status);f.set('reason',reason);f.set('actor_user_id',outsider.id);return f;}
async function asCustomer(id,callback){await db.query('begin');try{await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[id,JSON.stringify({sub:id,role:'authenticated',user_metadata:{admin:true,approval:'APPROVED',tenant:'forged'}})]);await db.query('set local role authenticated');await callback();}finally{await db.query('rollback');}}
try {
  const original=(await db.query('select id from auth.users order by id')).rows;
  assert.equal(original.length,5);
  assert.equal((await db.query("select count(*)::int n from account_access_approvals where status='PENDING'")).rows[0].n,5);
  const keys=(await db.query("select count(*)::int total,count(*) filter(where a.status='APPROVED')::int approved_owners from api_keys k left join account_access_approvals a on a.user_id=coalesce(k.created_by,k.owner_user_id,k.user_id)")).rows[0];assert.equal(keys.total,36);assert.equal(keys.approved_owners,0);report.existingKeys=keys;check('All 36 existing API-key records inherit an unapproved owner after backfill');
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4),($5,$6)',[a.id,a.email,b.id,b.email,outsider.id,outsider.email]);
  session=outsider;await assert.rejects(updateAccountApproval(form(original[0].id)),/ADMIN_REDIRECT/);check('Real admin allowlist rejects unauthorized session');
  session=a;verified=false;await assert.rejects(updateAccountApproval(form(original[0].id)),/ADMIN_REDIRECT/);check('Real admin gate rejects missing verified admin cookie');verified=true;
  await assert.rejects(updateAccountApproval(form(a.id)),/cannot approve their own/);check('Server action rejects self approval');
  await assert.rejects(updateAccountApproval(form(original[0].id,'APPROVED',' ')),/reason/);check('Server action requires an audit reason');
  const self=await service.rpc('set_account_access_status',{p_user_id:a.id,p_status:'APPROVED',p_actor_user_id:a.id,p_reason:'forged self'});assert.match(self.error?.message??'',/SELF_APPROVAL/);check('Database RPC independently rejects self approval');
  const direct=await service.from('account_access_approvals').update({status:'APPROVED',approved_by:a.id}).eq('user_id',original[0].id);assert.equal(direct.error?.code,'42501');check('Service-role direct status edits denied');
  const absentActor=await service.rpc('set_account_access_status',{p_user_id:original[0].id,p_status:'APPROVED',p_actor_user_id:null,p_reason:'missing actor'});assert.match(absentActor.error?.message??'',/ACTOR_AND_REASON/);check('Missing actor cannot create an unattributed approval');
  await updateAccountApproval(form(b.id));session=b;await updateAccountApproval(form(a.id));session=a;check('Two distinct allowlisted administrators bootstrap each other through audited RPC; pending customer access does not grant or block platform administration');
  for(const user of original)await updateAccountApproval(form(user.id));
  const events=(await db.query("select user_id,actor_user_id,reason,metadata from account_access_approval_events where event_type='ACCESS_APPROVED' and user_id=any($1::uuid[])",[original.map(x=>x.id)])).rows;
  assert.equal(events.length,5);assert.ok(events.every(e=>e.actor_user_id===a.id&&e.user_id!==a.id&&e.reason&&e.metadata.previous_status==='PENDING'));check('All five restored accounts can be approved with verified actor and atomic audit; forged form actor ignored');
  const before=(await db.query('select count(*)::int n from account_access_approval_events')).rows[0].n;await updateAccountApproval(form(original[0].id));assert.equal((await db.query('select count(*)::int n from account_access_approval_events')).rows[0].n,before);check('Retry does not duplicate approval event');
  const tamper=await service.from('account_access_approval_events').update({reason:'tamper'}).eq('user_id',original[0].id);assert.equal(tamper.error?.code,'42501');check('Service role cannot rewrite audit events');
  const wa=randomUUID(),wb=randomUUID();await db.query('insert into trust_workspaces(id,name,created_by) values($1,$2,$3),($4,$5,$6)',[wa,'Migration A',a.id,wb,'Migration B',b.id]);
  await asCustomer(a.id,async()=>{const r=await db.query('select id from trust_workspaces where id=any($1::uuid[])',[[wa,wb]]);assert.deepEqual(r.rows.map(x=>x.id),[wa]);});check('Approved customer sees own tenant only despite forged claims');
  await asCustomer(a.id,async()=>{await assert.rejects(db.query('insert into workspace_members(workspace_id,user_id,role) values($1,$2,$3)',[wb,a.id,'owner']),/row-level security|permission denied/);});check('Cross-tenant membership escalation denied');
  await asCustomer(a.id,async()=>{await assert.rejects(db.query("select set_account_access_status($1,'APPROVED',$2,'forged')",[outsider.id,a.id]),/permission denied/);});check('Authenticated customer cannot invoke admin transition RPC');
  await asCustomer(outsider.id,async()=>{assert.equal((await db.query('select * from trust_workspaces')).rows.length,0);});check('Pending customer cannot read workspaces even with forged approval claim');
  // Use a newly minted local key so no Production key or pepper is recovered.
  process.env.API_KEY_PEPPER=randomBytes(32).toString('hex');const material=createApiKeyMaterial();const keyId=randomUUID();
  const columns=(await db.query("select column_name,data_type from information_schema.columns where table_schema='public' and table_name='api_keys' and is_nullable='NO' and column_default is null")).rows;
  const row={id:keyId,tenant_id:wa,client_id:randomUUID(),owner_user_id:a.id,user_id:a.id,created_by:a.id,label:'local rehearsal',key_prefix:material.prefix,key_hash:material.secretHash,status:'active',scopes:['trust:read']};
  for(const c of columns)if(row[c.column_name]===undefined)row[c.column_name]=c.data_type==='uuid'?randomUUID():c.data_type==='ARRAY'?[]:c.data_type==='jsonb'?{}:'local';
  const names=Object.keys(row);await db.query('insert into api_keys('+names.map(n=>'"'+n+'"').join(',')+') values('+names.map((_,i)=>'$'+(i+1)).join(',')+')',Object.values(row));
  const request=()=>new Request('http://127.0.0.1/api/v1/trust/transactions/local',{headers:{authorization:'Bearer '+material.rawKey}});
  assert.equal((await authenticatePublicApiRequest(request(),['trust:read'])).tenantId,wa);check('Actual V1 authenticator permits approved owner with valid locally minted key');
  session=b;
  for(const status of ['SUSPENDED','REVOKED','REJECTED']){await updateAccountApproval(form(a.id,status));await assert.rejects(authenticatePublicApiRequest(request(),['trust:read']),e=>e.code==='ACCESS_APPROVAL_REQUIRED');await asCustomer(a.id,async()=>assert.equal((await db.query('select * from trust_workspaces')).rows.length,0));check(status+' invalidates existing key and authenticated RLS access immediately');}
  await updateAccountApproval(form(a.id));assert.equal((await authenticatePublicApiRequest(request(),['trust:read'])).tenantId,wa);check('Audited reapproval restores key access without reissuing key');
  await db.query('delete from workspace_members where workspace_id=$1 and user_id=$2',[wa,a.id]);await db.query('update trust_workspaces set created_by=$1 where id=$2',[b.id,wa]);await assert.rejects(authenticatePublicApiRequest(request(),['trust:read']),e=>e.code==='API_KEY_INACTIVE');check('Key loses access when tenant membership is removed');
  assert.equal((await db.query("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and c.relname <> 'account_access_approvals' and not exists(select 1 from pg_policy p where p.polrelid=c.oid and p.polname='customer approval required' and not p.polpermissive)")).rows[0].n,0);check('Every public customer table retains restrictive approval policy');
  const gateway=load('app/api/trust/execute/route.ts');
  const wg=randomUUID();await db.query('insert into trust_workspaces(id,name,created_by) values($1,$2,$3)',[wg,'Gateway rehearsal',a.id]);
  session={...a,app_metadata:{active_enterprise_id:wg}};
  const fixtureSource=fs.readFileSync('tests/canonical-trust-transaction.test.mjs','utf8');const fixtureCode=fixtureSource.slice(fixtureSource.indexOf('function trustObject()'),fixtureSource.indexOf('function operationalEntity('));
  async function insert(table,row){const r=await service.from(table).insert(row);if(r.error)throw Error('Gateway fixture '+table+': '+r.error.code);}
  for(const decision of ['ALLOW','REVIEW','DENY']){
    const subjectId='gateway-'+randomUUID(),workflowId=randomUUID(),contractId=randomUUID(),now=new Date().toISOString();
    const {authority}=new Function('tenantId','actorId','subjectId','workflowId','requestedAt',fixtureCode+';return {authority};')(wg,a.id,subjectId,workflowId,now);
    const contract=authority({contractId,issuedAt:new Date(Date.now()-60000).toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString()});
    await insert('trust_subjects',{enterprise_id:wg,domain_key:'AI_AGENT',subject_type:'ai_agent',subject_id:subjectId,display_label:'Isolated '+decision});
    await insert('subject_trust_state',{enterprise_id:wg,subject_id:subjectId,state:'VERIFIED',confidence:95,domain_key:'AI_AGENT'});
    await insert('operational_entities',{entity_id:subjectId,enterprise_id:wg,entity_type:'ai_agent',display_reference:'Isolated '+decision,canonical_trust_object_id:subjectId,lifecycle_state:'active',accountable_owner_id:a.id,organization_reference:wg,identity_profile_reference:subjectId,current_trust_state:'verified',current_evidence_state:'current',current_consequence_classification:'low',canonical_digest:'e'.repeat(64),current_authority_references:[contractId],environment_references:['sandbox'],workflow_references:['settle_invoice'],provider_references:['hopae_connect']});
    await insert('trust_contracts',{contract_id:contractId,enterprise_id:wg,subject_type:'ai_agent',subject_id:subjectId,workflow_id:workflowId,authorized_objective:'settle_invoice',contract,policy_version:'1.0.0',revocation_state:'active',issued_at:contract.issuedAt,expires_at:contract.expiresAt,record_hash:'a'.repeat(64),correlation_id:randomUUID(),actor_id:a.id});
    if(decision==='ALLOW')await insert('trust_policy_versions',{enterprise_id:wg,policy_id:'policy-settlement',version:'1.0.0',layer:'ENTERPRISE_OVERRIDE',domain_key:'AI_AGENT',active:true,valid_from:contract.issuedAt,rules:{},policy_hash:'c'.repeat(64),created_by:a.id});
    if(decision!=='REVIEW')await insert('evidence_objects',{enterprise_id:wg,provider_key:'hopae_connect',evidence_classification:'NORMALIZED',storage_boundary:'NORMALIZED_LEDGER',occurred_at:now,evidence_id:randomUUID(),domain_key:'AI_AGENT',subject_id:subjectId,subject_type:'ai_agent',evidence_type:'IDENTITY_SESSION',source_type:'ISOLATED_REHEARSAL_FIXTURE',source_key:'migration-rehearsal',result:decision==='ALLOW'?'POSITIVE':'NEGATIVE',assurance_level:'HIGH',cryptographically_verified:false,server_verified:true,received_at:now,expires_at:contract.expiresAt,payload_hash:'a'.repeat(64),canonicalization:'JCS',hash_algorithm:'SHA-256',reason_codes:['SYNTHETIC_ISOLATED_FIXTURE'],observed_at:now,freshness_policy_seconds:3600,normalized_facts:{environment:'sandbox',synthetic:true}});
    const body={subject_type:'ai_agent',subject_id:subjectId,operational_entity_id:subjectId,requested_action:'settle_invoice',requested_purpose:'settle_invoice',resource:'invoice:isolated',environment:'sandbox',payload_digest:'b'.repeat(64),idempotency_key:'migration-'+randomUUID()};
    const request=()=>new Request('http://127.0.0.1/api/trust/execute',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const response=await gateway.POST(request());const result=await response.json();assert.equal(response.status,201,JSON.stringify(result));assert.equal(result.receipt.decision,decision);const receipt=result.receipt;assert.ok(receipt.replayReference&&receipt.trustMemoryReference);check('Actual Trust Gateway route persists '+decision+' with receipt, Replay and Trust Memory');
    const retry=await gateway.POST(request());assert.equal(retry.status,200);assert.equal((await retry.json()).receipt.transactionId,receipt.transactionId);check('Gateway '+decision+' idempotent retry preserves transaction');
    for(const [table,column,id]of [['canonical_trust_transactions','transaction_id',receipt.transactionId],['trust_replay_sessions','id',receipt.replayReference],['trust_memory_index','memory_id',receipt.trustMemoryReference]]){
      const own=await customerClient(a).from(table).select(column).eq(column,id);const other=await customerClient(b).from(table).select(column).eq(column,id);assert.equal(own.error,null);assert.equal(own.data.length,1);assert.equal(other.error,null);assert.equal(other.data.length,0);
    }check('Gateway '+decision+' persisted receipt/Replay/Memory enforce tenant RLS');
    session=outsider;const pending=await gateway.POST(request());assert.equal(pending.status,403);session={...a,app_metadata:{active_enterprise_id:wg}};check('Pending account cannot execute Trust Gateway '+decision+' request');
  }
  report.status='PASS';
}catch(error){report.status='FAIL';report.error={message:error.message,code:error.code};process.exitCode=1;}
finally{await db.end();fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
