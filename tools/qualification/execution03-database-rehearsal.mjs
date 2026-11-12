// Local schema-only reconstruction and authenticated backup/restore; never reads env files.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import pg from 'pg';
import {compileMigration} from '../release/migration-execution.mjs';
import {createSwarmStore} from '../../lib/swarm/store.ts';
import {swarmRpcPersistence} from '../../lib/swarm/rpc-persistence.ts';
import {appendSwarmEvent,verifySwarmReplay} from '../../lib/swarm/containment.ts';

if(process.env.TENENTE_LOCAL_PG_PORT!=='55473')throw Error('ISOLATED_PORT_REQUIRED');
const source=path.resolve(process.argv[2]??'tmp/execution03-staging-catalog.json');
if(!source.startsWith(path.resolve('tmp')+path.sep))throw Error('IGNORED_SCHEMA_SOURCE_REQUIRED');
const catalog=JSON.parse(fs.readFileSync(source,'utf8'));
// Extend only the isolated schema reconstructor's explicit scope, not product code.
const originalHelper=fs.readFileSync('tools/release/application-catalog.mjs','utf8');
const helper=originalHelper.replace("'private', 'supabase_migrations'","'private', 'supabase_migrations', 'session_security'").replaceAll("f.schema==='private'","['private','session_security'].includes(f.schema)");
const {applicationCatalogSql}=await import('data:text/javascript;base64,'+Buffer.from(helper).toString('base64'));
for(const key of Object.keys(catalog))if(catalog[key]===null)catalog[key]=[];
catalog.indexes=catalog.indexes.map(ix=>({...ix,schema:ix.schema??ix.schemaname,table:ix.table??ix.tablename,name:ix.name??ix.indexname,definition:ix.definition??ix.indexdef}));
catalog.ledger??=[];
// Session gate is referenced by SQL-standard public function bodies at CREATE time.
const functionOrder={auth:0,session_security:1,private:2,public:3};
catalog.functions.sort((a,b)=>(functionOrder[a.schema]??4)-(functionOrder[b.schema]??4));
const settings={host:'127.0.0.1',port:55473,user:'postgres'},database='execution03_schema_'+randomUUID().replaceAll('-',''),restored=database+'_restore';
const out='artifacts/execution03';fs.mkdirSync(out,{recursive:true});
const report={engine:'REAL_POSTGRESQL',classification:'SCHEMA_ONLY_RECONSTRUCTION_NOT_CUSTOMER_RESTORE',sourceSha256:createHash('sha256').update(fs.readFileSync(source)).digest('hex'),database,restored,migrations:[],status:'RUNNING',hostedWrites:0};
const admin=new pg.Client({...settings,database:'postgres'});await admin.connect();
let db;
try{
 const missing=['auth','storage'].filter(schema=>!catalog.tables.some(t=>t.schema===schema));
 if(missing.length)throw Error('CATALOG_MANAGED_DEPENDENCIES_MISSING:'+missing.join(','));
 await admin.query('create database '+database);db=new pg.Client({...settings,database});await db.connect();
 const roleNames=new Set(['anon','authenticated','service_role','supabase_auth_admin','supabase_storage_admin','supabase_admin','dashboard_user']);
 for(const row of [...catalog.tables,...catalog.functions,...catalog.schemas]){if(row.owner)roleNames.add(row.owner);for(const match of String(row.acl??'').matchAll(/(?:\{|,)([^=,]*)=/g))if(match[1])roleNames.add(match[1]);}
 for(const role of roleNames){if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(role))throw Error('ROLE_NAME_INVALID');if(!(await admin.query('select 1 from pg_roles where rolname=$1',[role])).rowCount)await admin.query(`create role "${role}"`);}
 await db.query(applicationCatalogSql(catalog));
 report.schemaReconstructed={tables:catalog.tables.filter(t=>['r','p'].includes(t.kind)).length,functions:catalog.functions.length,policies:catalog.policies.length};
 await db.query('create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations(version text primary key,name text,statements text[])');
 const prior=catalog.ledger.map(r=>r.version);
 for(const entry of catalog.ledger)await db.query('insert into supabase_migrations.schema_migrations(version,name) values($1,$2) on conflict do nothing',[entry.version,entry.name]);
 for(const name of fs.readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')&&!prior.includes(n.split('_')[0])).sort()){
  const text=fs.readFileSync('supabase/migrations/'+name,'utf8'),item={name,sha256:createHash('sha256').update(text).digest('hex'),status:'RUNNING'};report.migrations.push(item);
  try{await db.query(compileMigration(text,name,prior));item.status='PASS';prior.push(name.split('_')[0]);}catch(error){await db.query('rollback');item.status='FAIL';item.error={code:error.code,message:error.message};throw error;}
 }
 const summarize=async client=>(await client.query("select jsonb_build_object('tables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private','swarm_private') and c.relkind='r'),'policies',(select count(*) from pg_policies where schemaname in ('public','private','swarm_private')),'rlsTables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private','swarm_private') and c.relkind='r' and c.relrowsecurity),'swarmRpcs',(select count(*) from pg_proc where proname in ('load_swarm_state_v1','cas_swarm_state_v1')),'dispatchRpcs',(select count(*) from pg_proc where proname in ('issue_native_enforcement_approval_v2','claim_native_enforcement_dispatch_v2'))) as value")).rows[0].value;
 report.beforeRestore=await summarize(db);
 const privilege=(await db.query("select has_function_privilege('anon','public.load_swarm_state_v1(uuid)','execute') as anon_load,has_function_privilege('authenticated','public.cas_swarm_state_v1(uuid,bigint,jsonb)','execute') as user_cas,has_function_privilege('service_role','public.cas_swarm_state_v1(uuid,bigint,jsonb)','execute') as service_cas,has_schema_privilege('authenticated','swarm_private','usage') as user_private")).rows[0];
 if(privilege.anon_load||privilege.user_cas||!privilege.service_cas||privilege.user_private)throw Error('SWARM_PRIVILEGE_BOUNDARY_FAILED');report.privileges=privilege;
 const syntheticTenant='e0000000-0000-4000-8000-000000000003';
 const persistence=swarmRpcPersistence(async(name,args)=>{try{const load=name==='load_swarm_state_v1',q=load?'select public.load_swarm_state_v1($1) as data':'select public.cas_swarm_state_v1($1,$2,$3::jsonb) as data';return{data:(await db.query(q,load?[args.p_tenant_id]:[args.p_tenant_id,args.p_version,JSON.stringify(args.p_state)])).rows[0].data,error:null};}catch(error){return{data:null,error};}});
 await db.query('set role service_role');const store=createSwarmStore(persistence);await store.transact(syntheticTenant,state=>appendSwarmEvent(state,1700000000000,'SOC_ALERT','execution03:operator','execution03:synthetic-agent',{synthetic:true,authorityConferred:false}));const originalState=await persistence.load(syntheticTenant);await db.query('reset role');
 await db.query('begin');let appendOnlyDenied=false;try{await db.query('delete from swarm_private.events where tenant_id=$1',[syntheticTenant]);}catch(error){appendOnlyDenied=error.message.includes('APPEND_ONLY');}await db.query('rollback');if(!appendOnlyDenied)throw Error('APPEND_ONLY_ENFORCEMENT_FAILED');report.appendOnlyDeleteDenied=true;
 const fingerprint=async(client,label)=>{await client.query('set search_path=public,extensions');const value=(await client.query(fs.readFileSync('tools/release/effective-application-schema.sql','utf8'))).rows[0].catalog;fs.writeFileSync('tmp/pg-execution03/'+label+'-catalog.private.json',JSON.stringify(value));return createHash('sha256').update(JSON.stringify(value)).digest('hex');};report.beforeRestoreFingerprint=await fingerprint(db,'before');
 // Local synthetic state only; no rows copied from the hosted catalogue.
 const bin=path.resolve('tmp/pg-execution03/pgsql/bin'),dump=path.resolve('tmp/pg-execution03/execution03-schema.dump');
 function run(exe,args){const result=spawnSync(path.join(bin,exe+'.exe'),args,{env:{...process.env,PGHOST:'127.0.0.1',PGPORT:'55473',PGUSER:'postgres'},encoding:'utf8',windowsHide:true});if(result.status!==0)throw Error(exe+':'+(result.stderr??'').slice(0,1200));}
 run('pg_dump',['--format=custom','--no-owner','--file',dump,database]);await admin.query('create database '+restored);run('pg_restore',['--exit-on-error','--no-owner','--dbname',restored,dump]);
 const restoredDb=new pg.Client({...settings,database:restored});await restoredDb.connect();report.afterRestore=await summarize(restoredDb);report.afterRestoreFingerprint=await fingerprint(restoredDb,'after');const restoredState=(await restoredDb.query('select public.load_swarm_state_v1($1) as state',[syntheticTenant])).rows[0].state;report.restoredSyntheticReplayVerified=verifySwarmReplay(restoredState.state.events,syntheticTenant);if(JSON.stringify(restoredState)!==JSON.stringify(originalState)||!report.restoredSyntheticReplayVerified)throw Error('RESTORED_SYNTHETIC_EVIDENCE_DIFFERS');await restoredDb.end();
 if(JSON.stringify(report.beforeRestore)!==JSON.stringify(report.afterRestore))throw Error('RESTORE_CATALOG_COUNTS_DIFFER');
 if(report.beforeRestoreFingerprint!==report.afterRestoreFingerprint)throw Error('RESTORE_SCHEMA_FINGERPRINT_DIFFERS');
 const wrong=new pg.Client({...settings,database:restored,password:'execution03-deliberately-incorrect'});let rejected=false;try{await wrong.connect();}catch(error){rejected=error.code==='28P01';}finally{await wrong.end().catch(()=>{});}if(!rejected)throw Error('SCRAM_NEGATIVE_AUTH_FAILED');
 report.authenticatedRestore=true;report.wrongPasswordRejected=true;report.archiveSha256=createHash('sha256').update(fs.readFileSync(dump)).digest('hex');report.status='PASS';
}catch(error){report.status='BLOCKED';report.error={code:error.code??null,message:error.message};process.exitCode=1;}
finally{await db?.end();for(const name of [restored,database])await admin.query('drop database if exists '+name+' with (force)');await admin.end();fs.writeFileSync(out+'/database-rehearsal.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,schemaReconstructed:report.schemaReconstructed,migrations:report.migrations.length,error:report.error}));}
