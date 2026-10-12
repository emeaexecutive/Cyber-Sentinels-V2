// Offline Storage compatibility profile for the reviewed 73-row migration ledger.
import fs from 'node:fs';import path from 'node:path';import {spawnSync}from'node:child_process';import{createHash}from'node:crypto';
const [directory,target]=process.argv.slice(2);if(!directory||!/^cs-recovery-[a-z0-9-]+$/.test(target??''))throw new Error('Restricted directory and isolated target required');
const dir=fs.realpathSync(directory),started=[],report={status:'BLOCKED',target,started,productionConnections:0};
const run=args=>{const r=spawnSync('docker',args,{encoding:'utf8',maxBuffer:16*1024*1024});if(r.status!==0)throw new Error('Local Storage setup failed: '+args[0]);return r.stdout.trim();};
const identity=JSON.parse(run(['inspect',target]))[0];if(identity.HostConfig.NetworkMode!=='none'||Object.keys(identity.HostConfig.PortBindings??{}).length||identity.Config.Labels?.['cybersentinels.workstream']!=='isolated-production-restore')throw new Error('Isolation guard failed');
if(identity.Config.Image!=='public.ecr.aws/supabase/postgres@sha256:06ddc7962e11ab0f4f0334fd05671e97c30ea202f6e6a7113800bd3d6e416108')throw new Error('Reviewed PostgreSQL image required');
if(fs.existsSync(path.join(dir,target+'-storage-stack.json')))throw new Error('Fresh Storage evidence required');
const compatibility=[['0002-storage-schema.sql','19562682ff1b77cda9ba096671b873e7e226b10f0b0564bd4823e6c1754393b6'],['0062-object-versioning-core.sql','45969060b55102f56af317b0d7981434be58927de1ff76e1e1789139a3f2defc']];
for(const [file,hash]of compatibility)if(createHash('sha256').update(fs.readFileSync(path.join(dir,'storage-authoritative-'+file))).digest('hex')!==hash)throw new Error('Authoritative Storage migration source checksum mismatch');
const secrets=JSON.parse(fs.readFileSync(path.join(dir,target+'-stack-local.private.json'),'utf8'));
try{
 for(const [suffix,port]of[['source','5000'],['target','5001']]){
  const database='recovery_storage_'+suffix,name=target+'-storage-'+suffix;
  run(['exec',target,'createdb','-U','supabase_admin','--template=recovery_validation','--owner=postgres',database]);
  const env={DATABASE_URL:'postgres://supabase_storage_admin:'+secrets.password+'@127.0.0.1:5432/'+database,AUTH_JWT_SECRET:secrets.jwt,ANON_KEY:secrets.anon,SERVICE_KEY:secrets.service,STORAGE_BACKEND:'file',FILE_STORAGE_BACKEND_PATH:'/var/lib/storage',TENANT_ID:'local-recovery',REGION:'local',SERVER_PORT:port,SERVER_HOST:'127.0.0.1',DB_MIGRATIONS_FREEZE_AT:'drop-bucketid-objname-index',DB_ALLOW_MIGRATION_REFRESH:'false',ENABLE_IMAGE_TRANSFORMATION:'false',PG_QUEUE_ENABLE:'false'};
  run(['run','-d','--pull','never','--name',name,'--network','container:'+target,'--mount','type=volume,source='+name+',target=/var/lib/storage',...compatibility.flatMap(([file])=>['--mount','type=bind,source='+path.join(dir,'storage-authoritative-'+file)+',target=/app/migrations/tenant/'+file+',readonly']),...Object.entries(env).flatMap(([k,v])=>['-e',k+'='+v]),'supabase/storage-api@sha256:98ffec5d0678803783c30e404c27f4ec65e97efbe014088f2a86b4b8b54b9f54']);started.push(name);
  let ready=false;for(let i=0;i<30;i++){const r=spawnSync('docker',['exec',target,'curl','--silent','--max-time','2','--output','/dev/null','--write-out','%{http_code}','http://127.0.0.1:'+port+'/status'],{encoding:'utf8'});if(r.stdout==='200'){ready=true;break;}await new Promise(r=>setTimeout(r,1000));}if(!ready)throw new Error('Storage readiness failed; migration ledger must not be edited to bypass it');
  const ledger=db=>run(['exec',target,'psql','-X','-At','-U','supabase_admin','-d',db,'-c','SELECT json_agg(row_to_json(m) ORDER BY id) FROM storage.migrations m']);
  if(ledger(database)!==ledger('recovery_validation'))throw new Error('Storage API changed migration ledger');
 }
 report.status='RUNNING_NOT_VALIDATED';report.migrationLedgerPreserved=true;
}catch(error){report.error=error.message;for(const name of started)spawnSync('docker',['stop',name]);process.exitCode=1;}
finally{fs.writeFileSync(path.join(dir,target+'-storage-stack.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});}
console.log(JSON.stringify(report));
