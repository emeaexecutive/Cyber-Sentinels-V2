import assert from 'node:assert/strict';
import test,{before,after} from 'node:test';
import {randomUUID,randomBytes,createHmac,generateKeyPairSync,sign,verify,timingSafeEqual} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import pg from 'pg';
import {executeAuthorizedAction,deriveEnforcementActionDigest} from '../lib/operational-entities/native-enforcement.ts';
import {evaluateAuthorizationGateway} from '../lib/core/authorization-gateway.ts';
import {hashCanonical} from '../src/lib/trust-core/hash.ts';
import {canonicalize} from '../src/lib/trust-core/canonicalize.ts';
import {verifiedSignalReview,torchSourceSha} from './fixtures/watchtower-signal-dependency.mjs';

// Never accepts DATABASE_URL, a hosted hostname, or an existing application database.
assert.ok(!process.env.APPROVAL_TEST_HOST||process.env.APPROVAL_TEST_HOST==='127.0.0.1');
const port=Number(process.env.APPROVAL_TEST_PORT??55441);
assert.ok(port===55441||(port===5432&&process.env.CI==='true'));
const config={host:'127.0.0.1',port,user:'postgres',password:process.env.APPROVAL_TEST_PASSWORD,database:'postgres',connectionTimeoutMillis:3000};
const database='watchtower_river_'+randomUUID().replaceAll('-',''),secret=randomBytes(32);
const evidence=[],evidenceKey=generateKeyPairSync('ed25519');let admin,db,auditor,provider,url;
const gatewayMac=(path,body)=>createHmac('sha256',secret).update(`POST\n${path}\n${body}`).digest('hex');
const authentic=(header,path,body)=>typeof header==='string'&&/^[a-f0-9]{64}$/.test(header)&&timingSafeEqual(Buffer.from(header,'hex'),Buffer.from(gatewayMac(path,body),'hex'));
async function connection(){const c=new pg.Client({...config,database});await c.connect();await c.query("set request.jwt.claim.role='service_role'");return c;}
before(async()=>{
  admin=new pg.Client(config);await admin.connect();
  if(port===55441)assert.equal(resolve((await admin.query('show data_directory')).rows[0].data_directory).toLowerCase(),resolve('../../tmp/tenente-supplier-local/pgdata').toLowerCase());
  await admin.query(`create database ${database}`);db=await connection();auditor=await connection();
  await db.query(readFileSync('tests/fixtures/native-dispatch-database.sql','utf8'));
  await db.query(readFileSync('supabase/migrations/20261108100241_atomic_native_dispatch.sql','utf8'));
  await db.query(`create table synthetic_export_routes(tenant uuid, target text, blocked boolean default false, blocked_until timestamptz, workload_state text default 'running',primary key(tenant,target));
    create table synthetic_destination_effects(request_id uuid primary key,tenant uuid,target text,action text,action_digest text,observed_at timestamptz default clock_timestamp());
    create table synthetic_export_attempts(attempt_id uuid primary key,tenant uuid,target text,permitted boolean,observed_at timestamptz default clock_timestamp());`);
  provider=createServer(async(req,res)=>{
    try{
      let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)throw Error('oversized');}
      if(req.method==='POST'&&req.url==='/synthetic-export-attempt'){
        const operation=JSON.parse(body);const target=(await db.query('select 1 from synthetic_export_routes where tenant=$1 and target=$2',[operation.tenant,operation.target])).rowCount;
        if(target)await db.query('insert into synthetic_export_attempts values($1,$2,$3,false,clock_timestamp())',[randomUUID(),operation.tenant,operation.target]);
        res.writeHead(403);res.end('{}');return;
      }
      if(req.method==='POST'&&req.url==='/synthetic-export'&&authentic(req.headers['x-gateway-proof'],req.url,body)){
        const operation=JSON.parse(body),route=(await auditor.query("select workload_state,blocked and blocked_until>clock_timestamp() as blocked from synthetic_export_routes where tenant=$1 and target=$2",[operation.tenant,operation.target])).rows[0];
        if(!route||route.blocked||route.workload_state!=='running'){res.writeHead(423);res.end('{}');return;}
        res.writeHead(200);res.end(JSON.stringify({records:['synthetic-customer-1','synthetic-customer-2']}));return;
      }
      if(req.method!=='POST'||req.url!=='/controlled-export'||!authentic(req.headers['x-gateway-proof'],req.url,body)){res.writeHead(403);res.end();return;}
      const operation=JSON.parse(body),c=await connection();
      try{
        await c.query('begin');
        const claim=(await c.query('select * from native_enforcement_dispatch_claims where enterprise_id=$1 and request_id=$2',[operation.tenant,operation.requestId])).rows[0];
        if(!claim||claim.scope.destination!==operation.target||claim.scope.action!==operation.action){await c.query('rollback');res.writeHead(403);res.end();return;}
        const inserted=await c.query('insert into synthetic_destination_effects(request_id,tenant,target,action,action_digest) values($1,$2,$3,$4,$5) on conflict do nothing returning request_id',[operation.requestId,operation.tenant,operation.target,operation.action,operation.actionDigest]);
        if(inserted.rowCount)await c.query("update synthetic_export_routes set blocked=true,blocked_until=case when $3='TEMPORARY_EXPORT_BLOCK' then clock_timestamp()+interval '300 seconds' else null end,workload_state=case when $3='TERMINATE_SYNTHETIC_WORKLOAD' then 'terminated' else workload_state end where tenant=$1 and target=$2",[operation.tenant,operation.target,operation.action]);
        await c.query('commit');res.writeHead(200);res.end(JSON.stringify({recorded:Boolean(inserted.rowCount)}));
      }catch(error){await c.query('rollback');throw error;}finally{await c.end();}
    }catch{res.writeHead(400);res.end();}
  });
  await new Promise(r=>provider.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${provider.address().port}/controlled-export`;
});
after(async()=>{
  if(provider){provider.closeAllConnections();await new Promise(r=>provider.close(r));}
  if(auditor)await auditor.end();if(db)await db.end();if(admin){await admin.query(`drop database ${database} with(force)`);await admin.end();}
  const manifest={environment:'LOCAL SYNTHETIC ONLY',hosted:false,scope:'Actual existing policy function, application dispatcher and PR132 SQL; minimal predecessor schema; synthetic identity/approval fixtures',
    gateway:'loopback authenticated controlled-export',torchSourceSha,limitations:['No hosted Auth, full schema, real AI review or Production provider qualification','H composes actual pinned signal/review modules and the P0 gateway locally; hosted integration is BLOCKED'],tests:evidence};
  const signature=sign(null,Buffer.from(canonicalize(manifest)),evidenceKey.privateKey).toString('base64url');
  assert.ok(verify(null,Buffer.from(canonicalize(manifest)),evidenceKey.publicKey,Buffer.from(signature,'base64url')));
  assert.equal(verify(null,Buffer.from(canonicalize({...manifest,hosted:true})),evidenceKey.publicKey,Buffer.from(signature,'base64url')),false);
  mkdirSync('artifacts/watchtowers',{recursive:true});writeFileSync('artifacts/watchtowers/river-local.json',JSON.stringify({manifest,signature,publicKey:evidenceKey.publicKey.export({type:'spki',format:'pem'}),trustAnchor:'Ephemeral local test key; not a Production identity assertion'},null,2)+'\n');
});
async function fixture({destructive=false,high=false}={}){
  const tenant=randomUUID(),tx=randomUUID(),actor=randomUUID(),authority=randomUUID(),delegation=randomUUID(),evaluation=randomUUID(),entity='CHIRIVETA';
  const action={type:destructive?'TERMINATE_SYNTHETIC_WORKLOAD':'TEMPORARY_EXPORT_BLOCK',target:'synthetic:customer-export',environment:'test',consequence:destructive?'CRITICAL':high?'HIGH':'LOW',payloadDigest:hashCanonical({route:'synthetic:customer-export',durationSeconds:300,records:['synthetic-1','synthetic-2']})};
  const input={enterpriseId:tenant,transactionId:tx,operationalEntityId:entity,authorityId:authority,delegationId:delegation,action,decision:'ALLOW',decisionDigest:'a'.repeat(64)};
  await db.query('insert into canonical_trust_transactions values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[tenant,tx,entity,action.type,action.target,action.environment,action.payloadDigest,'export-policy','v1','ALLOW',{consequence:action.consequence}]);
  await db.query('insert into native_enforcement_decision_bindings values($1,$2,$3,$4,$5)',[tenant,tx,entity,evaluation,input.decisionDigest]);
  await db.query('insert into operational_entity_delegated_action_evaluations values($1,$2,$3,$4,$5,$6)',[tenant,evaluation,delegation,input.decisionDigest,'ALLOW',{beta:{continuityFingerprint:'chiriveta-runtime'}}]);
  await db.query("insert into operational_entity_authority_delegations values($1,$2,$3,$4,'v1','ACTIVE',null,clock_timestamp()+interval '1 hour')",[tenant,delegation,authority,entity]);
  await db.query("insert into trust_contracts values($1,$2,'active',clock_timestamp()+interval '1 hour')",[tenant,authority]);
  await db.query("insert into operational_entity_native_verifications values($1,$2,'VERIFIED',clock_timestamp()+interval '1 hour','RUNTIME_MATCH','chiriveta-runtime',clock_timestamp())",[tenant,entity]);
  await db.query("insert into operational_entity_owner_bindings values($1,$2,'CONFIRMED',clock_timestamp())",[tenant,entity]);
  await db.query('insert into synthetic_export_routes(tenant,target) values($1,$2)',[tenant,action.target]);
  return{tenant,tx,actor,evaluation,input};
}
async function approve(f){
  const approval={approvalId:randomUUID(),enterpriseId:f.tenant,transactionId:f.tx,operationalEntityId:'CHIRIVETA',approvedBy:f.actor,approvedAt:new Date(Date.now()-10).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),nonTransferable:true,actionDigest:deriveEnforcementActionDigest(f.input)};
  await db.query('select issue_native_enforcement_approval_v2($1,$2,$3)',[f.tenant,f.actor,{...approval,approvalDigest:hashCanonical(approval)}]);f.input.approval=approval;
}
function policy(f,{pending=false,outside=false}={}){const result=evaluateAuthorizationGateway({subjectId:'CHIRIVETA',subjectType:'ai_agent',authenticated:true,requestedAction:f.input.action.type,requestedPurpose:'protect_synthetic_export',allowedActions:outside?[]:[f.input.action.type],allowedPurposes:['protect_synthetic_export'],humanApprovalPresent:Boolean(f.input.approval),governanceStatus:pending?'approval_required':'active',runtimeLocation:'external_gateway'});return result.decision==='ALLOW'?'ALLOW':result.decision==='DENY'?'DENY':'REVIEW';}
function dependencies(c,f,{timeout=false,revoke=false}={}){return{
  findByIdempotencyKey:async()=>null,
  loadCurrentState:async()=>({enterpriseId:f.tenant,operationalEntityId:'CHIRIVETA',authorityId:f.input.authorityId,delegationId:f.input.delegationId,authorityActive:true,delegationActive:true,identityVerified:true,ownerConfirmed:true,runtimeContinuity:'MATCH'}),
  reserveRequest:async r=>{await c.query('insert into native_enforcement_requests values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)',[r.requestId,f.tenant,f.tx,f.evaluation,r.operationalEntityId,r.authorityId,r.delegationId,r.action.type,r.action.target,r.action.environment,r.action.consequence,r.actionDigest,r.decisionDigest,r.idempotencyKey,'REQUESTED',f.actor]);if(revoke)await c.query("update trust_contracts set revocation_state='revoked' where enterprise_id=$1",[f.tenant]);return{created:true};},
  claimDispatch:async r=>(await c.query('select claim_native_enforcement_dispatch_v2($1,$2,$3) as result',[f.tenant,f.actor,r.requestId])).rows[0].result,
  adapter:{execute:async r=>{const body=JSON.stringify({tenant:f.tenant,requestId:r.requestId,target:r.action.target,action:r.action.type,actionDigest:r.actionDigest});const response=await fetch(url,{method:'POST',headers:{'x-gateway-proof':gatewayMac('/controlled-export',body)},body});assert.equal(response.status,200);if(timeout)throw Error('Synthetic acknowledgement lost after destination commit');return{status:'ACCEPTED',adapterReference:'controlled-export',acknowledgedAt:new Date().toISOString(),executionClaim:null,runtimeObservation:null,destinationObservation:null,reasonCodes:[]};}},
};}
async function dispatch(f,key,options={},c=db){return executeAuthorizedAction({...f.input,decision:policy(f,options),idempotencyKey:key},dependencies(c,f,options));}
async function observed(f){return{effects:Number((await auditor.query('select count(*) from synthetic_destination_effects where tenant=$1',[f.tenant])).rows[0].count),route:(await auditor.query('select * from synthetic_export_routes where tenant=$1',[f.tenant])).rows[0],claims:Number((await auditor.query('select count(*) from native_enforcement_dispatch_claims where enterprise_id=$1',[f.tenant])).rows[0].count)};}
function record(id,f,decision,observation,extra={}){const steps=['DETECTION_FIXTURE','RELAY_FIXTURE','CHIRIVETA_ADVISORY','EXISTING_POLICY_GATEWAY',...(f.input.approval?['EXACT_ACTION_HUMAN_APPROVAL']:[]),'DISPATCH_BOUNDARY','INDEPENDENT_DESTINATION_QUERY'];const body={scenario:id,tenant:f.tenant,actor:f.actor,agent:'CHIRIVETA',transaction:f.tx,authority:f.input.authorityId,delegation:f.input.delegationId,policy:'export-policy:v1',approval:f.input.approval?.approvalId??null,actionDigest:deriveEnforcementActionDigest(f.input),decision,effects:observation.effects,claims:observation.claims,steps,...extra};evidence.push({...body,evidenceDigest:hashCanonical(body)});}

test('A authorised temporary containment changes the synthetic destination once; retry cannot repeat',async()=>{const f=await fixture();const first=await dispatch(f,'A1');assert.equal(first.requested,true);assert.equal((await dispatch(f,'A2')).requested,false);const o=await observed(f);assert.equal(o.effects,1);assert.equal(o.route.blocked,true);assert.ok(o.route.blocked_until>Date.now());const expiry=(await auditor.query('select blocked_until,blocked and blocked_until>$2::timestamptz as effective from synthetic_export_routes where tenant=$1',[f.tenant,new Date(o.route.blocked_until.getTime()+1).toISOString()])).rows[0];assert.equal(expiry.effective,false);record('A',f,'ALLOW',o,{temporarySeconds:300,expiryEvaluation:'Independent query at simulated time after expiry; no wall-clock wait'});});
test('B REVIEW has zero effects; independent human fixture approval permits one exact action',async()=>{const f=await fixture({high:true});assert.equal(policy(f,{pending:true}),'REVIEW');assert.equal((await dispatch(f,'B1',{pending:true})).requested,false);assert.equal((await observed(f)).effects,0);await approve(f);assert.equal((await dispatch(f,'B2',{pending:true})).requested,true);const o=await observed(f);assert.equal(o.effects,1);record('B',f,'REVIEW → ALLOW',o,{pendingEffects:0});});
test('C outside delegated action returns DENY and the destination remains unchanged',async()=>{const f=await fixture();assert.equal(policy(f,{outside:true}),'DENY');assert.equal((await dispatch(f,'C',{outside:true})).requested,false);const o=await observed(f);assert.equal(o.effects,0);assert.equal(o.route.blocked,false);record('C',f,'DENY',o);});
test('D revocation after approval and reservation is rechecked by SQL before dispatch',async()=>{const f=await fixture({high:true});await approve(f);assert.equal((await dispatch(f,'D',{revoke:true})).requested,false);const o=await observed(f);assert.equal(o.effects,0);assert.equal(o.route.blocked,false);record('D',f,'DENY',o,{reason:'AUTHORITY_REVOKED_BEFORE_DISPATCH'});});
test('E destructive recommendation alone cannot execute; changed target cannot reuse exact approval',async()=>{const f=await fixture({destructive:true});assert.equal((await dispatch(f,'E-pending',{pending:true})).requested,false);assert.equal((await observed(f)).effects,0);await approve(f);await db.query("update canonical_trust_transactions set action_resource='synthetic:other-workload' where enterprise_id=$1",[f.tenant]);assert.equal((await dispatch(f,'E-target')).requested,false);assert.equal((await observed(f)).effects,0);await db.query('update canonical_trust_transactions set action_resource=$2 where enterprise_id=$1',[f.tenant,f.input.action.target]);assert.equal((await dispatch(f,'E-approved')).requested,true);const o=await observed(f);assert.equal(o.effects,1);assert.equal(o.route.workload_state,'terminated');record('E',f,'REVIEW → ALLOW',o,{pendingEffects:0,wrongTargetEffects:0,syntheticOnly:true});});
test('F twelve distinct request keys consume one approval and create exactly one destination row',async()=>{const f=await fixture({high:true});await approve(f);const clients=await Promise.all(Array.from({length:12},()=>connection()));try{await Promise.all(clients.map((c,i)=>dispatch(f,'F:'+i,{},c)));const o=await observed(f);assert.equal(o.effects,1);assert.equal(o.claims,1);record('F',f,'ALLOW',o,{attempts:12});}finally{await Promise.all(clients.map(c=>c.end()));}});
test('G acknowledgement timeout stays UNKNOWN with no redispatch; independent DB evidence reconciles',async()=>{const f=await fixture({high:true});await approve(f);const first=await dispatch(f,'G1',{timeout:true});assert.equal(first.result.status,'UNKNOWN');assert.equal((await dispatch(f,'G2')).requested,false);const o=await observed(f);assert.equal(o.effects,1);record('G',f,'UNKNOWN',o,{reconciled:'DESTINATION_EFFECT_OBSERVED',blindRedispatch:false});});
test('provider rejects direct unauthenticated execution; tenant and policy changes cannot consume approval',async()=>{const f=await fixture({high:true});await approve(f);assert.equal((await fetch(url,{method:'POST',body:'{}'})).status,403);const foreign={...f,tenant:randomUUID()};assert.equal((await dispatch(foreign,'foreign')).requested,false);await db.query("update canonical_trust_transactions set policy_version='v2' where enterprise_id=$1",[f.tenant]);assert.equal((await dispatch(f,'policy-change')).requested,false);const o=await observed(f);assert.equal(o.effects,0);record('ADVERSARIAL',f,'DENY',o);});
test('H end-to-end signed detection, relay and advisory review cannot invent execution authority',async t=>{
  for(const outside of [false,true]){
    const f=await fixture(),body=JSON.stringify({tenant:f.tenant,target:f.input.action.target}),base=url.replace('/controlled-export','');
    const probe=()=>fetch(base+'/synthetic-export',{method:'POST',body,headers:{'x-gateway-proof':gatewayMac('/synthetic-export',body)}});
    const before=await probe();assert.equal(before.status,200);assert.equal((await before.json()).records.length,2);
    assert.equal((await fetch(base+'/synthetic-export-attempt',{method:'POST',body})).status,403);
    const detection=(await auditor.query('select * from synthetic_export_attempts where tenant=$1',[f.tenant])).rows[0];assert.equal(detection.permitted,false);f.detectionReference='synthetic-export-attempt:'+detection.attempt_id;
    const signalTrace=await verifiedSignalReview(f,t),currentDecision=policy(f,{outside});
    f.input.decisionDigest=hashCanonical({tenant:f.tenant,transaction:f.tx,actor:f.actor,agent:'CHIRIVETA',action:f.input.action,policy:'export-policy:v1',decision:currentDecision,warningEvidenceDigest:signalTrace.warningEvidenceDigest,reviewEvidenceDigest:signalTrace.reviewEvidenceDigest});
    await db.query('update canonical_trust_transactions set decision=$2 where enterprise_id=$1',[f.tenant,currentDecision]);
    await db.query('update native_enforcement_decision_bindings set decision_digest=$2 where enterprise_id=$1',[f.tenant,f.input.decisionDigest]);
    await db.query('update operational_entity_delegated_action_evaluations set decision_digest=$2,decision=$3 where enterprise_id=$1',[f.tenant,f.input.decisionDigest,currentDecision]);
    const result=await dispatch(f,'H:'+outside,{outside});assert.equal(result.requested,!outside);
    assert.equal((await probe()).status,outside?200:423);
    assert.equal((await dispatch(f,'H:retry:'+outside,{outside})).requested,false);
    const o=await observed(f);assert.equal(o.effects,outside?0:1);assert.equal(o.claims,outside?0:1);
    if(!outside)assert.equal((await auditor.query("select scope->>'decisionDigest' as digest from native_enforcement_dispatch_claims where enterprise_id=$1",[f.tenant])).rows[0].digest,f.input.decisionDigest);
    record(outside?'H-DENY':'H-ALLOW',f,outside?'DENY':'ALLOW',o,{signalTrace,boundDecisionDigest:f.input.decisionDigest,exportBefore:200,exportAfter:outside?200:423,authentication:'Synthetic enrolled human/agent fixtures; no hosted Auth claim'});
  }
});
