import assert from 'node:assert/strict';
import test,{before,after} from 'node:test';
import {randomUUID} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import pg from 'pg';
import {executeAuthorizedAction,deriveEnforcementActionDigest,signDestinationObservation} from '../lib/operational-entities/native-enforcement.ts';
import {createHttpToolAdapter,verifyToolDispatch} from '../lib/operational-entities/http-tool-adapter.ts';
import {RestrictedPostgresConnectionAdapter,RESTRICTED_POSTGRES_PRIVILEGE_CHECK} from '../lib/qualification/restricted-postgres-connection.ts';
import {hashCanonical} from '../src/lib/trust-core/hash.ts';
const port=Number(process.env.NATIVE_CURRENT_PG_PORT??55643);
assert.ok(port===55643||(port===5432&&process.env.CI==='true'));
const config={host:'127.0.0.1',port,user:'postgres',password:process.env.NATIVE_CURRENT_PG_PASSWORD,database:'postgres',connectionTimeoutMillis:3000};
const database='current_dispatch_'+randomUUID().replaceAll('-','');
const key='synthetic-local-destination-key-'.repeat(2),evidence=[];
let admin,db,observer,server,url;let gatewayRolesCreated=false;const actors=new Map();let httpCalls=0;
const connect=async()=>{const c=new pg.Client({...config,database});await c.connect();await c.query("set request.jwt.claim.role='service_role'");return c;};
before(async()=>{
 admin=new pg.Client(config);await admin.connect();
 if(port===55643)assert.equal(resolve((await admin.query('show data_directory')).rows[0].data_directory).toLowerCase(),resolve('tmp/native-repair-pg/data').toLowerCase());
 await admin.query(`create database ${database}`);db=await connect();observer=await connect();
 for(const f of ['tests/fixtures/native-dispatch-database.sql','supabase/migrations/20261108100241_atomic_native_dispatch.sql','tests/fixtures/native-current-dispatch.sql','supabase/migrations/20261125161249_native_dispatch_current_authority.sql'])await db.query(readFileSync(f,'utf8'));
 server=createServer(async(req,res)=>{try{
  let body='';for await(const chunk of req){body+=chunk;if(body.length>32768)throw Error('BODY_LIMIT');}
  assert.ok(verifyToolDispatch(body,String(req.headers['x-tenente-dispatch-signature']),key));
  const r=JSON.parse(body).authority;httpCalls++;
  const occurredAt=new Date().toISOString();const record={record_id:randomUUID(),enterprise_id:r.enterpriseId,destination_id:'controlled-repository-a',transaction_id:r.transactionId,operational_entity_id:r.operationalEntityId,action:r.action.type,target:r.action.target,idempotency_key:r.idempotencyKey,test_record:{type:'CONTROLLED_TEST_RECORD',transactionId:r.transactionId},result:'OBSERVED',occurred_at:occurredAt};
  const c=await connect();let result;try{result=(await c.query('select execute_controlled_native_destination_v3($1,$2,$3,$4) as result',[r.enterpriseId,actors.get(r.enterpriseId),r.requestId,{...record,record_digest:hashCanonical(record)}])).rows[0].result;}finally{await c.end();}
  if(!result.allowed){res.writeHead(403);res.end(JSON.stringify(result));return;}
  const observation=signDestinationObservation({observationId:randomUUID(),enterpriseId:r.enterpriseId,transactionId:r.transactionId,operationalEntityId:r.operationalEntityId,destinationId:'controlled-repository-a',action:r.action.type,target:r.action.target,actionDigest:r.actionDigest,idempotencyKey:r.idempotencyKey,observedAt:occurredAt,expiresAt:new Date(Date.now()+60000).toISOString(),result:'OBSERVED',destinationReference:'record:'+result.recordId,sourcePartyId:'independent-loopback-destination'},key);
  res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({status:'ACCEPTED',adapterReference:observation.destinationReference,acknowledgedAt:occurredAt,executionClaim:null,runtimeObservation:null,destinationObservation:observation,reasonCodes:[]}));
 }catch{res.writeHead(500);res.end('{}');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await observer?.end();await db?.end();if(admin){await admin.query(`drop database ${database} with (force)`);if(gatewayRolesCreated)await admin.query('drop role execution20_gateway_login; drop role execution20_gateway_owner');await admin.end();}mkdirSync('artifacts/security-repair',{recursive:true});writeFileSync('artifacts/security-repair/native-current-destination.json',JSON.stringify({hosted:false,actualPostgres:true,actualSignedHttp:true,independentObserver:true,httpCalls,cases:evidence},null,2));});
async function fixture(){
 const tenant=randomUUID(),tx=randomUUID(),actor=randomUUID(),authority=randomUUID(),delegation=randomUUID(),evaluation=randomUUID(),entity='agent:synthetic';actors.set(tenant,actor);
 const payload={synthetic:true},action={type:'WRITE_TEST_RECORD',target:'repository:a',environment:'test',consequence:'HIGH',payloadDigest:hashCanonical(payload)};
 const input={enterpriseId:tenant,transactionId:tx,operationalEntityId:entity,authorityId:authority,delegationId:delegation,action,decision:'ALLOW',decisionDigest:'a'.repeat(64)};
 const approval={approvalId:randomUUID(),enterpriseId:tenant,transactionId:tx,operationalEntityId:entity,approvedBy:actor,actionDigest:deriveEnforcementActionDigest(input),approvedAt:new Date(Date.now()-100).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),nonTransferable:true};
 await db.query('insert into canonical_trust_transactions(enterprise_id,transaction_id,operational_entity_id,action_type,action_resource,action_environment,request_digest,policy_id,policy_version,decision,decision_time_snapshot) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[tenant,tx,entity,action.type,action.target,action.environment,action.payloadDigest,'policy:a','v1','ALLOW',{consequence:'HIGH'}]);
 await db.query('insert into native_enforcement_decision_bindings values($1,$2,$3,$4,$5)',[tenant,tx,entity,evaluation,input.decisionDigest]);
 await db.query('insert into operational_entity_delegated_action_evaluations(enterprise_id,evaluation_id,delegation_id,decision_digest,decision,decision_snapshot) values($1,$2,$3,$4,$5,$6)',[tenant,evaluation,delegation,input.decisionDigest,'ALLOW',{beta:{continuityFingerprint:'runtime:a'},action:{dataBoundary:'CONFIDENTIAL',executionCount:1}}]);
 await db.query("insert into operational_entity_authority_delegations(enterprise_id,delegation_id,parent_authority_id,delegate_operational_entity_id,policy_version,status,expires_at) values($1,$2,$3,$4,'v1','ACTIVE',clock_timestamp()+interval '1 hour')",[tenant,delegation,authority,entity]);
 await db.query("insert into trust_contracts(enterprise_id,contract_id,revocation_state,expires_at) values($1,$2,'active',clock_timestamp()+interval '1 hour')",[tenant,authority]);
 await db.query("insert into operational_entity_native_verifications(enterprise_id,operational_entity_id,status,expires_at,runtime_binding,continuity_fingerprint,verified_at) values($1,$2,'VERIFIED',clock_timestamp()+interval '1 hour','RUNTIME_MATCH','runtime:a',clock_timestamp())",[tenant,entity]);
 const v=(await db.query('select * from operational_entity_native_verifications where enterprise_id=$1',[tenant])).rows[0];
 await db.query("insert into operational_entity_native_credentials values($1,$2,$3,'ACTIVE',null,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour')",[tenant,entity,v.credential_id]);
 await db.query("insert into native_entity_identity_evidence values($1,$2,$3,null,clock_timestamp()+interval '1 hour')",[tenant,entity,v.verification_id]);
 await db.query("insert into operational_entities values($1,$2,'active')",[tenant,entity]);
 await db.query("insert into operational_entity_owner_bindings(enterprise_id,operational_entity_id,state,effective_from) values($1,$2,'CONFIRMED',clock_timestamp()-interval '1 hour')",[tenant,entity]);
 await db.query("insert into trust_policy_versions values($1,'policy:a','v1','policy-hash',true,clock_timestamp()-interval '1 hour',null)",[tenant]);
 await db.query('select issue_native_enforcement_approval_v2($1,$2,$3)',[tenant,actor,{...approval,approvalDigest:'d'.repeat(64)}]);
 return {tenant,tx,actor,payload,input:{...input,approval}};
}
function deps(f,beforeHttp=async()=>{}){return{
 findByIdempotencyKey:async()=>null,
 loadCurrentState:async()=>({...f.input,authorityActive:true,delegationActive:true,identityVerified:true,ownerConfirmed:true,runtimeContinuity:'MATCH'}),
 reserveRequest:async r=>{await db.query('insert into native_enforcement_requests values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)',[r.requestId,f.tenant,f.tx,(await db.query('select evaluation_id from native_enforcement_decision_bindings where enterprise_id=$1',[f.tenant])).rows[0].evaluation_id,r.operationalEntityId,r.authorityId,r.delegationId,r.action.type,r.action.target,r.action.environment,r.action.consequence,r.actionDigest,r.decisionDigest,r.idempotencyKey,'REQUESTED',f.actor]);return{created:true};},
 claimDispatch:async r=>(await db.query('select claim_native_enforcement_dispatch_v3($1,$2,$3) as result',[f.tenant,f.actor,r.requestId])).rows[0].result,
 adapter:{execute:async r=>{await beforeHttp(r);return createHttpToolAdapter({endpoint:url,tool:'test-tool',payload:f.payload,evidenceKey:key,transport:'http',allowLocal:true}).execute(r);}},
};}
const effects=async f=>Number((await observer.query('select count(*) from controlled_destination_records where enterprise_id=$1',[f.tenant])).rows[0].count);
test('one signed HTTP ALLOW has one independently observed persistent destination effect',async()=>{const f=await fixture();const result=await executeAuthorizedAction({...f.input,idempotencyKey:'allow:1'},deps(f));assert.equal(result.result.status,'ACCEPTED');assert.equal(await effects(f),1);const retry=await executeAuthorizedAction({...f.input,idempotencyKey:'allow:2'},deps(f));assert.equal(retry.requested,false);assert.equal(await effects(f),1);evidence.push({case:'allow and retry',effects:1,pass:true});});
for(const [label,sql] of [
 ['credential revocation',"update operational_entity_native_credentials set state='REVOKED',revoked_at=clock_timestamp() where enterprise_id=$1"],
 ['evidence revocation',"update native_entity_identity_evidence set revoked_at=clock_timestamp() where enterprise_id=$1"],
 ['entity suspension',"update operational_entities set lifecycle_state='suspended' where enterprise_id=$1"],
 ['policy change',"update trust_policy_versions set active=false where enterprise_id=$1"],
 ['leaf execution limit tightening',"update operational_entity_authority_delegations set execution_limit=0 where enterprise_id=$1"],
 ['leaf data boundary tightening',"update operational_entity_authority_delegations set data_boundary='PUBLIC' where enterprise_id=$1"],
 ['policy content hash revision',"with changed as (update trust_policy_versions set policy_hash='new-hash' where enterprise_id=$1 returning policy_hash) update canonical_trust_transactions set policy_hash='new-hash' where enterprise_id=$1"],
 ['authority revocation',"update trust_contracts set revocation_state='revoked' where enterprise_id=$1"],
 ['owner change',"insert into operational_entity_owner_bindings(enterprise_id,operational_entity_id,state,effective_from) values($1,'agent:synthetic','REVOKED',clock_timestamp())"],
 ['owner binding expiry',"update operational_entity_owner_bindings set effective_to=clock_timestamp()-interval '1 second' where enterprise_id=$1"],
 ['future owner binding',"update operational_entity_owner_bindings set effective_from=clock_timestamp()+interval '1 hour' where enterprise_id=$1"],
 ['approval expiry',"update native_enforcement_human_approvals set expires_at=clock_timestamp()-interval '1 second' where enterprise_id=$1"],
])test(`change after claim and final JS check: ${label} produces zero HTTP destination effects`,async()=>{const f=await fixture();await executeAuthorizedAction({...f.input,idempotencyKey:'race:1'},deps(f,()=>observer.query(sql,[f.tenant])));assert.equal(await effects(f),0);evidence.push({case:label+' after claim / JS check',effects:0,pass:true});});
for(const [label,mutation] of [['parent revocation',"status='REVOKED'"],['parent depth tightening',"maximum_delegation_depth=0"],['parent data boundary tightening',"data_boundary='PUBLIC'"]])test(`${label} after claim is denied at the actual destination`,async()=>{const f=await fixture(),parent=randomUUID();await db.query("insert into operational_entity_authority_delegations select enterprise_id,$2,parent_authority_id,'coordinator',policy_version,status,revoked_at,expires_at,null,'owner',not_before,true,0,permitted_actions,permitted_tools,permitted_targets,environments,financial_limit,execution_limit,maximum_delegation_depth,data_boundary from operational_entity_authority_delegations where enterprise_id=$1",[f.tenant,parent]);await db.query("update operational_entity_authority_delegations set parent_delegation_id=$2,delegator_operational_entity_id='coordinator',delegation_depth=1 where enterprise_id=$1 and delegation_id=$3",[f.tenant,parent,f.input.delegationId]);await executeAuthorizedAction({...f.input,idempotencyKey:'parent:race'},deps(f,()=>observer.query(`update operational_entity_authority_delegations set ${mutation} where enterprise_id=$1 and delegation_id=$2`,[f.tenant,parent])));assert.equal(await effects(f),0);evidence.push({case:label+' after claim',effects:0,pass:true});});
test('DENY and REVIEW never reach the HTTP destination',async()=>{const f=await fixture(),before=httpCalls;for(const decision of ['DENY','REVIEW'])assert.equal((await executeAuthorizedAction({...f.input,decision,idempotencyKey:'deny:'+decision},deps(f))).requested,false);assert.equal(httpCalls,before);assert.equal(await effects(f),0);evidence.push({case:'deny/review',effects:0,pass:true});});
test('revocation holds tenant mutation lock; destination waits and observes the committed revoke',async()=>{const f=await fixture(),holder=await connect();let pending;try{await holder.query('begin');await holder.query("update operational_entity_native_credentials set state='REVOKED' where enterprise_id=$1",[f.tenant]);pending=executeAuthorizedAction({...f.input,idempotencyKey:'locked:revoke'},deps(f));await new Promise(r=>setTimeout(r,30));await holder.query('commit');await pending;assert.equal(await effects(f),0);evidence.push({case:'concurrent committed revoke',effects:0,pass:true});}finally{await holder.query('rollback');await holder.end();}});

test('restricted gateway driver detects an unexpected callable function and direct dispatcher grant',async()=>{
 assert.equal(Number((await admin.query("select count(*) from pg_roles where rolname in ('execution20_gateway_login','execution20_gateway_owner')")).rows[0].count),0);
 await db.query(readFileSync('security/qualification/restricted-gateway.sql','utf8'));gatewayRolesCreated=true;
 await db.query("insert into qualification20.runs values('execution20_gateway_login','synthetic:tenant','synthetic:subject','synthetic:run','synthetic:destination')");
 const restricted=new pg.Client({...config,database,user:'execution20_gateway_login'});await restricted.connect();
 try{
  assert.equal((await restricted.query(RESTRICTED_POSTGRES_PRIVILEGE_CHECK)).rows[0].restricted,true);
  await db.query("create function qualification20.unexpected_callable() returns int language sql security definer as 'select 1'");
  assert.equal((await restricted.query(RESTRICTED_POSTGRES_PRIVILEGE_CHECK)).rows[0].restricted,false);
  await db.query('drop function qualification20.unexpected_callable()');
  await db.query('grant execute on function qualification20.execute_fixed(text,text,text,text,jsonb,text) to execution20_gateway_login');
  assert.equal((await restricted.query(RESTRICTED_POSTGRES_PRIVILEGE_CHECK)).rows[0].restricted,false);
  await db.query('revoke execute on function qualification20.execute_fixed(text,text,text,text,jsonb,text) from execution20_gateway_login');
  assert.equal((await restricted.query(RESTRICTED_POSTGRES_PRIVILEGE_CHECK)).rows[0].restricted,true);
 }finally{await restricted.end();}
 const driver=new RestrictedPostgresConnectionAdapter('postgresql://execution20_gateway_login:synthetic@db.agpyhygpfmppjkxwcpac.supabase.co/postgres',()=>new pg.Client({...config,database,user:'execution20_gateway_login'}));
 assert.equal((await driver.execute({requestId:'synthetic:driver:request',operation:'qualification.schema.read',tenantId:'synthetic:tenant',subjectId:'synthetic:subject',runId:'synthetic:run',destination:'synthetic:destination',payload:{},issuedAt:new Date().toISOString()})).synthetic,true);
 evidence.push({case:'actual restricted driver and privilege drift',pass:true});
});
test('service role cannot TRUNCATE or directly INSERT controlled destination effects',async()=>{
 for(const privilege of ['TRUNCATE','INSERT','UPDATE','DELETE'])assert.equal((await db.query("select has_table_privilege('service_role','controlled_destination_records',$1) as allowed",[privilege])).rows[0].allowed,false,privilege);
 evidence.push({case:'service direct write/truncate denied',pass:true});
});
test('a prior FAILED destination row cannot become signed observed success',async()=>{
 const f=await fixture();
 await observer.query("insert into controlled_destination_records values($1,$2,'controlled-repository-a',$3,'agent:synthetic','WRITE_TEST_RECORD','repository:a','prior:failed',null,'FAILED',clock_timestamp(),repeat('a',64))",[randomUUID(),f.tenant,f.tx]);
 const result=await executeAuthorizedAction({...f.input,idempotencyKey:'prior:failed'},deps(f));
 assert.equal(result.result.status,'UNKNOWN');
 assert.equal((await observer.query('select result from controlled_destination_records where enterprise_id=$1',[f.tenant])).rows[0].result,'FAILED');
 evidence.push({case:'prior FAILED remains FAILED',pass:true});
});
