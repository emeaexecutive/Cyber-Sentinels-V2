// Offline recovery orchestration. No Production endpoints or source credentials are accepted.
import fs from 'node:fs';import path from 'node:path';import {spawnSync}from'node:child_process';import {randomUUID,createHash}from'node:crypto';import{fileURLToPath}from'node:url';
const [directory,execute,payloadDirectory]=process.argv.slice(2);if(!directory||execute!=='--execute-local')throw new Error('Usage: recovery-drill.mjs <restricted-backup-directory> --execute-local [actual-storage-payload-directory]');
const dir=fs.realpathSync(directory),repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');if(dir.toLowerCase().startsWith(repo.toLowerCase()+path.sep))throw new Error('Evidence must be outside repository');
const id='cs-recovery-drill-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+randomUUID().slice(0,8),start=Date.now();
const report={id,startedAt:new Date().toISOString(),status:'BLOCKED',databaseRecovery:'FAIL',applicationRecovery:'BLOCKED',storagePayloadRecovery:'BLOCKED',securityRlsRecovery:'FAIL',trustEvidenceRecovery:'FAIL',fullPlatformRecovery:'BLOCKED',isolatedRestoreValidated:false,productionConnections:0,steps:[],limitations:[],targetStopped:false};
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
function run(command,args,tag,{allowFailure=false}={}){const r=spawnSync(command,args,{cwd:repo,encoding:'utf8',maxBuffer:64*1024*1024,windowsHide:true});fs.writeFileSync(path.join(dir,id+'-'+tag+'.stdout.private.log'),r.stdout??'',{mode:0o600});fs.writeFileSync(path.join(dir,id+'-'+tag+'.stderr.private.log'),r.stderr??'',{mode:0o600});report.steps.push({tag,exitStatus:r.status});if(r.status!==0&&!allowFailure)throw new Error(tag+' failed; see restricted evidence');return r;}
const owned=[];let targetCreated=false;
try{
 const required=['production.dump','archive-data.private.sql','restore-schema.private.sql','restored-schema.private.sql','extension-classification.json','gotrue-auth.private.bin','app-frozen/package-lock.json','storage-authoritative-0002-storage-schema.sql','storage-authoritative-0062-object-versioning-core.sql'];
 for(const file of required)if(!fs.existsSync(path.join(dir,file)))throw new Error('Reviewed recovery profile prerequisite missing: '+file);
 // This qualified profile is intentionally bound to the reviewed release/archive. Unknown profiles remain BLOCKED.
 if(hash(path.join(dir,'production.dump'))!=='f5e263a834f91ba5786efaa6a7a275df95c4ede96fa6277a0b96dbdc68f73358')throw new Error('Archive needs a reviewed compatibility profile before integrated qualification');
 const classification=read(path.join(dir,'extension-classification.json'));if(classification.results.length!==51||classification.results.some(x=>x.classification!=='EXPECTED_PLATFORM_DIFFERENCE'))throw new Error('Unresolved extension profile');
 run(process.execPath,['tools/release/recovery-restore-20261009.mjs',dir,id,'--execute-local'],'restore');targetCreated=true;
 const restored=read(path.join(dir,id+'-execution.json'));report.restoreDurationMs=restored.restoreDurationMs;report.archiveSha256=restored.archiveSha256;report.targetId=restored.targetId;
 run('docker',['start',id],'start');
 let ready=false;for(let i=0;i<30;i++){const r=spawnSync('docker',['exec',id,'pg_isready','-U','supabase_admin','-d','postgres'],{encoding:'utf8'});if(r.status===0){ready=true;break;}await new Promise(r=>setTimeout(r,1000));}if(!ready)throw new Error('Database readiness timeout');
 run(process.execPath,['tools/release/recovery-structural.mjs',dir,id],'structural');
 run(process.execPath,['--experimental-strip-types','tools/release/recovery-continuity.mjs',dir,id],'continuity');
 const structural=read(path.join(dir,id+'-structural-result.json')),continuity=read(path.join(dir,id+'-continuity-result.json'));
 const normalizeSchema=file=>fs.readFileSync(file,'utf8').split(/\r?\n/).filter(x=>!x.startsWith('--')&&!x.startsWith('\\restrict')&&!x.startsWith('\\unrestrict')).join('\n').trim();
 if(normalizeSchema(path.join(dir,'restored-schema.private.sql'))!==normalizeSchema(path.join(dir,id+'-restored-schema.private.sql')))throw new Error('Fresh schema differs from reviewed owner/ACL/RLS/function baseline');
 if(structural.dataResults.some(x=>!x.contentMatches||!x.sqlCountMatches)||structural.foreignKeys.results.some(x=>x.violations)||continuity.trustEventIntegrity.failures.length)throw new Error('Structural/integrity gate failed');
 report.databaseRecovery='PASS';report.trustEvidenceRecovery='PASS';report.structuralCounts={tables:structural.dataResults.length,foreignKeys:structural.foreignKeys.count,trustEvents:continuity.trustEventIntegrity.checked};
 run(process.execPath,['tools/release/recovery-local-stack.mjs',dir,id],'stack');const stack=read(path.join(dir,id+'-stack.json'));owned.push(...stack.started);
 // A source-archive RLS defect was proven by a real Auth/Data API probe. Apply the existing repository security closure only to the disposable application copy.
 const hardening='supabase/migrations/202610040001_p0p1_security_closure.sql';report.requiredPostRestoreHardening={file:hardening,sha256:hash(path.join(repo,hardening)),appliedTo:'recovery_application',pristineRestoreUnchanged:true};
 fs.copyFileSync(path.join(repo,hardening),path.join(dir,id+'-hardening.sql'));fs.writeFileSync(path.join(dir,id+'-owner.sql'),'SET SESSION AUTHORIZATION postgres;\n');
 run('docker',['exec',id,'psql','-X','-U','supabase_admin','-d','recovery_application','--single-transaction','-v','ON_ERROR_STOP=1','-f','/recovery/'+id+'-owner.sql','-f','/recovery/'+id+'-hardening.sql'],'hardening');
 run(process.execPath,['tools/release/recovery-post-hardening.mjs',dir,id],'post-hardening-catalog');
 for(const [file,database]of[['recovery-security.sql','recovery_application'],['recovery-extension-probes.sql','recovery_application']]){
  fs.copyFileSync(path.join(repo,'tools/release',file),path.join(dir,id+'-'+file));
  run('docker',['exec',id,'psql','-X','-U','supabase_admin','-d',database,'-v','ON_ERROR_STOP=1','-f','/recovery/'+id+'-'+file],file);
 }
 for(const name of ['recovery-application-http.mjs','recovery-dependency-probe.mjs'])run('docker',['cp',path.join(repo,'tools/release',name),id+'-stack-app:/tmp/'+name],'copy-'+name);
 let appReady=false;for(let i=0;i<30;i++){const r=spawnSync('docker',['exec',id,'curl','--silent','--max-time','10','--output','/dev/null','--write-out','%{http_code}','http://127.0.0.1:3000/api/agents'],{encoding:'utf8'});if(r.stdout==='401'){appReady=true;break;}await new Promise(r=>setTimeout(r,1000));}if(!appReady)throw new Error('Application readiness timeout');
 run('docker',['exec',id+'-stack-app','node','--experimental-strip-types','/tmp/recovery-application-http.mjs',id],'application-http');
 const runtimeDir=path.join(dir,'app-frozen/.recovery-evidence',id),runtime=read(path.join(runtimeDir,'application-http-result.json'));if(runtime.status!=='PASS'||runtime.checks.some(x=>x.status!=='PASS'))throw new Error('Integrated runtime gate did not pass');
 report.runtimeEvidence=runtimeDir;
 run(process.execPath,['tools/release/recovery-storage-stack.mjs',dir,id],'storage-stack');owned.push(...read(path.join(dir,id+'-storage-stack.json')).started);
 for(const file of ['recovery-storage.mjs','recovery-storage-fixture.mjs'])run('docker',['cp',path.join(repo,'tools/release',file),id+'-stack-app:/tmp/'+file],'copy-'+file);
 run('docker',['exec',id+'-stack-app','node','/tmp/recovery-storage-fixture.mjs','/app/.recovery-evidence/'+id+'/storage-tooling'],'storage-tooling');
 report.storageTooling='PASS';report.storagePayloadRecovery='BLOCKED';
 run('docker',['stop',id+'-stack-rest'],'inject-data-outage');
 run('docker',['exec',id+'-stack-app','node','/tmp/recovery-dependency-probe.mjs',id,'data'],'data-outage');
 run('docker',['start',id+'-stack-rest'],'restore-data-service');
 run('docker',['exec',id,'pkill','-f','^/recovery/gotrue-auth.private.bin serve$'],'inject-auth-outage');
 run('docker',['exec',id+'-stack-app','node','/tmp/recovery-dependency-probe.mjs',id,'auth'],'auth-outage');
 report.applicationRecovery='PASS';report.securityRlsRecovery='PASS';report.isolatedRestoreValidated=true;report.runtimeEvidence=runtimeDir;report.measuredDatabaseApplicationRecoveryMs=Date.now()-start;
 const actualPayloads=payloadDirectory??path.join(dir,'storage-payloads');
 if(fs.existsSync(path.join(actualPayloads,'storage-manifest.json'))){
  try{const result=run(process.execPath,['tools/release/recovery-storage-payload-drill.mjs',dir,id,actualPayloads,'--keep-target'],'actual-storage-payloads');const storage=JSON.parse(result.stdout);if(storage.status!=='PASS')throw new Error('Actual Storage payload recovery incomplete');report.storagePayloadRecovery='PASS';report.actualStorageEvidence=storage.evidenceDirectory;report.storagePayloadManifestSha256=storage.payloadManifestSha256;}
  catch(error){report.storagePayloadRecovery='FAIL';throw error;}
 }
 report.limitations.push('Security PASS requires the recorded repository hardening step; the unmodified archive has a confirmed Agent Registry cross-tenant RLS defect. Production was not changed.');
 if(report.storagePayloadRecovery!=='PASS')report.limitations.push('Actual archived Storage payload manifest unavailable; synthetic tests cannot substitute for actual recovery.');
 report.limitations.push('Independent snapshots missing from the original archive cannot be reconstructed retrospectively.');
 report.status=report.storagePayloadRecovery==='PASS'?'PASS':'BLOCKED';report.fullPlatformRecovery=report.status;
}catch(error){report.error=error.message;report.status=report.steps.some(x=>x.exitStatus!==0)?'FAIL':'BLOCKED';if(report.databaseRecovery==='PASS'&&report.applicationRecovery!=='PASS')report.applicationRecovery='FAIL';report.fullPlatformRecovery=report.status;report.isolatedRestoreValidated=report.databaseRecovery==='PASS'&&report.applicationRecovery==='PASS'&&report.securityRlsRecovery==='PASS';}
finally{
 // Include partially started services even when their launcher failed before returning.
 for(const file of [id+'-stack.json',id+'-storage-stack.json'])if(fs.existsSync(path.join(dir,file)))for(const name of read(path.join(dir,file)).started??[])if(!owned.includes(name))owned.push(name);
 if(!targetCreated&&fs.existsSync(path.join(dir,id+'-execution.json')))targetCreated=true;
 const stopNames=[...owned].reverse();if(targetCreated)stopNames.push(id);
 report.stops=[];for(const name of stopNames){const logs=spawnSync('docker',['logs',name],{encoding:'utf8',maxBuffer:64*1024*1024});let output=(logs.stdout??'')+(logs.stderr??'');const secretFile=path.join(dir,id+'-stack-local.private.json');if(fs.existsSync(secretFile))for(const value of Object.values(read(secretFile)))if(typeof value==='string'&&value)output=output.replaceAll(value,'[REDACTED_LOCAL_SECRET]');fs.writeFileSync(path.join(dir,id+'-'+name+'-container.private.log'),output,{mode:0o600});const stopped=spawnSync('docker',['stop',name],{encoding:'utf8'});const inspected=spawnSync('docker',['inspect','--format','{{.State.Running}}',name],{encoding:'utf8'});report.stops.push({name,stopExit:stopped.status,running:inspected.stdout.trim()});}
 report.targetStopped=targetCreated&&report.stops.every(x=>x.stopExit===0&&x.running==='false');if(targetCreated&&!report.targetStopped){report.status='FAIL';report.fullPlatformRecovery='FAIL';report.isolatedRestoreValidated=false;}
 report.finishedAt=new Date().toISOString();report.totalDrillDurationMs=Date.now()-start;report.rtoScope='Measured local database/application recovery duration; not contractual Production RTO or RPO';
 const result=path.join(dir,id+'-result.json');fs.writeFileSync(result,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 const files=fs.readdirSync(dir).filter(n=>n.startsWith(id)&&fs.statSync(path.join(dir,n)).isFile()&&!/private\.key|local\.private\.json|credentials\.private\.sql/.test(n)).map(file=>({file,sha256:hash(path.join(dir,file))}));
 const runtimeRoot=path.join(dir,'app-frozen/.recovery-evidence',id);
 function includeEvidence(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())includeEvidence(file);else if(entry.isFile()&&entry.name!=='fixtures.private.json')files.push({file:path.relative(dir,file),sha256:hash(file)});}}
 if(fs.existsSync(runtimeRoot))includeEvidence(runtimeRoot);
 if(report.actualStorageEvidence)includeEvidence(report.actualStorageEvidence);
 fs.writeFileSync(path.join(dir,id+'-evidence-sha256.json'),JSON.stringify({files},null,2)+'\n',{mode:0o600});
}
console.log(JSON.stringify(report,null,2));process.exitCode=report.status==='PASS'?0:report.status==='BLOCKED'?2:1;
