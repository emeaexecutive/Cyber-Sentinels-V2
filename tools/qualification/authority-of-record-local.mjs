// Local native PostgreSQL + real HTTP/MCP qualification. Never loads .env files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {randomUUID,randomBytes,generateKeyPairSync} from 'node:crypto';
import pg from 'pg';
import {authorityFixture} from '../../tests/fixtures/authority-of-record.mjs';
import {evaluateDelegatedAction} from '../../lib/operational-entities/delegated-authority.ts';
import {executeAuthorizedAction,signDestinationObservation,correlateExecutionEvidence,deriveEnforcementActionDigest} from '../../lib/operational-entities/native-enforcement.ts';
import {createHttpToolAdapter,verifyToolDispatch} from '../../lib/operational-entities/http-tool-adapter.ts';
import {signAuthorityReceipt,verifyAuthorityReceipt} from '../../lib/trust-receipts/authority-signature.ts';
import {hashCanonical} from '../../src/lib/trust-core/hash.ts';

const database=process.env.AOR_LOCAL_DATABASE??'aor_qualification_v2';
if(!/^aor_qualification(?:_[a-z0-9]+)?$/.test(database))throw new Error('Only the disposable AOR database is permitted.');
const config={host:'127.0.0.1',port:55439,user:'supabase_admin',database};
const db=new pg.Client(config);await db.connect();
const fixture=authorityFixture(), tenant=fixture.parentAuthority.enterpriseId, actor=randomUUID(), otherActor=randomUUID(), otherTenant=randomUUID();
const issued=fixture.parentAuthority.issuedAt, expires=fixture.parentAuthority.expiresAt;
const evidenceKey=randomBytes(32).toString('hex'), keys=generateKeyPairSync('ed25519');
const report={classification:'WORKING_LOCAL',database,engine:null,checks:[],executions:[],limitations:['Synthetic identity/runtime fixtures; no live identity provider attestation.','Native evaluator, database RPC and HTTP/MCP adapter qualification; not hosted Next.js/browser qualification.','No shared Staging or Production calls.']};
const check=(name,detail={})=>report.checks.push({name,result:'PASS',...detail});
async function seed(table,row){
 if(!/^[a-z_]+$/.test(table))throw new Error('Invalid fixture table');
 const columns=(await db.query("select column_name,data_type from information_schema.columns where table_schema='public' and table_name=$1 and is_nullable='NO' and column_default is null",[table])).rows;
 const values={...row};
 for(const {column_name:name,data_type:type} of columns)if(values[name]===undefined)values[name]=type==='uuid'?randomUUID():type==='jsonb'?{}:type==='ARRAY'?[]:type==='boolean'?false:type.includes('timestamp')?issued:type==='integer'||type==='bigint'?0:'fixture';
 const names=Object.keys(values);await db.query(`insert into public.${table}(${names.map(n=>'"'+n+'"').join(',')}) values(${names.map((_,i)=>'$'+(i+1)).join(',')})`,names.map(n=>values[n]));
}
let target;
try {
 report.engine=(await db.query('select version() as version')).rows[0].version;
 // This is the downstream tool's disposable business ledger, not a trust store.
 await db.query('create schema if not exists qualification; create table if not exists qualification.tool_effects(tenant_id uuid not null,idempotency_key text not null,transaction_id uuid not null,actual_payload jsonb not null,primary key(tenant_id,idempotency_key))');
 await db.query("select set_config('request.jwt.claim.role','service_role',false),set_config('request.jwt.claim.sub',$1,false)",[actor]);
 await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[actor,`aor-${actor}@example.invalid`,otherActor,`aor-${otherActor}@example.invalid`]);
 await db.query("update account_access_approvals set status='APPROVED',approved_at=now(),approved_by=$1 where user_id=$1",[actor]);
 await seed('trust_workspaces',{id:tenant,name:'Local AOR qualification',created_by:actor});
 await seed('trust_workspaces',{id:otherTenant,name:'Other isolated tenant',created_by:otherActor});
 await seed('trust_policy_versions',{enterprise_id:tenant,policy_id:'local-policy',version:'1',layer:'ENTERPRISE_OVERRIDE',domain_key:'AI_AGENT',active:true,valid_from:issued,valid_until:expires,rules:{policy:'local'},policy_hash:hashCanonical({policy:'local'}),created_by:actor});
 for(const id of ['agent:issuer','agent:worker'])await seed('operational_entities',{enterprise_id:tenant,entity_id:id,entity_type:'ai_agent',display_reference:id,canonical_trust_object_id:id,lifecycle_state:'active',accountable_owner_id:'owner:1',organization_reference:`tenant:${tenant}`,identity_profile_reference:`identity:${id}`,current_trust_state:'verified',current_evidence_state:'complete',current_consequence_classification:'LOW',canonical_digest:hashCanonical({id,tenant})});
 const p=fixture.parentAuthority,d=fixture.delegation;
 await seed('trust_contracts',{contract_id:p.authorityId,enterprise_id:tenant,subject_type:'ai_agent',subject_id:'agent:issuer',workflow_id:'refund',authorized_objective:'refund',contract:{...p,policyVersion:'1'},policy_version:'1',revocation_state:'active',issued_at:issued,expires_at:expires,record_hash:hashCanonical(p),actor_id:actor});
 const reviewAuthorityId=randomUUID();
 await seed('trust_contracts',{contract_id:reviewAuthorityId,enterprise_id:tenant,subject_type:'ai_agent',subject_id:'agent:worker',workflow_id:'refund',authorized_objective:'refund',contract:{...p,authorityId:reviewAuthorityId,policyVersion:'1'},policy_version:'1',revocation_state:'active',issued_at:issued,expires_at:expires,record_hash:hashCanonical({p,reviewAuthorityId}),actor_id:actor});
 await seed('operational_entity_authority_delegations',{delegation_id:d.delegationId,enterprise_id:tenant,delegator_operational_entity_id:d.delegatorOperationalEntityId,delegate_operational_entity_id:d.delegateOperationalEntityId,parent_authority_id:p.authorityId,objective:'refund',permitted_actions:d.scope.permittedActions,permitted_tools:d.scope.permittedTools,permitted_targets:d.scope.permittedTargets,environments:d.scope.environments,data_boundary:'INTERNAL',financial_limit:100,execution_limit:1,can_redelegate:false,maximum_delegation_depth:3,delegation_depth:1,issued_at:issued,not_before:issued,expires_at:expires,policy_version:'1',authority_version:'child:1',nonce:randomUUID(),signing_key_id:'fixture:key',delegation_digest:d.delegationDigest,signature:'controlled-fixture',status:'ACTIVE',policy_decision:'ACTIVATE',proposed_by:actor});
 const credentialId=randomUUID(),manifestId=randomUUID(),challengeId=randomUUID();
 await seed('operational_entity_native_credentials',{credential_id:credentialId,enterprise_id:tenant,operational_entity_id:'agent:worker',signing_key_id:'fixture:key',algorithm:'Ed25519',public_jwk:keys.publicKey.export({format:'jwk'}),credential_fingerprint:'b'.repeat(64),state:'ACTIVE',valid_from:issued,expires_at:expires,authorized_by:actor,authorization_reference:'fixture:admin'});
 await seed('operational_entity_manifests',{manifest_id:manifestId,enterprise_id:tenant,operational_entity_id:'agent:worker',manifest_version:'1.0',manifest:{fixture:true},manifest_digest:'c'.repeat(64),signature:'controlled-fixture',signing_key_id:'fixture:key',status:'ACTIVE',issued_at:issued,expires_at:expires,registered_by:actor});
 await seed('operational_entity_native_challenges',{challenge_id:challengeId,enterprise_id:tenant,operational_entity_id:'agent:worker',nonce_hash:hashCanonical(randomUUID()),audience:'local:qualification',issuer:'cyber-sentinels',subject:'agent:worker',manifest_digest:'c'.repeat(64),signing_key_id:'fixture:key',issued_at:issued,expires_at:expires,status:'VERIFIED',issued_by:actor});
 await seed('operational_entity_native_verifications',{verification_id:randomUUID(),enterprise_id:tenant,operational_entity_id:'agent:worker',challenge_id:challengeId,manifest_id:manifestId,credential_id:credentialId,status:'VERIFIED',manifest_digest:'c'.repeat(64),credential_fingerprint:'b'.repeat(64),continuity_result:'CONTINUITY_ESTABLISHED',continuity_fingerprint:'d'.repeat(64),continuity_snapshot:{fixture:true},runtime_binding:'RUNTIME_MATCH',software_provenance:'VERIFIED_DIGEST',reason_codes:['CONTROLLED_LOCAL_FIXTURE'],algorithm_version:'native-entity-verification-v1',verified_at:issued,expires_at:expires,verified_by:actor});
 await seed('operational_entity_owner_bindings',{enterprise_id:tenant,operational_entity_id:'agent:worker',accountable_owner_id:'owner:2',organization_id:`tenant:${tenant}`,state:'CONFIRMED',effective_from:issued});
 const observations=new Map(), counts=new Map();let injectMismatch=false;
 target=http.createServer(async(req,res)=>{
  try{
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>131072)throw new Error('body too large');}
   if(!verifyToolDispatch(raw,String(req.headers['x-tenente-dispatch-signature']??''),evidenceKey))throw new Error('Unverified or expired dispatch');
   const message=JSON.parse(raw),mcp=message.method==='tools/call',data=mcp?{arguments:message.params.arguments,authority:message.params._meta.authority}:message;
   const request=data.authority;
   if(hashCanonical(data.arguments)!==request.action.payloadDigest)throw new Error('Destination exact payload mismatch');
   const reserved=(await db.query("select action_digest,payload_digest from native_enforcement_requests where enterprise_id=$1 and request_id=$2 and transaction_id=$3 and request_state='REQUESTED'",[request.enterpriseId,request.requestId,request.transactionId])).rows[0];
   if(!reserved||reserved.action_digest!==request.actionDigest||reserved.payload_digest!==hashCanonical(data.arguments))throw new Error('Destination authorization was not reserved');
   // The controlled destination enforces current authority as well as request idempotency.
   const state=(await db.query('select status,revoked_at from operational_entity_authority_delegations where enterprise_id=$1 and delegation_id=$2',[request.enterpriseId,request.delegationId])).rows[0];
   if(state?.status!=='ACTIVE'||state.revoked_at)throw new Error('Destination authority inactive');
   const key=`${request.enterpriseId}:${request.idempotencyKey}`;
   let result=observations.get(key);
   if(!result){
    counts.set(key,(counts.get(key)??0)+1);
    const now=new Date().toISOString();
    const actualPayload=injectMismatch?{...data.arguments,financialAmount:1000}:data.arguments;
    const effect=await db.query('insert into qualification.tool_effects(tenant_id,idempotency_key,transaction_id,actual_payload) values($1,$2,$3,$4) on conflict do nothing returning transaction_id',[request.enterpriseId,request.idempotencyKey,request.transactionId,actualPayload]);
    if(!effect.rowCount)throw new Error('Destination duplicate already consumed');
    const actualDigest=deriveEnforcementActionDigest({...request,action:{...request.action,payloadDigest:hashCanonical(actualPayload)}});
    const observation=signDestinationObservation({observationId:randomUUID(),enterpriseId:request.enterpriseId,transactionId:request.transactionId,operationalEntityId:request.operationalEntityId,destinationId:'local-refund-service',action:request.action.type,target:request.action.target,actionDigest:actualDigest,idempotencyKey:request.idempotencyKey,observedAt:now,expiresAt:expires,result:'OBSERVED',destinationReference:`refund:${randomUUID()}`,sourcePartyId:'controlled-local-destination'},evidenceKey);
    result={status:'ACCEPTED',adapterReference:observation.destinationReference,acknowledgedAt:now,executionClaim:null,runtimeObservation:null,destinationObservation:observation,reasonCodes:['LOCAL_HTTP_EXECUTED']};observations.set(key,result);
    report.executions.push({transactionId:request.transactionId,authorizedAmount:data.arguments.financialAmount,actualAmount:actualPayload.financialAmount,transport:mcp?'mcp':'http'});
   }
   res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(mcp?{jsonrpc:'2.0',id:message.id,result:{structuredContent:result}}:result));
  }catch(error){res.writeHead(409,{'content-type':'application/json'});res.end(JSON.stringify({error:error.message}));}
 });
 await new Promise(resolve=>target.listen(0,'127.0.0.1',resolve));
 const endpoint=`http://127.0.0.1:${target.address().port}/tool`;
 const forgedResponse=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tool:'refund',arguments:{financialAmount:1000},authority:{admin:true,decision:'ALLOW'}})});
 assert.equal(forgedResponse.status,409);assert.equal(counts.size,0);check('Forged direct destination dispatch cannot execute',{executionCount:0});
 const storedRequests=new Map();
 async function evaluateAndPersist(decisionOverride,policyId='local-policy'){
  const current=(await db.query('select status,revoked_at from operational_entity_authority_delegations where enterprise_id=$1 and delegation_id=$2',[tenant,d.delegationId])).rows[0];
  const state={...fixture,delegation:{...d,status:current.status,revokedAt:current.revoked_at?.toISOString()??null}};
  if(decisionOverride==='REVIEW')state.delegateIdentity={...state.delegateIdentity,runtimeBinding:'RUNTIME_UNVERIFIED'};
  state.now=new Date().toISOString();
  const decision=evaluateDelegatedAction(state);
  const transactionId=randomUUID(),evaluationId=randomUUID(),payload={...fixture.action,parameters:{customer:'customer:1'}},digest=hashCanonical(payload),now=new Date().toISOString();
  await seed('operational_entity_delegated_action_evaluations',{evaluation_id:evaluationId,enterprise_id:tenant,delegation_id:d.delegationId,delegate_operational_entity_id:'agent:worker',action_type:'refund',action_target:'customer:1',action_tool:'refund',environment:'test',decision:decision.decision,reason_codes:decision.reasonCodes,authority_lineage:JSON.stringify(decision.authorityLineage),decision_snapshot:decision.decisionSnapshot,decision_digest:hashCanonical({evaluationId,decision:decision.decision,action:payload}),evaluated_at:now,actor_id:actor});
  await seed('canonical_trust_transactions',{transaction_id:transactionId,enterprise_id:tenant,actor_id:actor,actor_type:'human',subject_type:'ai_agent',subject_id:'agent:worker',operational_entity_id:'agent:worker',workflow_id:'refund',action_type:'refund',action_purpose:'refund',action_resource:'customer:1',action_environment:'test',request_digest:digest,idempotency_key:randomUUID(),requested_at:now,decision:decision.decision,trust_state:decision.decision==='ALLOW'?'verified':'degraded',authority_reference:decision.decision==='REVIEW'?reviewAuthorityId:p.authorityId,policy_id:policyId,policy_version:'1',policy_hash:hashCanonical({policy:'local'}),evidence_digest:hashCanonical({fixture:true}),evidence_complete:true,evidence_fresh:true,material_change:true,decision_time_snapshot:decision.decisionSnapshot});
  const decisionDigest=hashCanonical({transactionId,decision:decision.decision,reasonCodes:decision.reasonCodes});
  if(decision.decision==='ALLOW')await seed('native_enforcement_decision_bindings',{binding_id:randomUUID(),enterprise_id:tenant,evaluation_id:evaluationId,transaction_id:transactionId,operational_entity_id:'agent:worker',decision_digest:decisionDigest,bound_by:actor,bound_at:now,binding_digest:hashCanonical({transactionId,evaluationId})});
  return {payload,evaluationId,decision,input:{enterpriseId:tenant,transactionId,operationalEntityId:'agent:worker',authorityId:p.authorityId,delegationId:d.delegationId,action:{type:'REFUND',target:'customer:1',environment:'test',payloadDigest:digest,consequence:'LOW'},decision:decision.decision,decisionDigest,idempotencyKey:randomUUID()}};
 }
 async function dispatch(record,transport='http'){
  return executeAuthorizedAction(record.input,{
   findByIdempotencyKey:async(enterprise,key)=>storedRequests.get(`${enterprise}:${key}`)??null,
   loadCurrentState:async request=>{const row=(await db.query('select status from operational_entity_authority_delegations where enterprise_id=$1 and delegation_id=$2',[tenant,d.delegationId])).rows[0];return {...request,authorityActive:true,delegationActive:row.status==='ACTIVE',identityVerified:true,ownerConfirmed:true,runtimeContinuity:'MATCH'};},
   reserveRequest:async request=>{
    const payload={requestId:request.requestId,evaluationId:record.evaluationId,transactionId:request.transactionId,operationalEntityId:request.operationalEntityId,authorityId:p.authorityId,delegationId:d.delegationId,actionType:request.action.type,actionTarget:request.action.target,environment:request.action.environment,payloadDigest:request.action.payloadDigest,consequence:'LOW',actionDigest:request.actionDigest,decisionDigest:request.decisionDigest,idempotencyKey:request.idempotencyKey,requestedAt:request.requestedAt};
    const result=(await db.query('select reserve_native_enforcement_request_v1($1,$2,$3) as result',[tenant,actor,payload])).rows[0].result;
    if(result.requestState!=='REQUESTED')return {created:false,blocked:true,reasonCodes:result.reasonCodes};
    if(result.status==='DUPLICATE')return {created:false,...storedRequests.get(`${tenant}:${request.idempotencyKey}`)};
    storedRequests.set(`${tenant}:${request.idempotencyKey}`,{request,result:null});return {created:true};
   },adapter:createHttpToolAdapter({endpoint,tool:'refund',payload:record.payload,evidenceKey,transport,allowLocal:true}),
  });
 }
 const allow=await evaluateAndPersist();assert.equal(allow.decision.decision,'ALLOW');const execution=await dispatch(allow);assert.equal(execution.requested,true);assert.equal(execution.result.status,'ACCEPTED');
 storedRequests.set(`${tenant}:${allow.input.idempotencyKey}`,{request:execution.request,result:execution.result});
 await dispatch(allow);assert.equal(counts.get(`${tenant}:${allow.input.idempotencyKey}`),1);check('ALLOW executes exactly once; idempotent retry does not execute',{executionCount:1});
 const request=execution.request;
 const reservationPayload={requestId:randomUUID(),evaluationId:allow.evaluationId,transactionId:request.transactionId,operationalEntityId:request.operationalEntityId,authorityId:p.authorityId,delegationId:d.delegationId,actionType:request.action.type,actionTarget:request.action.target,environment:request.action.environment,payloadDigest:request.action.payloadDigest,consequence:'LOW',actionDigest:request.actionDigest,decisionDigest:request.decisionDigest,idempotencyKey:randomUUID(),requestedAt:request.requestedAt};
 await assert.rejects(db.query('select reserve_native_enforcement_request_v1($1,$2,$3)',[tenant,actor,{...reservationPayload,payloadDigest:'f'.repeat(64)}]));check('Database rejects executable payload different from the canonical decision');
 const competitors=await Promise.all([1,2].map(async()=>{const connection=new pg.Client(config);await connection.connect();try{await connection.query("select set_config('request.jwt.claim.role','service_role',false)");return (await connection.query('select reserve_native_enforcement_request_v1($1,$2,$3) as result',[tenant,actor,{...reservationPayload,requestId:randomUUID()}])).rows[0].result;}finally{await connection.end();}}));
 assert.deepEqual(competitors.map(r=>r.status).sort(),['CREATED','DUPLICATE']);assert.equal(competitors[0].requestId,competitors[1].requestId);check('Concurrent database claims reserve only one execution request');
 await assert.rejects(db.query('select reserve_native_enforcement_request_v1($1,$2,$3)',[tenant,actor,{...reservationPayload,actionDigest:'e'.repeat(64)}]));check('Changed reuse of durable reservation is rejected');
 const policyExpiry=Date.now()+1500;
 await seed('trust_policy_versions',{enterprise_id:tenant,policy_id:'short-policy',version:'1',layer:'ENTERPRISE_OVERRIDE',domain_key:'AI_AGENT',active:true,valid_from:issued,valid_until:new Date(policyExpiry).toISOString(),rules:{policy:'local'},policy_hash:hashCanonical({policy:'local'}),created_by:actor});
 const shortPolicy=await evaluateAndPersist(undefined,'short-policy');assert.ok(Date.now()<policyExpiry);
 await new Promise(resolve=>setTimeout(resolve,Math.max(0,policyExpiry-Date.now()+30)));
 const policyBlocked=await dispatch(shortPolicy);
 assert.equal(policyBlocked.requested,false);assert.ok(policyBlocked.eligibility.reasonCodes.includes('TENENTE_POLICY_CHANGED'));check('Policy expiry blocks dispatch of an earlier ALLOW without rewriting policy history',{executionCount:0});
 assert.equal((await db.query('select payload_digest from native_enforcement_requests where request_id=$1',[execution.request.requestId])).rows[0].payload_digest,allow.input.action.payloadDigest);check('Exact payload digest survives database persistence');
 const correlation=correlateExecutionEvidence({decision:'ALLOW',request:execution.request,destinationObservations:[execution.result.destinationObservation],observationEvidenceKey:evidenceKey});
 const observation=execution.result.destinationObservation;
 await seed('native_destination_observations',{observation_id:observation.observationId,enterprise_id:tenant,transaction_id:allow.input.transactionId,request_id:execution.request.requestId,operational_entity_id:'agent:worker',destination_id:observation.destinationId,action:observation.action,target:observation.target,action_digest:observation.actionDigest,idempotency_key:observation.idempotencyKey,observed_at:observation.observedAt,expires_at:observation.expiresAt,result:observation.result,destination_reference:observation.destinationReference,evidence_digest:observation.evidenceDigest,evidence_mac:observation.evidenceMac,source_party_id:observation.sourcePartyId,ingested_by:actor});
 await seed('native_enforcement_outcomes',{outcome_id:randomUUID(),enterprise_id:tenant,transaction_id:allow.input.transactionId,request_id:execution.request.requestId,operational_entity_id:'agent:worker',correlation_state:correlation.state,outcome:correlation.outcome,control_status:correlation.controlStatus,evidence_independence:correlation.evidenceIndependence,algorithm_versions:correlation.algorithmVersions,correlation_digest:correlation.correlationDigest,correlated_at:new Date().toISOString(),created_by:actor});
 check('Actual signed destination observation and correlated outcome persist',{outcome:correlation.outcome});
 const historical=(await db.query('select decision_time_snapshot from canonical_trust_transactions where transaction_id=$1',[allow.input.transactionId])).rows[0].decision_time_snapshot;
 const signature=signAuthorityReceipt(historical,{tenantId:tenant,receiptId:allow.input.transactionId,keyId:'local-platform-v1',privateKey:keys.privateKey});
 assert.equal(verifyAuthorityReceipt(historical,signature,{tenantId:tenant,receiptId:allow.input.transactionId,trustedKeys:new Map([['local-platform-v1',keys.publicKey]])}),true);check('Persisted historical receipt verifies with Ed25519');
 const review=await evaluateAndPersist('REVIEW');const countBefore=[...counts.values()].reduce((a,b)=>a+b,0);assert.equal((await dispatch(review)).requested,false);assert.equal([...counts.values()].reduce((a,b)=>a+b,0),countBefore);check('Unresolved REVIEW has zero downstream calls',{executionCount:0});
 const reviewer=randomUUID(),reviewId=randomUUID();
 await db.query('insert into auth.users(id,email) values($1,$2)',[reviewer,`aor-${reviewer}@example.invalid`]);
 await db.query("update account_access_approvals set status='APPROVED',approved_at=now(),approved_by=$1 where user_id=$2",[actor,reviewer]);
 await seed('workspace_members',{workspace_id:tenant,user_id:reviewer,role:'reviewer'});
 await seed('trust_manual_reviews',{id:reviewId,tenant_id:tenant,entity_id:'agent:worker',status:'REQUESTED',requested_by:actor,requested_client_id:actor,reason:'Review exact refund scope',created_at:new Date().toISOString(),expires_at:expires,original_transaction_id:review.input.transactionId});
 const resolveReview=user=>db.query('select resolve_canonical_manual_review_v1($1,$2,$3,$4,$5,$6,$7,$8) as result',[tenant,user,actor,reviewId,'APPROVED','Bounded refund approved','evidence:local-review',randomUUID()]);
 await assert.rejects(resolveReview(otherActor));check('Unauthorized reviewer cannot approve the original request');
 assert.equal((await resolveReview(reviewer)).rows[0].result.status,'APPROVED');
 assert.equal((await db.query('select decision from canonical_trust_transactions where transaction_id=$1',[review.input.transactionId])).rows[0].decision,'REVIEW');
 assert.equal((await dispatch(review)).requested,false);check('Authorized review preserves original REVIEW and requires fresh evaluation');
 const mcp=await evaluateAndPersist();assert.equal((await dispatch(mcp,'mcp')).result.status,'ACCEPTED');check('MCP tools/call crosses the same controlled HTTP boundary');
 injectMismatch=true;const mismatch=await evaluateAndPersist();const mismatchExecution=await dispatch(mismatch);const mismatchResult=correlateExecutionEvidence({decision:'ALLOW',request:mismatchExecution.request,destinationObservations:[mismatchExecution.result.destinationObservation],observationEvidenceKey:evidenceKey});assert.equal(mismatchResult.state,'CONTRADICTED');assert.notEqual(mismatchResult.outcome,'CONFIRMED');check('100 authorized versus 1000 actual is a contradiction, not trusted success',{outcome:mismatchResult.outcome});injectMismatch=false;
 await db.query("update operational_entity_native_credentials set state='REVOKED',revoked_at=now() where enterprise_id=$1 and credential_id=$2",[tenant,credentialId]);
 const identityBlocked=await dispatch({...allow,input:{...allow.input,idempotencyKey:randomUUID()}});assert.equal(identityBlocked.requested,false);assert.ok(identityBlocked.eligibility.reasonCodes.includes('TENENTE_IDENTITY_OR_OWNER_INACTIVE'));check('Revoked credential blocks dispatch of an earlier ALLOW',{executionCount:0});
 const suspended=(await db.query('select restrict_tenente_delegation_v1($1,$2,$3,$4,$5,$6) as result',[tenant,actor,'agent:worker',d.delegationId,'SUSPEND','Local guardian suspension'])).rows[0].result;
 assert.equal(suspended.status,'SUSPENDED');const suspendedDecision=await evaluateAndPersist();assert.equal(suspendedDecision.decision.decision,'DENY');assert.equal((await dispatch(suspendedDecision)).requested,false);check('Audited TENENTE suspension blocks new execution',{executionCount:0});
 await assert.rejects(db.query('update operational_entity_authority_delegations set financial_limit=1000 where enterprise_id=$1 and delegation_id=$2',[tenant,d.delegationId]));check('Signed authority scope cannot be edited in place');
 const restriction=(await db.query('select restrict_tenente_delegation_v1($1,$2,$3,$4,$5,$6) as result',[tenant,actor,'agent:worker',d.delegationId,'REVOKE','Local golden-flow revocation'])).rows[0].result;
 assert.equal(restriction.status,'REVOKED');
 const deny=await evaluateAndPersist();assert.equal(deny.decision.decision,'DENY');const beforeDeny=[...counts.values()].reduce((a,b)=>a+b,0);assert.equal((await dispatch(deny)).requested,false);assert.equal([...counts.values()].reduce((a,b)=>a+b,0),beforeDeny);check('Revoked authority returns DENY with zero downstream calls',{executionCount:0});
 assert.deepEqual((await db.query('select decision_time_snapshot from canonical_trust_transactions where transaction_id=$1',[allow.input.transactionId])).rows[0].decision_time_snapshot,historical);check('Historical ALLOW remains unchanged after revocation');
 assert.equal((await db.query("select count(*)::int n from trust_memory_index where enterprise_id=$1 and memory_type='TENENTE_AUTHORITY_RESTRICTED'",[tenant])).rows[0].n,2);
 assert.equal((await db.query("select count(*)::int n from operational_entity_native_replay_events where enterprise_id=$1 and event_type='TENENTE_AUTHORITY_RESTRICTED'",[tenant])).rows[0].n,2);check('Atomic authority restriction appends Trust Memory and Replay');
 await assert.rejects(db.query('select restrict_tenente_delegation_v1($1,$2,$3,$4,$5,$6)',[tenant,otherActor,'agent:worker',d.delegationId,'SUSPEND','Forged administrator']));check('PENDING and unauthorized administrator cannot restrict authority');
 await assert.rejects(db.query('select restrict_tenente_delegation_v1($1,$2,$3,$4,$5,$6)',[otherTenant,actor,'agent:worker',d.delegationId,'SUSPEND','Wrong tenant']));check('Cross-tenant authority mutation denied');
 await db.query('set role authenticated');
 await db.query("select set_config('request.jwt.claim.role','authenticated',false),set_config('request.jwt.claim.sub',$1,false)",[otherActor]);
 assert.equal((await db.query('select count(*)::int n from native_enforcement_requests where enterprise_id=$1',[tenant])).rows[0].n,0);check('PENDING authenticated token cannot read protected execution records');
 await assert.rejects(db.query('select restrict_tenente_delegation_v1($1,$2,$3,$4,$5,$6)',[tenant,actor,'agent:worker',d.delegationId,'SUSPEND','Forged actor']));check('Direct authenticated RPC denied even with forged administrator argument');
 await db.query('reset role');
 await db.query("select set_config('request.jwt.claim.role','service_role',false)");
 await db.query("update account_access_approvals set status='APPROVED',approved_at=now(),approved_by=$1 where user_id=$2",[actor,otherActor]);
 await db.query('set role authenticated');
 await db.query("select set_config('request.jwt.claim.role','authenticated',false)");
 assert.equal((await db.query('select count(*)::int n from native_enforcement_requests where enterprise_id=$1',[tenant])).rows[0].n,0);check('APPROVED account in another tenant still reads zero execution records');
 await db.query('reset role');
 report.result='PASS';report.tenantId=tenant;report.transactionIds=[allow,review,mcp,mismatch,deny].map(r=>r.input.transactionId);
} catch(error){report.result='FAIL';report.failure={message:error.message,code:error.code,detail:error.detail};process.exitCode=1;}
finally {if(target)await new Promise(resolve=>target.close(resolve));await db.end();fs.mkdirSync('docs/authority-of-record',{recursive:true});fs.writeFileSync('docs/authority-of-record/LOCAL_QUALIFICATION.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
