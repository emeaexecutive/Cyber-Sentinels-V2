import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const [artifactDirectory,name,execute,manifestPath]=process.argv.slice(2);
if(!artifactDirectory||!/^cs-recovery-[a-z0-9-]+$/.test(name??'')||execute!=='--execute-local')throw new Error('Usage: recovery-restore-20261009.mjs <restricted-artifact-dir> <fresh-cs-recovery-name> --execute-local');
const dir=fs.realpathSync(artifactDirectory);
const repository=fs.realpathSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'../..'));
if(dir.toLowerCase()===repository.toLowerCase()||dir.toLowerCase().startsWith(repository.toLowerCase()+path.sep))throw new Error('Artifacts must be outside repository');
if(/[,"\r\n]/.test(dir))throw new Error('Unsupported mount path');
const prefix=name;
const image='public.ecr.aws/supabase/postgres@sha256:06ddc7962e11ab0f4f0334fd05671e97c30ea202f6e6a7113800bd3d6e416108';
const suppliedManifest=manifestPath?JSON.parse(fs.readFileSync(manifestPath,'utf8').replace(/^\uFEFF/,'')):null;
if(suppliedManifest&&!['kecgtsfibkypjuaxqbjx','local-recovery-fixture'].includes(suppliedManifest.projectRef??suppliedManifest.project))throw new Error('Unapproved project manifest');
const expected=suppliedManifest?(suppliedManifest.archive?.sha256??suppliedManifest.sha256)?.toLowerCase():'f5e263a834f91ba5786efaa6a7a275df95c4ede96fa6277a0b96dbdc68f73358';
if(!/^[a-f0-9]{64}$/.test(expected??''))throw new Error('Archive SHA-256 required');
function run(cmd,args,tag){
 const r=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:32*1024*1024});
 if(tag){fs.writeFileSync(path.join(dir,tag+'.stdout.private.log'),r.stdout??'');fs.writeFileSync(path.join(dir,tag+'.stderr.private.log'),r.stderr??'');}
 if(r.status!==0 && !tag){fs.writeFileSync(path.join(dir,prefix+'-unlabelled-error.private.log'),JSON.stringify({args,status:r.status,stderr:r.stderr}));} if(r.status!==0) throw Object.assign(new Error('Command failed: '+(tag??cmd)),{exitCode:r.status});
 return r.stdout.trim();
}
const pg='C:/Program Files/PostgreSQL/17/bin/pg_restore.exe';
const hash=createHash('sha256').update(fs.readFileSync(path.join(dir,'production.dump'))).digest('hex');
if(hash!==expected)throw new Error('Archive hash mismatch');
if(fs.existsSync(path.join(dir,prefix+'-execution.json')))throw new Error('Prior execution exists');
const toc=run(pg,['--list',path.join(dir,'production.dump')]);
const entries=toc.split(/\r?\n/).filter(s=>/^\d+;/.test(s));
const events=entries.filter(s=>/ EVENT TRIGGER /.test(s));
const body=entries.filter(s=>!/ EVENT TRIGGER /.test(s));
if((!suppliedManifest&&events.length!==7)||body.length+events.length!==entries.length||new Set(entries.map(x=>x.split(';')[0])).size!==entries.length)throw new Error('TOC partition mismatch');
fs.writeFileSync(path.join(dir,prefix+'-body.list'),body.join('\n')+'\n');
fs.writeFileSync(path.join(dir,prefix+'-events.list'),events.join('\n')+'\n');
run(pg,['--use-list',path.join(dir,prefix+'-body.list'),'--file',path.join(dir,prefix+'-body.private.sql'),path.join(dir,'production.dump')],prefix+'-extract-body');
run(pg,['--use-list',path.join(dir,prefix+'-events.list'),'--use-set-session-authorization','--file',path.join(dir,prefix+'-events.private.sql'),path.join(dir,'production.dump')],prefix+'-extract-events');
const eventSql=fs.readFileSync(path.join(dir,prefix+'-events.private.sql'),'utf8');
if(!/SET SESSION AUTHORIZATION 'postgres';[\s\S]*CREATE EVENT TRIGGER ensure_rls/.test(eventSql))throw new Error('Event session authorization missing');
fs.writeFileSync(path.join(dir,prefix+'-owner-gate.sql'),`DO $$ BEGIN
 IF (SELECT proowner::regrole::text FROM pg_proc WHERE oid='public.rls_auto_enable()'::regprocedure) IS DISTINCT FROM 'postgres' THEN RAISE EXCEPTION 'Function owner mismatch'; END IF;
 IF (SELECT rolsuper FROM pg_roles WHERE rolname='postgres') IS DISTINCT FROM false THEN RAISE EXCEPTION 'postgres must remain non-superuser'; END IF;
END $$;
SELECT 'FUNCTION_OWNER_BEFORE_EVENTS=' || proowner::regrole::text FROM pg_proc WHERE oid='public.rls_auto_enable()'::regprocedure;
`);
let created=false;const result={startedAtUtc:new Date().toISOString(),target:name,image,archiveSha256:hash,tocEntries:entries.length,eventEntries:events.length,bodyEntries:body.length,restoreSucceeded:false,isolatedRestoreValidated:false,productionConnections:0};
try{
 run('docker',['run','--pull','never','-d','--name',name,'--network','none','--label','cybersentinels.workstream=isolated-production-restore','--mount',`type=bind,source=${dir},target=/recovery,readonly`,'--entrypoint','sh',image,'-c','export POSTGRES_PASSWORD=$(head -c 32 /dev/urandom | base64); exec docker-entrypoint.sh postgres -D /etc/postgresql -c cron.launch_active_jobs=off'],prefix+'-create');created=true;
 const inspect=JSON.parse(run('docker',['inspect',name]))[0];result.targetId=inspect.Id;
 if(inspect.HostConfig.NetworkMode!=='none'||Object.keys(inspect.HostConfig.PortBindings??{}).length)throw new Error('Network guard failed');
 let ready=false;for(let i=0;i<30;i++){const main=spawnSync('docker',['exec',name,'cat','/proc/1/comm'],{encoding:'utf8'});const r=spawnSync('docker',['exec',name,'pg_isready','-U','supabase_admin','-d','postgres']);if(r.status===0 && ['postgres','.postgres-wrapp'].includes(main.stdout.trim())){ready=true;break;} await new Promise(r=>setTimeout(r,1000));}
 if(!ready)throw new Error('Readiness failed');
 const gate=run('docker',['exec',name,'psql','-X','-U','supabase_admin','-d','postgres','-Atc',"SELECT current_setting('server_version')='17.11' AND current_setting('cron.launch_active_jobs')='off' AND pg_has_role('postgres','supabase_privileged_role','MEMBER');"]);
 if(gate!=='t')throw new Error('Version/runtime gate failed');
 run('docker',['exec',name,'psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-c','CREATE ROLE supabase_realtime_admin WITH NOINHERIT NOLOGIN NOREPLICATION;'],prefix+'-role');
 run('docker',['exec',name,'createdb','-U','supabase_admin','--template=template0','--owner=postgres','recovery_validation'],prefix+'-createdb');
 const args=['exec',name,'psql','-X','--no-password','-U','supabase_admin','-d','recovery_validation','-v','ON_ERROR_STOP=1','--single-transaction','-f','/recovery/'+prefix+'-body.private.sql','-f','/recovery/'+prefix+'-owner-gate.sql','-f','/recovery/'+prefix+'-events.private.sql'];
 result.restoreCommand=['docker',...args];
 const restoreStarted=Date.now();run('docker',args,prefix+'');result.restoreDurationMs=Date.now()-restoreStarted;result.restoreExitCode=0;result.restoreSucceeded=true;
}catch(e){result.error=e.message;result.restoreExitCode=e.exitCode??null;if(created){run('docker',['stop',name],prefix+'-stop');result.targetStopped=true;}}
finally{if(created&&!result.targetStopped){const stopped=spawnSync('docker',['stop',name],{encoding:'utf8'});result.targetStopped=stopped.status===0;fs.writeFileSync(path.join(dir,prefix+'-stop.stderr.private.log'),stopped.stderr??'');}result.finishedAtUtc=new Date().toISOString();fs.writeFileSync(path.join(dir,prefix+'-execution.json'),JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify({restoreSucceeded:result.restoreSucceeded,exitCode:result.restoreExitCode,error:result.error,target:name}));


if(!result.restoreSucceeded||!result.targetStopped)process.exitCode=1;
