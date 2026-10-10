import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {spawnSync} from 'node:child_process';import {randomUUID,createHash} from 'node:crypto';import assert from 'node:assert/strict';
const [artifactDirectory,target,database]=process.argv.slice(2);
if(!artifactDirectory || !/^cs-recovery-[a-z0-9-]+$/.test(target??'') || !/^recovery_runtime[0-9]+$/.test(database??''))throw new Error('Usage: recovery-runtime.mjs <restricted-artifact-dir> <cs-recovery-container> <fresh-recovery_runtimeN>');
const dir=fs.realpathSync(artifactDirectory),frozen=path.join(dir,'frozen-runtime');
const repository=fs.realpathSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'../..'));
if(dir.toLowerCase()===repository.toLowerCase() || dir.toLowerCase().startsWith(repository.toLowerCase()+path.sep))throw new Error('Artifacts must be outside repository');
const inspect=spawnSync('docker',['inspect',target],{encoding:'utf8'});
assert.equal(inspect.status,0,'Isolated container inspection failed');
const identity=JSON.parse(inspect.stdout)[0];
assert.equal(identity.HostConfig.NetworkMode,'none');
assert.equal(Object.keys(identity.HostConfig.PortBindings??{}).length,0);
assert.equal(identity.Config.Image,'public.ecr.aws/supabase/postgres@sha256:06ddc7962e11ab0f4f0334fd05671e97c30ea202f6e6a7113800bd3d6e416108');
assert.equal(identity.Config.Labels['cybersentinels.workstream'],'isolated-production-restore');
assert.equal(identity.Mounts.filter(m=>m.Destination==='/recovery'&&!m.RW).length,1);
const mount=identity.Mounts.find(m=>m.Destination==='/recovery');
const normalize=p=>p.replaceAll('\\','/').replace(/^\/run\/desktop\/mnt\/host\/([a-z])\//i,'$1:/').toLowerCase().replace(/\/$/,'');
assert.equal(normalize(mount.Source),normalize(dir),'Artifact mount mismatch');
for(const relative of ['src/lib/trust-transaction/canonical.ts','tests/canonical-trust-transaction.test.mjs','lib/trust-transaction/server.ts']){
 const git=spawnSync('git',['show','3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571:'+relative],{cwd:repository,encoding:'utf8'});
 assert.equal(git.status,0);const digest=x=>createHash('sha256').update(x.replaceAll('\r\n','\n')).digest('hex');assert.equal(digest(fs.readFileSync(path.join(frozen,relative),'utf8')),digest(git.stdout),'Frozen fixture/code mismatch: '+relative);
}
if(fs.existsSync(path.join(dir,database+'-result.json')))throw new Error('Evidence already exists');
const version=spawnSync('docker',['exec',target,'psql','-X','-qAt','-U','supabase_admin','-d','postgres','-c',"SELECT current_setting('server_version')='17.11' AND current_setting('cron.launch_active_jobs')='off'"],{encoding:'utf8'});
assert.equal(version.status,0);assert.equal(version.stdout.trim(),'t');
const {executeCanonicalTrustTransaction}=await import(pathToFileURL(path.join(frozen,'src/lib/trust-transaction/canonical.ts')));
const code=fs.readFileSync(path.join(frozen,'tests/canonical-trust-transaction.test.mjs'),'utf8');
const fixtureCode=code.slice(code.indexOf('function trustObject()'),code.indexOf('function operationalEntity('));
const tenantId=randomUUID(),actorId=randomUUID(),subjectId=randomUUID(),workflowId=randomUUID(),otherTenant=randomUUID(),otherActor=randomUUID(),requestedAt='2026-08-06T10:00:00.000Z';
const {trustObject,authority,evidence,transactionInput}=new Function('tenantId','actorId','subjectId','workflowId','requestedAt',fixtureCode+'; return {trustObject,authority,evidence,transactionInput};')(tenantId,actorId,subjectId,workflowId,requestedAt);
const server=fs.readFileSync(path.join(frozen,'lib/trust-transaction/server.ts'),'utf8');
const payloadCode=server.slice(server.indexOf('function decisionPayload('),server.indexOf('function safeCanonicalEvidenceObject(')).replace('record: CanonicalDecisionRecord','record');
const decisionPayload=new Function(payloadCode+'; return decisionPayload;')();
const literal=s=>"'"+String(s).replaceAll("'","''")+"'";const json=o=>literal(JSON.stringify(o))+'::jsonb';
let seq=0;const report={release:'3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571',target,database,checks:[],receipts:[],externalRequests:0,limitations:['Synthetic identity/evidence fixtures; no external identity/provider calls','Invokes frozen evaluator and real restored PostgreSQL RPCs through a local SQL adapter, not hosted Next.js/PostgREST/GoTrue HTTP','Uses a disposable clone; pristine restored database unchanged'],isolatedRestoreValidated:false};
function query(q,{role='supabase_admin',actor=actorId}={}){assert.ok(['supabase_admin','service_role','authenticated','anon'].includes(role));const tag=database+'-'+String(++seq).padStart(3,'0');const file=path.join(dir,tag+'.sql');fs.writeFileSync(file,`BEGIN; SET LOCAL ROLE ${role}; SET LOCAL request.jwt.claims=${literal(JSON.stringify({sub:actor,role,app_metadata:{}}))}; SET LOCAL request.jwt.claim.role=${literal(role)}; SET LOCAL request.jwt.claim.sub=${literal(actor)}; ${q}; COMMIT;`);const r=spawnSync('docker',['exec',target,'psql','-X','-qAt','-U','supabase_admin','-d',database,'-v','ON_ERROR_STOP=1','-f','/recovery/'+tag+'.sql'],{encoding:'utf8',maxBuffer:8*1024*1024});fs.writeFileSync(path.join(dir,tag+'.stdout.private.log'),r.stdout??'');fs.writeFileSync(path.join(dir,tag+'.stderr.private.log'),r.stderr??'');if(r.status!==0)throw new Error(tag+' SQL failed: '+r.stderr);return r.stdout.trim();}
const one=(q,opts)=>JSON.parse(query(q,opts));
const rpc=(fn,args)=>one(`SELECT public.${fn}(${args.join(',')})`,{role:'service_role'});
const check=(name)=>report.checks.push({name,result:'PASS'});
try{
 const clone=spawnSync('docker',['exec',target,'createdb','-U','supabase_admin','--template=recovery_validation','--owner=postgres',database],{encoding:'utf8'});
 fs.writeFileSync(path.join(dir,database+'-clone.stderr.private.log'),clone.stderr??'');
 assert.equal(clone.status,0,'Fresh runtime clone creation failed');
 report.cloneCreated=true;
 query(`INSERT INTO auth.users(id,email) VALUES (${literal(actorId)},${literal('restore-'+actorId+'@example.invalid')}),(${literal(otherActor)},${literal('restore-'+otherActor+'@example.invalid')}); INSERT INTO public.trust_workspaces(id,name,created_by) VALUES (${literal(tenantId)},'Recovery runtime A',${literal(actorId)}),(${literal(otherTenant)},'Recovery runtime B',${literal(otherActor)})`);
 assert.equal(query(`SELECT auth.uid()=${literal(actorId)}::uuid AND auth.role()='authenticated'`,{role:'authenticated'}),'t');check('Auth schema triggers and JWT role/uid helpers');
 const contract=authority({contractId:randomUUID()});
 query(`INSERT INTO public.trust_contracts(contract_id,enterprise_id,subject_type,subject_id,workflow_id,authorized_objective,contract,policy_version,revocation_state,issued_at,expires_at,record_hash,correlation_id,actor_id) VALUES (${literal(contract.contractId)},${literal(tenantId)},'ai_agent',${literal(subjectId)},${literal(workflowId)},'settle_invoice',${json(contract)},'1.0.0','active',${literal(contract.issuedAt)},${literal(contract.expiresAt)},${literal('a'.repeat(64))},${literal(randomUUID())},${literal(actorId)})`);
 query(`INSERT INTO public.trust_policy_versions(enterprise_id,policy_id,version,layer,domain_key,active,valid_from,rules,policy_hash,created_by) VALUES (${literal(tenantId)},'policy-settlement','1.0.0','ENTERPRISE_OVERRIDE','AI_AGENT',true,'2026-08-01T00:00:00Z','{}',${literal('c'.repeat(64))},${literal(actorId)})`);
 assert.equal(query(`SELECT count(*) FROM public.trust_contracts WHERE enterprise_id=${literal(tenantId)}`,{role:'authenticated'}),'1');
 assert.equal(query(`SELECT count(*) FROM public.trust_contracts WHERE enterprise_id=${literal(tenantId)}`,{role:'authenticated',actor:otherActor}),'0');check('Authority read tenant A positive / tenant B denied');
 for(const expected of ['ALLOW','REVIEW','DENY']){
  const deps={
   async authenticateActor(){assert.equal(query(`SELECT count(*) FROM auth.users WHERE id=${literal(actorId)}`),'1');return {id:actorId,type:'human',authority:'local-synthetic-session'};},
   async resolveTenantFromSession(){const rows=one(`SELECT json_agg(t) FROM (SELECT id,name FROM public.trust_workspaces WHERE id=${literal(tenantId)}) t`,{role:'authenticated'});assert.equal(rows.length,1);return rows[0];},
   async findByIdempotency(){return null;},async loadTrustObject(){return trustObject();},
   async loadConfiguredEvidence(){return expected==='REVIEW'?[]:[evidence({outcome:expected==='DENY'?'FAILED':'PASSED'})];},
   async loadAuthority(){return one(`SELECT contract FROM public.trust_contracts WHERE contract_id=${literal(contract.contractId)}`,{role:'authenticated'});},
   async loadPolicy(){return one(`SELECT json_build_object('id',policy_id,'version',version,'active',active,'validFrom',valid_from,'validUntil',valid_until,'policyHash',policy_hash) FROM public.trust_policy_versions WHERE enterprise_id=${literal(tenantId)} AND policy_id='policy-settlement'`,{role:'service_role'});},
   async loadPreviousTransaction(){return null;},
   async persistDecision(record){const out=rpc('persist_canonical_trust_transaction_decision_v1',[json(decisionPayload(record)),json(record.decisionEnvelope)]);return {...record,persistenceStatus:out.status??'CREATED'};},
   async extendEvidenceGraph(r){const x=rpc('extend_canonical_trust_transaction_graph_v1',[literal(tenantId),literal(r.transactionId),literal(actorId),literal(r.correlationId)]);return x.evidenceGraphReference;},
   async appendReplay(r){const x=rpc('append_canonical_trust_transaction_replay_v1',[literal(tenantId),literal(r.transactionId),literal(actorId),literal(r.correlationId)]);return x.replayReference;},
   async emitTrustMemory(r){const x=rpc('emit_canonical_trust_transaction_memory_v1',[literal(tenantId),literal(r.transactionId),literal(actorId),literal(r.correlationId)]);return x.trustMemoryReference;},
   async requestExternalExecution(){return {configured:false,requestReference:null,acknowledgement:null,outcome:null};},
   async recordExternalAcknowledgement(){throw new Error('External acknowledgement forbidden');},async recordExternalOutcome(){throw new Error('External outcome forbidden');},
  };
  const receipt=await executeCanonicalTrustTransaction(transactionInput({idempotencyKey:'recovery-'+expected+'-'+randomUUID()}),deps);
  assert.equal(receipt.decision,expected);report.receipts.push(receipt);
  assert.equal(query(`SELECT count(*) FROM public.canonical_trust_transactions WHERE transaction_id=${literal(receipt.transactionId)}`,{role:'authenticated'}),'1');
  assert.equal(query(`SELECT count(*) FROM public.canonical_trust_transactions WHERE transaction_id=${literal(receipt.transactionId)}`,{role:'authenticated',actor:otherActor}),'0');
  for(const [table,column] of [['trust_replay_sessions','workspace_id'],['trust_memory_index','enterprise_id'],['evidence_graph_nodes','enterprise_id']]){
   assert.ok(Number(query(`SELECT count(*) FROM public.${table} WHERE ${column}=${literal(tenantId)}`,{role:'authenticated'}))>0);
   assert.equal(query(`SELECT count(*) FROM public.${table} WHERE ${column}=${literal(tenantId)}`,{role:'authenticated',actor:otherActor}),'0');
  }
  check(expected+' evaluator, real decision RPC, graph, Replay, Trust Memory, receipt read, tenant B denial');
 }
 report.result='PASS';
}catch(e){report.result='FAIL';report.error=e.message;}
finally{fs.writeFileSync(path.join(dir,database+'-result.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({result:report.result,checks:report.checks,error:report.error?.slice(0,1000)}));


if(report.result!=='PASS')process.exitCode=1;
