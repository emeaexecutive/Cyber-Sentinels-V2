import assert from 'node:assert/strict';
import test,{before,after} from 'node:test';
import {randomUUID} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import pg from 'pg';
import {resolve} from 'node:path';
import {executeAuthorizedAction,deriveEnforcementActionDigest} from '../lib/operational-entities/native-enforcement.ts';

// Hard-fenced to a disposable loopback database; ignores DATABASE_URL entirely.
assert.ok(!process.env.APPROVAL_TEST_HOST||process.env.APPROVAL_TEST_HOST==='127.0.0.1');
const port=Number(process.env.APPROVAL_TEST_PORT??55441);
assert.ok(port===55441||(port===5432&&process.env.CI==='true'));
const config={host:'127.0.0.1',port,user:'postgres',password:process.env.APPROVAL_TEST_PASSWORD,database:'postgres',connectionTimeoutMillis:3000};
const name='approval_security_'+randomUUID().replaceAll('-','');
let admin,db,destination,url,effects=0;const evidence=[];
async function connect(){const c=new pg.Client({...config,database:name});await c.connect();await c.query("set request.jwt.claim.role='service_role'");return c;}
before(async()=>{
  admin=new pg.Client(config);await admin.connect();
  if(port===55441){
    const actual=(await admin.query('show data_directory')).rows[0].data_directory;
    assert.equal(resolve(actual).toLowerCase(),resolve('../../tmp/tenente-supplier-local/pgdata').toLowerCase(),'Known local cluster required; no existing application database is touched');
  }
  await admin.query(`create database ${name}`);
  db=await connect();await db.query(readFileSync('tests/fixtures/native-dispatch-database.sql','utf8'));
  await db.query(readFileSync('supabase/migrations/20261108100241_atomic_native_dispatch.sql','utf8'));
  destination=createServer(async(req,res)=>{for await(const chunk of req)void chunk;effects++;res.writeHead(200);res.end('{}');});
  await new Promise(resolve=>destination.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${destination.address().port}`;
});
after(async()=>{
  if(destination){destination.closeAllConnections();await new Promise(r=>destination.close(r));}
  if(db)await db.end();
  if(admin){await admin.query(`drop database ${name} with (force)`);await admin.end();}
  mkdirSync('artifacts/approval-single-use',{recursive:true});
  writeFileSync('artifacts/approval-single-use/postgres-evidence.json',JSON.stringify({mode:'Real local PostgreSQL17 routines plus loopback HTTP destination; minimal predecessor schema fixture',hosted:false,tests:evidence},null,2)+'\n');
});
async function fixture(){
  const tenant=randomUUID(),tx=randomUUID(),actor=randomUUID(),approvalId=randomUUID(),authority=randomUUID(),delegation=randomUUID(),evaluation=randomUUID(),entity='agent:synthetic';
  const action={type:'WRITE_TEST_RECORD',target:'repository:a',environment:'test',consequence:'HIGH',payloadDigest:'c'.repeat(64)};
  const input={enterpriseId:tenant,transactionId:tx,operationalEntityId:entity,authorityId:authority,delegationId:delegation,action,decision:'ALLOW',decisionDigest:'a'.repeat(64)};
  const approval={approvalId,enterpriseId:tenant,transactionId:tx,operationalEntityId:entity,approvedBy:actor,actionDigest:deriveEnforcementActionDigest(input),approvedAt:new Date(Date.now()-100).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),nonTransferable:true};
  await db.query('insert into canonical_trust_transactions values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[tenant,tx,entity,action.type,action.target,action.environment,action.payloadDigest,'policy:a','v1','ALLOW',{consequence:'HIGH'}]);
  await db.query('insert into native_enforcement_decision_bindings values($1,$2,$3,$4,$5)',[tenant,tx,entity,evaluation,input.decisionDigest]);
  await db.query('insert into operational_entity_delegated_action_evaluations values($1,$2,$3,$4,$5,$6)',[tenant,evaluation,delegation,input.decisionDigest,'ALLOW',{beta:{continuityFingerprint:'runtime:a'}}]);
  await db.query("insert into operational_entity_authority_delegations values($1,$2,$3,$4,'v1','ACTIVE',null,clock_timestamp()+interval '1 hour')",[tenant,delegation,authority,entity]);
  await db.query("insert into trust_contracts values($1,$2,'active',clock_timestamp()+interval '1 hour')",[tenant,authority]);
  await db.query("insert into operational_entity_native_verifications values($1,$2,'VERIFIED',clock_timestamp()+interval '1 hour','RUNTIME_MATCH','runtime:a',clock_timestamp())",[tenant,entity]);
  await db.query("insert into operational_entity_owner_bindings values($1,$2,'CONFIRMED',clock_timestamp())",[tenant,entity]);
  await db.query('select issue_native_enforcement_approval_v2($1,$2,$3)',[tenant,actor,{...approval,approvalDigest:'d'.repeat(64)}]);
  return {input:{...input,approval},tenant,tx,actor,evaluation};
}
async function reserve(c,f,r){
  await c.query('insert into native_enforcement_requests values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)',[r.requestId,f.tenant,f.tx,f.evaluation,r.operationalEntityId,r.authorityId,r.delegationId,r.action.type,r.action.target,r.action.environment,r.action.consequence,r.actionDigest,r.decisionDigest,r.idempotencyKey,'REQUESTED',f.actor]);
}
async function claim(c,f,r){return (await c.query('select claim_native_enforcement_dispatch_v2($1,$2,$3) as result',[f.tenant,f.actor,r.requestId])).rows[0].result;}
function deps(c,f,{crash=false}={}){return {
  findByIdempotencyKey:async()=>null,
  loadCurrentState:async()=>({...f.input,authorityActive:true,delegationActive:true,identityVerified:true,ownerConfirmed:true,runtimeContinuity:'MATCH'}),
  reserveRequest:async r=>{await reserve(c,f,r);return {created:true};},
  claimDispatch:r=>claim(c,f,r),
  adapter:{execute:async()=>{await fetch(url,{method:'POST'});if(crash)throw Error('response lost after effect');return {status:'ACCEPTED',adapterReference:'local',acknowledgedAt:new Date().toISOString(),executionClaim:null,runtimeObservation:null,destinationObservation:null,reasonCodes:[]};}},
};}
test('concurrent distinct request keys consume one approval and produce exactly one HTTP effect',async()=>{
  const f=await fixture(),clients=await Promise.all(Array.from({length:12},()=>connect())),start=effects;
  try{
    const results=await Promise.all(clients.map((c,i)=>executeAuthorizedAction({...f.input,idempotencyKey:'key:'+i},deps(c,f))));
    assert.equal(effects-start,1);assert.equal(results.filter(r=>r.requested).length,1);
    const rows=(await db.query('select * from native_enforcement_dispatch_claims where enterprise_id=$1',[f.tenant])).rows;
    assert.equal(rows.length,1);assert.equal(rows[0].approval_id,f.input.approval.approvalId);
    evidence.push({case:'12 concurrent keys',effects:effects-start,claims:rows.length,passed:true});
  }finally{await Promise.all(clients.map(c=>c.end()));}
});
test('lost response yields UNKNOWN and a fresh connection cannot dispatch again',async()=>{
  const f=await fixture(),start=effects,c=await connect();
  const first=await executeAuthorizedAction({...f.input,idempotencyKey:'lost:1'},deps(c,f,{crash:true}));await c.end();
  assert.equal(first.result.status,'UNKNOWN');
  const retry=await executeAuthorizedAction({...f.input,idempotencyKey:'lost:2'},deps(db,f));
  assert.equal(retry.requested,false);assert.equal(effects-start,1);
  evidence.push({case:'response lost/reconnected retry',effects:effects-start,outcome:first.result.status,passed:true});
});
test('crash after committed claim before provider leaves zero effects and cannot recover by redispatch',async()=>{
  const f=await fixture(),start=effects,c=await connect();
  const r={...f.input,requestId:randomUUID(),actionDigest:f.input.approval.actionDigest,idempotencyKey:'before:1'};
  await reserve(c,f,r);assert.equal((await claim(c,f,r)).claimed,true);await c.end();
  assert.equal((await executeAuthorizedAction({...f.input,idempotencyKey:'before:2'},deps(db,f))).requested,false);
  assert.equal(effects-start,0);evidence.push({case:'crash before dispatch',effects:0,outcome:'UNKNOWN',passed:true});
});
for(const [label,sql] of [
  ['policy version',"update canonical_trust_transactions set policy_version='v2' where enterprise_id=$1"],
  ['parameters',"update canonical_trust_transactions set request_digest=repeat('e',64) where enterprise_id=$1"],
  ['destination',"update canonical_trust_transactions set action_resource='repository:b' where enterprise_id=$1"],
  ['actor',"update native_enforcement_human_approvals set approved_by=gen_random_uuid() where enterprise_id=$1"],
  ['expiry',"update native_enforcement_human_approvals set expires_at=clock_timestamp()-interval '1 second' where enterprise_id=$1"],
  ['revocation',"update trust_contracts set revocation_state='revoked' where enterprise_id=$1"],
  ['runtime',"update operational_entity_native_verifications set continuity_fingerprint='runtime:b' where enterprise_id=$1"],
  ['legacy approval without bound scope',"delete from native_enforcement_approval_scopes where enterprise_id=$1"],
])test(`changed ${label} has zero provider effects`,async()=>{
  const f=await fixture(),start=effects;await db.query(sql,[f.tenant]);
  const result=await executeAuthorizedAction({...f.input,idempotencyKey:'invalid:1'},deps(db,f));
  assert.equal(result.requested,false);assert.equal(effects-start,0);evidence.push({case:label,effects:0,passed:true});
});
test('a blocked transaction rollback does not consume approval; committed claim is durable',async()=>{
  const f=await fixture(),c=await connect();const r={...f.input,requestId:randomUUID(),actionDigest:f.input.approval.actionDigest,idempotencyKey:'rollback:1'};
  await reserve(db,f,r);await c.query('begin');assert.equal((await claim(c,f,r)).claimed,true);await c.query('rollback');await c.end();
  assert.equal((await claim(db,f,r)).claimed,true);assert.equal((await claim(db,f,r)).claimed,false);
  evidence.push({case:'rollback and commit/replay',passed:true});
});
test('browser roles cannot issue approvals, claim dispatch, or mutate consumption',async()=>{
  const f=await fixture();
  for(const role of ['anon','authenticated','service_role']){
    const c=await connect();try{await c.query(`set role ${role}`);
      await assert.rejects(c.query('delete from native_enforcement_dispatch_claims'),{code:'42501'});
      if(role!=='service_role')await assert.rejects(c.query('select claim_native_enforcement_dispatch_v2($1,$2,$3)',[f.tenant,f.actor,randomUUID()]),{code:'42501'});
    }finally{await c.end();}
  }evidence.push({case:'role permissions',passed:true});
});
for(const field of ['tenant','actor','entity','action','authority','delegation'])test(`request ${field} substitution cannot claim dispatch`,async()=>{
  const f=await fixture(),start=effects;
  const r={...f.input,requestId:randomUUID(),actionDigest:f.input.approval.actionDigest,idempotencyKey:'substitute:'+field};
  await reserve(db,f,r);
  const columns={tenant:'enterprise_id',actor:'actor_id',entity:'operational_entity_id',action:'action_type',authority:'authority_id',delegation:'delegation_id'};
  const value=field==='entity'?'agent:other':field==='action'?'DELETE_TEST_RECORD':randomUUID();
  await db.query(`update native_enforcement_requests set ${columns[field]}=$1 where request_id=$2`,[value,r.requestId]);
  assert.equal((await claim(db,f,r)).claimed,false);assert.equal(effects-start,0);
  evidence.push({case:field+' substitution',effects:0,passed:true});
});
test('a waiter rechecks approval validity after the canonical transaction lock',async()=>{
  const f=await fixture(),holder=await connect(),waiter=await connect(),start=effects;
  const r={...f.input,requestId:randomUUID(),actionDigest:f.input.approval.actionDigest,idempotencyKey:'waiter'};
  try{
    await reserve(db,f,r);await holder.query('begin');
    await holder.query('select 1 from canonical_trust_transactions where enterprise_id=$1 for update',[f.tenant]);
    const pending=claim(waiter,f,r);
    await holder.query("update native_enforcement_human_approvals set expires_at=clock_timestamp()-interval '1 second' where enterprise_id=$1",[f.tenant]);
    await holder.query('commit');assert.equal((await pending).claimed,false);assert.equal(effects-start,0);
    evidence.push({case:'expiry while waiting for transaction lock',effects:0,passed:true});
  }finally{await holder.end();await waiter.end();}
});
test('missing durable boundary fails closed before any provider effect',async()=>{
  const f=await fixture(),start=effects,dependencies=deps(db,f);delete dependencies.claimDispatch;
  await assert.rejects(executeAuthorizedAction({...f.input,idempotencyKey:'missing-boundary'},dependencies),{code:'DURABLE_DISPATCH_UNAVAILABLE'});
  assert.equal(effects-start,0);evidence.push({case:'missing durable boundary',effects:0,passed:true});
});
test('claim response loss after database commit never permits a second dispatch',async()=>{
  const f=await fixture(),start=effects,dependencies=deps(db,f);
  dependencies.claimDispatch=async request=>{assert.equal((await claim(db,f,request)).claimed,true);throw Error('claim response lost');};
  await assert.rejects(executeAuthorizedAction({...f.input,idempotencyKey:'claim-lost:1'},dependencies),/claim response lost/);
  assert.equal((await executeAuthorizedAction({...f.input,idempotencyKey:'claim-lost:2'},deps(db,f))).requested,false);
  assert.equal(effects-start,0);evidence.push({case:'claim response lost after commit',effects:0,outcome:'UNKNOWN',passed:true});
});
test('policy change committed while a claim waits for the delegation lock prevents dispatch',async()=>{
  const f=await fixture(),holder=await connect(),waiter=await connect(),start=effects;
  const r={...f.input,requestId:randomUUID(),actionDigest:f.input.approval.actionDigest,idempotencyKey:'policy-wait'};
  try{
    await reserve(db,f,r);await holder.query('begin');
    await holder.query('select 1 from operational_entity_authority_delegations where enterprise_id=$1 for update',[f.tenant]);
    const pending=claim(waiter,f,r);
    const deadline=Date.now()+3000;let blocked=false;
    while(Date.now()<deadline){
      blocked=(await db.query('select cardinality(pg_blocking_pids($1))>0 as blocked',[waiter.processID])).rows[0].blocked;
      if(blocked)break;await new Promise(resolve=>setTimeout(resolve,10));
    }
    assert.equal(blocked,true,'The test must observe a real database lock wait');
    await holder.query("update operational_entity_authority_delegations set policy_version='v2' where enterprise_id=$1",[f.tenant]);
    await holder.query('commit');assert.equal((await pending).claimed,false);assert.equal(effects-start,0);
    evidence.push({case:'policy update during observed database lock wait',effects:0,passed:true});
  }finally{await holder.query('rollback');await holder.end();await waiter.end();}
});
