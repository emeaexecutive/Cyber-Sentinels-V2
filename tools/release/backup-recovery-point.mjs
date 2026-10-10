// Read-only source connection. Exported snapshot remains open until every DB artifact completes.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {spawn} from 'node:child_process';
import pg from 'pg';import {backupStorage,fileDigest,sha256} from './recovery-storage.mjs';
import {storageReadCredential} from './storage-backup-credentials.mjs';
const quote=name=>'"'+name.replaceAll('"','""')+'"';
const save=(dir,name,value)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(value,null,2)+'\n',{mode:0o600});
function deploymentInventory(value,releaseSha){
  const allowed=new Set(['provider','environment','deploymentId','releaseSha','capturedAt','configuration']);
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!allowed.has(key)))throw new Error('Sanitized deployment inventory schema is invalid');
  if(value.provider!=='vercel'||value.environment!=='production'||String(value.releaseSha).toLowerCase()!==releaseSha||!/^dpl_[A-Za-z0-9]+$/.test(value.deploymentId)||!Number.isFinite(Date.parse(value.capturedAt))||!Array.isArray(value.configuration)||value.configuration.length>200)throw new Error('Production deployment inventory binding is invalid');
  for(const entry of value.configuration){if(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).some(key=>!['name','configured','scope'].includes(key))||!/^([A-Z][A-Z0-9_]{0,127})$/.test(entry.name)||typeof entry.configured!=='boolean'||(entry.scope&&!['public','server','shared'].includes(entry.scope)))throw new Error('Deployment inventory may contain names and status only; values are forbidden');}
  return value;
}
export async function captureRecoveryPoint(config) {
  if (config.database?.password) throw new Error('Database passwords must be supplied through PGPASSWORD, not configuration.');
  const releaseSha=String(config.applicationReleaseSha??'').toLowerCase();
  if(!/^[a-f0-9]{40}$/.test(releaseSha))throw new Error('A Production application release SHA is required');
  const deployment=deploymentInventory(config.deploymentConfigurationInventory,releaseSha);
  const dir=fs.realpathSync(config.directory);
  if(fs.existsSync(path.join(dir,'production.dump'))||fs.existsSync(path.join(dir,'recovery-point.json')))throw new Error('Recovery point must be fresh');
  const client=new pg.Client({...config.database,password:process.env.PGPASSWORD??config.database.password,application_name:'cybersentinels-readonly-recovery-backup'});
  const manifest={format:'cs-recovery-point-v2',projectRef:config.projectRef,applicationReleaseSha:releaseSha,deploymentConfigurationInventory:'deployment-configuration-inventory.json',startedAt:new Date().toISOString(),archiveCreated:false,archiveReadable:false,checksumVerified:false,supplementalSnapshotComplete:false,storagePayloadsVerified:false,storagePointInTimeConsistent:false,isolatedRestoreValidated:false,status:'BLOCKED',commands:[],artifacts:[],limitations:[]};
  save(dir,'deployment-configuration-inventory.json',deployment);
  async function dump(args,tag){
    const env={...process.env,PGHOST:config.database.host,PGPORT:String(config.database.port??5432),PGUSER:config.database.user,PGDATABASE:config.database.database,PGPASSWORD:process.env.PGPASSWORD??config.database.password,PGSSLMODE:config.database.ssl?'require':'disable',PGOPTIONS:'-c default_transaction_read_only=on'};
    const exe=path.join(config.postgresBin??'',tag==='readability'?(process.platform==='win32'?'pg_restore.exe':'pg_restore'):(process.platform==='win32'?'pg_dump.exe':'pg_dump'));
    manifest.commands.push({executable:path.basename(exe),args});
    const result=await new Promise((resolve,reject)=>{const child=spawn(exe,args,{env,windowsHide:true,stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);child.on('error',()=>reject(new Error('PostgreSQL backup executable unavailable')));child.on('close',code=>resolve({code,out,err}));});
    // Server errors may contain connection details. Artifacts are restricted; redact the password regardless.
    const redact=s=>env.PGPASSWORD?s.replaceAll(env.PGPASSWORD,'[REDACTED]'):s;
    fs.writeFileSync(path.join(dir,tag+'.stdout.private.log'),redact(result.out),{mode:0o600});fs.writeFileSync(path.join(dir,tag+'.stderr.private.log'),redact(result.err),{mode:0o600});
    if(result.code!==0)throw new Error('PostgreSQL '+tag+' failed; see restricted log');return result.out;
  }
  try{
    manifest.pgDumpVersion=(await dump(['--version'],'client-version')).trim();if(!/17\.11(?:\s|$)/.test(manifest.pgDumpVersion))throw new Error('Reviewed PostgreSQL 17.11 dump client required');
    await client.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const identity=(await client.query("SELECT pg_export_snapshot() AS snapshot, current_timestamp AS snapshot_time, current_setting('server_version') AS server_version, current_database() AS database, pg_encoding_to_char(encoding) AS encoding, datcollate AS collation, datctype AS ctype FROM pg_database WHERE datname=current_database()")).rows[0];
    manifest.databaseSnapshot=identity;
    const tables=(await client.query("SELECT n.nspname AS schema,c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname !~ '^pg_' AND n.nspname<>'information_schema' ORDER BY 1,2")).rows;
    // Hold access-share locks for the catalogued tables; concurrent DROP/ALTER must wait.
    for(const t of tables)await client.query('LOCK TABLE ONLY '+quote(t.schema)+'.'+quote(t.name)+' IN ACCESS SHARE MODE');
    const counts=[],ledgers={};
    for(const t of tables){const name=quote(t.schema)+'.'+quote(t.name);counts.push({...t,count:(await client.query('SELECT count(*)::text AS count FROM ONLY '+name)).rows[0].count});if(/migration/i.test(t.name)&&['supabase_migrations','auth','storage','realtime'].includes(t.schema))ledgers[t.schema+'.'+t.name]=(await client.query('SELECT row_to_json(t) AS row FROM '+name+' t ORDER BY row_to_json(t)::text')).rows.map(x=>x.row);}
    save(dir,'table-counts.json',{databaseSnapshot:identity,semantics:'COUNT FROM ONLY; physical rows, no partition double count',tables:counts});save(dir,'migration-ledger.json',{databaseSnapshot:identity,tables:ledgers});
    const catalog=(await client.query(fs.readFileSync(new URL('./recovery-snapshot-catalog.sql',import.meta.url),'utf8'))).rows[0].inventory;
    save(dir,'catalog-security.json',{databaseSnapshot:identity,...catalog});save(dir,'extensions.json',{databaseSnapshot:identity,extensions:catalog.extensions});
    const storage={projectRef:config.projectRef,databaseSnapshot:identity,buckets:(await client.query('SELECT row_to_json(b) AS row FROM storage.buckets b ORDER BY id')).rows.map(x=>x.row),objects:(await client.query('SELECT row_to_json(o) AS row FROM storage.objects o ORDER BY bucket_id,name')).rows.map(x=>x.row)};
    save(dir,'storage-metadata.json',storage);
    await dump(['--no-password','--format=custom','--snapshot='+identity.snapshot,'--file='+path.join(dir,'production.dump')],'archive');manifest.archiveCreated=true;
    await dump(['--no-password','--schema-only','--snapshot='+identity.snapshot,'--file='+path.join(dir,'schema.private.sql')],'schema');
    const toc=await dump(['--list',path.join(dir,'production.dump')],'readability');manifest.archiveReadable=true;
    for(const required of ['TABLE DATA public ','TABLE DATA auth ','TABLE DATA storage ','TABLE DATA supabase_migrations ','FUNCTION public ','CONSTRAINT public '])if(!toc.includes(required))throw new Error('Required archive category missing: '+required);
    manifest.archive=await fileDigest(path.join(dir,'production.dump'));manifest.checksumVerified=true;manifest.supplementalSnapshotComplete=true;
    if(config.storage){
      const key=storageReadCredential(config.storage,config.projectRef);
      const payload=await backupStorage({url:config.storage.url,key,inventory:storage,directory:path.join(dir,'storage-payloads')});manifest.storagePayloadsVerified=payload.status==='PASS';
      // A PostgreSQL snapshot cannot atomically freeze external object bytes. Require explicit quiescence evidence.
      if(config.storage.quiescenceProof){
        const proofText=fs.readFileSync(config.storage.quiescenceProof,'utf8'),proof=JSON.parse(proofText);
        if(proof.projectRef!==config.projectRef||!proof.operator||!proof.changeReference||!Number.isFinite(Date.parse(proof.startsAt))||!Number.isFinite(Date.parse(proof.endsAt))||Date.parse(proof.startsAt)>Date.parse(manifest.startedAt)||Date.parse(proof.endsAt)<Date.now())throw new Error('Storage quiescence proof does not cover capture interval');
        const current=new pg.Client({...config.database,password:process.env.PGPASSWORD??config.database.password});await current.connect();
        try{await current.query('BEGIN READ ONLY');const now=(await current.query('SELECT row_to_json(o) AS row FROM storage.objects o ORDER BY bucket_id,name')).rows.map(x=>x.row);const bucketNow=(await current.query('SELECT row_to_json(b) AS row FROM storage.buckets b ORDER BY id')).rows.map(x=>x.row);if(JSON.stringify(now)!==JSON.stringify(storage.objects)||JSON.stringify(bucketNow)!==JSON.stringify(storage.buckets))throw new Error('Storage metadata/version changed during capture');await current.query('ROLLBACK');}finally{await current.end();}
        save(dir,'storage-quiescence-proof.json',proof);manifest.storagePointInTimeConsistent=true;manifest.storageQuiescenceProofSha256=sha256(proofText);
      }else manifest.limitations.push('Storage point-in-time consistency unproven: no externally enforced write-quiescence proof supplied');
      payload.archiveSha256=manifest.archive.sha256;payload.pointInTimeConsistency=manifest.storagePointInTimeConsistent?'VERIFIED_WITH_QUIESCENCE_AND_UNCHANGED_METADATA':'UNPROVEN';payload.quiescenceProofSha256=manifest.storageQuiescenceProofSha256??null;save(path.join(dir,'storage-payloads'),'storage-manifest.json',payload);fs.writeFileSync(path.join(dir,'storage-payloads/storage-manifest.sha256'),sha256(fs.readFileSync(path.join(dir,'storage-payloads/storage-manifest.json')))+'\n',{mode:0o600});
    }else{save(dir,'storage-payload-status.json',{status:'BLOCKED',reason:'No approved Storage credential/configuration supplied',objectCount:storage.objects.length});manifest.limitations.push('Storage payload acquisition not configured');}
    await client.query('COMMIT');
    manifest.status=manifest.supplementalSnapshotComplete&&manifest.storagePayloadsVerified&&manifest.storagePointInTimeConsistent?'PASS':'BLOCKED';
  }catch(error){manifest.error=error.message;manifest.status=manifest.archiveReadable?'BLOCKED':'FAIL';try{await client.query('ROLLBACK');}catch{}}
  finally{await client.end().catch(()=>{});manifest.finishedAt=new Date().toISOString();async function inventory(sub=''){for(const entry of fs.readdirSync(path.join(dir,sub),{withFileTypes:true})){const file=path.join(sub,entry.name);if(entry.isDirectory())await inventory(file);else if(entry.isFile()&&file!=='recovery-point.json'&&file!=='recovery-point.sha256')manifest.artifacts.push({file,...await fileDigest(path.join(dir,file))});}}await inventory();save(dir,'recovery-point.json',manifest);fs.writeFileSync(path.join(dir,'recovery-point.sha256'),sha256(fs.readFileSync(path.join(dir,'recovery-point.json')))+'\n',{mode:0o600});}
  return manifest;
}
async function readStdin(){process.stdin.setEncoding('utf8');let input='';for await(const chunk of process.stdin)input+=chunk;return input;}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{const source=process.argv[2]==='--stdin'?await readStdin():fs.readFileSync(process.argv[2],'utf8');const config=JSON.parse(source.replace(/^\uFEFF/,''));const result=await captureRecoveryPoint(config);console.log(JSON.stringify({status:result.status,archiveReadable:result.archiveReadable,supplementalSnapshotComplete:result.supplementalSnapshotComplete,storagePointInTimeConsistent:result.storagePointInTimeConsistent}));if(result.status!=='PASS')process.exitCode=result.status==='BLOCKED'?2:1;}catch{console.error('Recovery point capture failed before initialization; no PASS');process.exitCode=1;}}
