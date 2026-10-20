import {readFile} from 'node:fs/promises';
/** Actual existing table definitions, with only unrelated parent tables reduced to FK keys. */
export async function installSwarmPrerequisites(db){
  await db.exec('create table public.trust_workspaces(id uuid primary key); create table public.operational_entities(enterprise_id uuid,entity_id text,primary key(enterprise_id,entity_id));');
  for(const [file,table] of [
    ['202607210001_enterprise_trust_architecture.sql','trust_memory_index'],
    ['202608080003_native_operational_entity_verification.sql','operational_entity_native_replay_events'],
  ]){
    const sql=await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8');
    const start=sql.indexOf('create table public.'+table+' (');
    const end=sql.indexOf('\n);',start);
    if(start<0||end<0)throw Error('Canonical schema fixture missing');
    await db.exec(sql.slice(start,end+3));
  }
}
