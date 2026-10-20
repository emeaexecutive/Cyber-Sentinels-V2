import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {swarmRpcPersistence} from '../../lib/swarm/rpc-persistence.ts';
import {installSwarmPrerequisites} from './swarm-schema.mjs';
export async function swarmSql(t){
  const db=new PGlite();t.after(()=>db.close());
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await installSwarmPrerequisites(db);
  await db.exec(await readFile(new URL('../../supabase/migrations/20261020091324_tenente_swarm_authority_control.sql',import.meta.url),'utf8'));
  await db.exec('set role service_role');
  const rpc=async(name,args)=>{
    try{
      const load=name==='load_swarm_state_v1';
      const values=load?[args.p_tenant_id]:[args.p_tenant_id,args.p_version,JSON.stringify(args.p_state)];
      const query=load?'select public.load_swarm_state_v1($1) as data':'select public.cas_swarm_state_v1($1,$2,$3::jsonb) as data';
      return {data:(await db.query(query,values)).rows[0].data,error:null};
    }catch(error){return {data:null,error};}
  };
  return {persistence:swarmRpcPersistence(rpc),async inspect(){
    await db.exec('reset role');
    const states=(await db.query('select tenant_id,version,document from swarm_private.state')).rows;
    const records=(await db.query('select count(*)::int as count from swarm_private.events')).rows[0].count;
    await db.exec('set role service_role');
    return {states,records};
  }};
}
