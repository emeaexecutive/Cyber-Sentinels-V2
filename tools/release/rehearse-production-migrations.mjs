// Local-only rehearsal. Never opens a database URL or loads environment files.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {compileMigration} from './migration-execution.mjs';

const [directory,target,database] = process.argv.slice(2);
if (!directory || !/^cs-recovery-[a-z0-9-]+$/.test(target ?? '') || !/^migration_rehearsal_[a-z0-9]+$/.test(database ?? '')) throw Error('Usage: node tools/release/rehearse-production-migrations.mjs <archive-directory> <cs-recovery-container> <migration_rehearsal_suffix>');
const dir = fs.realpathSync(directory);
const expected = '081310d3c1f64aaacf3c2207efa62bfa7641c81a670d5e23de6d11ae64784307';
const hash = value => createHash('sha256').update(value).digest('hex');
if (hash(fs.readFileSync(path.join(dir,'production.dump'))) !== expected) throw Error('Verified 12 October archive required');
const out = path.join(dir,database);
fs.mkdirSync(out); // Refuse to overwrite an earlier attempt.
const report = {archiveSha256:expected,target,database,startedAt:new Date().toISOString(),productionConnections:0,status:'RUNNING',migrations:[]};
const quote = s => '"'+s.replaceAll('"','""')+'"';
const literal = s => "'"+s.replaceAll("'","''")+"'";
function run(args,tag) {
  const r = spawnSync('docker',args,{encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true});
  if(tag){fs.writeFileSync(path.join(out,tag+'.stdout.private.log'),r.stdout??'');fs.writeFileSync(path.join(out,tag+'.stderr.private.log'),r.stderr??'');}
  if(r.status!==0) throw Error('Isolated command failed: '+(tag??args[0]));
  return r.stdout.trim();
}
function sql(source,tag,db=database) {
  fs.writeFileSync(path.join(out,tag+'.sql'),source);
  const file='/recovery/'+database+'/'+tag+'.sql';
  return run(['exec',target,'psql','-X','-qAt','-U','supabase_admin','-d',db,'-v','ON_ERROR_STOP=1','-f',file],tag);
}
function snapshot(tables,tag) {
  const statements=tables.map(t=>{
    const relation=quote(t.schema)+'.'+quote(t.name);
    const columns=t.columns.map(quote).join(',');
    return `SELECT json_build_object('schema',${literal(t.schema)},'name',${literal(t.name)},'rows',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(row_text,chr(10) ORDER BY row_text COLLATE "C"),''),'UTF8')),'hex')) FROM (SELECT to_jsonb(s)::text row_text FROM (SELECT ${columns} FROM ONLY ${relation}) s) records;`;
  });
  const result=sql('BEGIN READ ONLY;\n'+statements.join('\n')+'\nROLLBACK;',tag).split(/\r?\n/).filter(Boolean).map(JSON.parse);
  fs.writeFileSync(path.join(out,tag+'.private.json'),JSON.stringify(result,null,2));
  return result;
}
try {
  const inspect=JSON.parse(run(['inspect',target]))[0];
  if(inspect.HostConfig.NetworkMode!=='none'||Object.keys(inspect.HostConfig.PortBindings??{}).length||inspect.Config.Labels?.['cybersentinels.workstream']!=='isolated-production-restore') throw Error('Isolated restore container required');
  if(!inspect.Mounts.some(m=>m.Destination==='/recovery'&&!m.RW&&path.resolve(m.Source).toLowerCase()===dir.toLowerCase())) throw Error('Read-only archive mount required');
  if(!inspect.State.Running) run(['start',target],'start');
  let ready=false;
  for(let attempt=0;attempt<30;attempt++) {
    const probe=spawnSync('docker',['exec',target,'pg_isready','-U','supabase_admin','-d','postgres'],{windowsHide:true,stdio:'ignore'});
    if(probe.status===0){ready=true;break;}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  if(!ready) throw Error('Local PostgreSQL did not become ready');
  run(['exec',target,'createdb','-U','supabase_admin','--template=recovery_validation','--owner=postgres',database],'clone');
  const ledger=JSON.parse(sql("SELECT coalesce(json_agg(version ORDER BY version),'[]') FROM supabase_migrations.schema_migrations;",'baseline-ledger'));
  report.baselineMigrationCount=ledger.length;
  const tables=JSON.parse(sql("SELECT json_agg(json_build_object('schema',n.nspname,'name',c.relname,'columns',(SELECT json_agg(a.attname ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped)) ORDER BY n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname !~ '^pg_' AND n.nspname<>'information_schema';",'baseline-tables'));
  const before=snapshot(tables,'data-before');
  for(const name of fs.readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')&&!ledger.includes(n.split('_')[0])).sort()) {
    const source=fs.readFileSync(path.join('supabase/migrations',name),'utf8');
    const version=name.split('_')[0],execution=compileMigration(source,name,ledger);
    const item={name,sha256:hash(source),executionSha256:hash(execution),transaction:'DDL_AND_LEDGER_ATOMIC',status:'RUNNING'};report.migrations.push(item);
    try{sql(execution,'migration-'+version);item.status='PASS';ledger.push(version);}catch(error){item.status='FAIL';throw error;}
  }
  const after=snapshot(tables,'data-after');
  report.dataIntegrity={tables:tables.length,originalRows:before.reduce((n,t)=>n+t.rows,0),differences:before.flatMap((t,i)=>t.rows===after[i].rows&&t.sha256===after[i].sha256?[]:[{schema:t.schema,name:t.name,beforeRows:t.rows,afterRows:after[i].rows,contentChanged:t.sha256!==after[i].sha256}]),comparison:'All pre-existing columns and physical rows; new columns excluded; migration ledger growth expected'};
  for(const difference of report.dataIntegrity.differences) {
    const t=tables.find(t=>t.schema===difference.schema&&t.name===difference.name);
    const query=`SELECT encode(sha256(convert_to(to_jsonb(s)::text,'UTF8')),'hex') FROM (SELECT ${t.columns.map(quote).join(',')} FROM ONLY ${quote(t.schema)}.${quote(t.name)}) s;`;
    const oldRows=sql(query,'original-'+t.schema+'-'+t.name,'recovery_validation').split(/\r?\n/).filter(Boolean);
    const newRows=sql(query,'migrated-'+t.schema+'-'+t.name).split(/\r?\n/).filter(Boolean);
    const remaining=new Map();for(const digest of newRows)remaining.set(digest,(remaining.get(digest)??0)+1);
    difference.originalRowsPreserved=oldRows.every(digest=>{const count=remaining.get(digest)??0;if(!count)return false;remaining.set(digest,count-1);return true;});
    difference.addedRows=newRows.length-oldRows.length;
  }
  report.dataIntegrity.allOriginalRowsPreserved=report.dataIntegrity.differences.every(d=>d.originalRowsPreserved);
  if(!report.dataIntegrity.allOriginalRowsPreserved) throw Error('An existing Production row was removed or modified; inspect private evidence');
  report.approvalBackfill=JSON.parse(sql("SELECT json_build_object('users',(SELECT count(*) FROM auth.users),'approvals',(SELECT count(*) FROM public.account_access_approvals),'pending',(SELECT count(*) FROM public.account_access_approvals WHERE status='PENDING'),'requestedEvents',(SELECT count(*) FROM public.account_access_approval_events WHERE event_type='ACCESS_REQUESTED'),'approved',(SELECT count(*) FROM public.account_access_approvals WHERE status='APPROVED'));",'approval-backfill'));
  report.status='DDL_PASS';
} catch(error) {report.status='FAIL';report.error=error.message;process.exitCode=1;}
finally {report.finishedAt=new Date().toISOString();report.archiveUnchanged=hash(fs.readFileSync(path.join(dir,'production.dump')))===expected;fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
